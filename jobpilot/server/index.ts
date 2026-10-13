import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './db.ts';
import { fetchGreenhouseJobs } from './connectors/greenhouse.ts';
import { fetchLeverJobs } from './connectors/lever.ts';
import { analyzeFit, tailorResume, computeHash, GEMINI_MODEL } from './services/gemini.ts';
import { submissionAdapter } from './services/submissionAdapter.ts';
import { JobListing, ApplicationRecord, CompanyBoardConfig } from '../shared/types.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------------------------------------
// 1. PROFILE & RESUME API
// ----------------------------------------------------

app.get('/api/profile', (req, res) => {
  res.json(db.getProfile());
});

app.put('/api/profile', (req, res) => {
  try {
    const updated = db.updateProfile(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/profile/reset', (req, res) => {
  const reset = db.resetProfile();
  res.json(reset);
});

// Parse resume text / extraction endpoint
app.post('/api/profile/parse-resume', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    // Heuristic extraction of facts for confirmation
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const profile = db.getProfile();

    // Extract potential skills
    const knownSkillsList = [
      "C#", ".NET", ".NET 8", "ASP.NET", "ASP.NET Web API", "SQL", "SQL Server", 
      "PostgreSQL", "Angular", "TypeScript", "JavaScript", "HTML", "CSS", "REST APIs", 
      "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "xUnit", "Kafka"
    ];

    const extractedSkills = knownSkillsList.filter(s => 
      text.toLowerCase().includes(s.toLowerCase())
    );

    // Merge without replacing immutable original
    const updated = db.updateProfile({
      originalResumeText: text,
      originalResumeUploadDate: new Date().toISOString(),
      verifiedSkills: Array.from(new Set([...profile.verifiedSkills, ...extractedSkills]))
    });

    res.json({
      message: "Resume parsed successfully. Please confirm extracted items.",
      profile: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PDF upload fallback endpoint
app.post('/api/profile/upload-pdf', async (req, res) => {
  try {
    const { base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Base64 PDF data required' });
    }

    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = Buffer.from(base64Data, 'base64');
      const data = await pdfParse(buffer);
      
      if (!data.text || data.text.trim().length === 0) {
        return res.status(422).json({ 
          error: "No selectable text found in PDF (scanned or image-based). Please use the paste-text fallback.",
          fallbackRequired: true 
        });
      }

      res.json({ text: data.text });
    } catch (parseErr: any) {
      return res.status(422).json({
        error: `PDF parsing failed: ${parseErr.message}. Please use the paste-text fallback.`,
        fallbackRequired: true
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. JOB DISCOVERY & COMPANY BOARDS API
// ----------------------------------------------------

app.get('/api/jobs', (req, res) => {
  res.json(db.getJobs());
});

app.post('/api/jobs/manual', (req, res) => {
  try {
    const { company, title, location, jobDescription, originalApplicationUrl, experienceRequirements, salary, remoteEligibility } = req.body;
    if (!company || !title || !jobDescription || !originalApplicationUrl) {
      return res.status(400).json({ error: 'Company, title, job description, and application URL are required.' });
    }

    const newJob: JobListing = {
      id: `manual-${Date.now()}`,
      source: 'manual',
      company: company.trim(),
      title: title.trim(),
      location: location ? location.trim() : 'Unspecified',
      remoteEligibility: remoteEligibility || 'Unspecified',
      experienceRequirements: experienceRequirements || undefined,
      salary: salary ? salary.trim() : 'Not disclosed', // Never estimate
      jobDescription: jobDescription.trim(),
      originalApplicationUrl: originalApplicationUrl.trim(),
      retrievedAt: new Date().toISOString(),
      isDemo: false
    };

    const added = db.addJob(newJob);
    res.status(201).json(added);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  const success = db.deleteJob(req.params.id);
  if (success) {
    res.json({ message: "Job deleted" });
  } else {
    res.status(404).json({ error: "Job not found" });
  }
});

// Company Board Connectors
app.get('/api/boards', (req, res) => {
  res.json(db.getBoardConfigs());
});

app.post('/api/boards', (req, res) => {
  try {
    const { sourceType, companyName, boardTokenOrSlug, boardUrl } = req.body;
    if (!sourceType || !companyName || !boardTokenOrSlug) {
      return res.status(400).json({ error: "Source type, company name, and board token/slug are required." });
    }

    const config: CompanyBoardConfig = {
      id: `board-${Date.now()}`,
      sourceType,
      companyName: companyName.trim(),
      boardTokenOrSlug: boardTokenOrSlug.trim(),
      boardUrl: boardUrl || (sourceType === 'greenhouse' ? `https://boards.greenhouse.io/${boardTokenOrSlug}` : `https://jobs.lever.co/${boardTokenOrSlug}`),
      verified: true,
      active: true
    };

    const saved = db.saveBoardConfig(config);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/boards/:id', (req, res) => {
  const success = db.deleteBoardConfig(req.params.id);
  res.json({ success });
});

// Sync jobs from configured boards
app.post('/api/boards/sync', async (req, res) => {
  const boards = db.getBoardConfigs().filter(b => b.active);
  const results: { boardId: string; company: string; success: boolean; added: number; error?: string }[] = [];

  for (const board of boards) {
    try {
      let fetched: JobListing[] = [];
      if (board.sourceType === 'greenhouse') {
        fetched = await fetchGreenhouseJobs(board.boardTokenOrSlug, board.companyName);
      } else if (board.sourceType === 'lever') {
        fetched = await fetchLeverJobs(board.boardTokenOrSlug, board.companyName);
      }

      const { added } = db.addJobs(fetched);
      board.lastSyncAt = new Date().toISOString();
      board.lastError = undefined;
      db.saveBoardConfig(board);

      results.push({
        boardId: board.id,
        company: board.companyName,
        success: true,
        added
      });
    } catch (err: any) {
      board.lastError = err.message;
      db.saveBoardConfig(board);
      results.push({
        boardId: board.id,
        company: board.companyName,
        success: false,
        added: 0,
        error: err.message
      });
    }
  }

  res.json({
    summary: results,
    totalJobs: db.getJobs().length
  });
});

// ----------------------------------------------------
// 3. EXPLAINABLE JOB FIT API
// ----------------------------------------------------

app.post('/api/fit/analyze', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const job = db.getJobs().find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const profile = db.getProfile();
    const jdHash = computeHash(job.jobDescription);

    // Cache check
    const cached = db.getAnalysis(job.id, profile.version, jdHash);
    if (cached) {
      return res.json({ analysis: cached, cached: true });
    }

    // Compute fresh on-demand analysis
    const analysis = await analyzeFit(profile, job);
    db.saveAnalysis(analysis);
    res.json({ analysis, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. TRUTHFUL RESUME TAILORING API
// ----------------------------------------------------

app.post('/api/tailor', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const job = db.getJobs().find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const profile = db.getProfile();
    const tailored = await tailorResume(profile, job);
    db.saveTailoredResume(tailored);

    res.json(tailored);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tailor/:jobId', (req, res) => {
  const tailored = db.getTailoredResumeForJob(req.params.jobId);
  if (tailored) {
    res.json(tailored);
  } else {
    res.status(404).json({ error: "No tailored resume found for this job" });
  }
});

app.put('/api/tailor/:id/approve', (req, res) => {
  const tailored = db.getTailoredResume(req.params.id);
  if (!tailored) {
    return res.status(404).json({ error: "Tailored resume not found" });
  }

  const { approved, tailoredSummary, finalMarkdown, bulletDiffs } = req.body;
  if (approved !== undefined) tailored.approvedByCandidate = approved;
  if (tailoredSummary !== undefined) tailored.tailoredSummary = tailoredSummary;
  if (finalMarkdown !== undefined) tailored.finalMarkdown = finalMarkdown;
  if (bulletDiffs !== undefined) tailored.bulletDiffs = bulletDiffs;
  tailored.updatedAt = new Date().toISOString();

  db.saveTailoredResume(tailored);
  res.json(tailored);
});

// ----------------------------------------------------
// 5. APPLICATION TRACKER & ASSISTANT API
// ----------------------------------------------------

app.get('/api/applications', (req, res) => {
  res.json(db.getApplications());
});

app.post('/api/applications/prepare', (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const job = db.getJobs().find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const profile = db.getProfile();
    const existing = db.getApplicationForJob(jobId);
    if (existing) {
      return res.json(existing);
    }

    const tailored = db.getTailoredResumeForJob(jobId);

    // Build suggested answers truthfully from confirmed profile
    // DO NOT guess work auth, sponsorship, salary, or notice period unless confirmed
    const suggestedAnswers = [
      {
        question: "Full Name",
        answer: profile.name,
        isConfirmed: true,
        needsCandidateInput: false
      },
      {
        question: "Primary Work Location Preference",
        answer: profile.preferences.preferredLocations.join(', '),
        isConfirmed: true,
        needsCandidateInput: false
      },
      {
        question: "Work Authorization / Visa Status",
        answer: profile.preferences.workAuthorization,
        isConfirmed: true,
        needsCandidateInput: false
      },
      {
        question: "Total Relevant Experience",
        answer: `${profile.yearsOfExperience} years in Backend & Full-Stack Development`,
        isConfirmed: true,
        needsCandidateInput: false
      },
      {
        question: "Primary Tech Stack",
        answer: profile.verifiedSkills.join(', '),
        isConfirmed: true,
        needsCandidateInput: false
      },
      {
        question: "Current Notice Period",
        answer: profile.preferences.noticePeriod || "",
        isConfirmed: !!profile.preferences.noticePeriod,
        needsCandidateInput: !profile.preferences.noticePeriod
      },
      {
        question: "Expected Compensation",
        answer: profile.preferences.preferredCompensation,
        isConfirmed: true,
        needsCandidateInput: false
      },
      {
        question: "Demographic Declarations / Equal Opportunity",
        answer: "", // NEVER guess!
        isConfirmed: false,
        needsCandidateInput: true
      }
    ];

    const appRecord: ApplicationRecord = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      status: 'Preparing',
      userReportedStatus: false,
      tailoredResumeId: tailored?.id,
      appliedUrl: job.originalApplicationUrl,
      notes: `Application initialized. Ready for review.`,
      suggestedAnswers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.saveApplication(appRecord);
    res.status(201).json(appRecord);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/applications/:id', (req, res) => {
  const existing = db.getApplication(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Application not found" });
  }

  const updated: ApplicationRecord = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  db.saveApplication(updated);
  res.json(updated);
});

// Automation boundary evaluation
app.post('/api/applications/:id/evaluate-submission', async (req, res) => {
  const appRecord = db.getApplication(req.params.id);
  if (!appRecord) return res.status(404).json({ error: "Application record not found" });
  const job = db.getJobs().find(j => j.id === appRecord.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const capability = await submissionAdapter.evaluateSubmissionCapability(job);
  res.json(capability);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'JobPilot — My AI Job Switch Copilot',
    model: GEMINI_MODEL,
    hasApiKey: !!process.env.GEMINI_API_KEY,
    jobsCount: db.getJobs().length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`JobPilot server listening on port ${PORT}`);
});
