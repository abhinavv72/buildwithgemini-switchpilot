import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  UserCheck, 
  Compass, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Printer, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Layers, 
  MapPin, 
  Clock, 
  DollarSign, 
  Search, 
  ShieldCheck, 
  Info,
  Check,
  ChevronRight,
  Send
} from 'lucide-react';
import { 
  Profile, 
  JobListing, 
  FitAnalysis, 
  TailoredResume, 
  ApplicationRecord, 
  CompanyBoardConfig,
  ApplicationStatus
} from '../shared/types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'discovery' | 'fit' | 'tailor' | 'tracker'>('discovery');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [boards, setBoards] = useState<CompanyBoardConfig[]>([]);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterRemote, setFilterRemote] = useState<string>('all');

  // Loading States
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingTailor, setLoadingTailor] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Manual Job Import Form State
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [manualCompany, setManualCompany] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualLocation, setManualLocation] = useState('Bengaluru, India');
  const [manualUrl, setManualUrl] = useState('');
  const [manualSalary, setManualSalary] = useState('');
  const [manualRemote, setManualRemote] = useState<'Remote' | 'Hybrid' | 'On-site' | 'Unspecified'>('Hybrid');
  const [manualJD, setManualJD] = useState('');

  // Add Board Modal State
  const [showAddBoardModal, setShowAddBoardModal] = useState(false);
  const [newBoardType, setNewBoardType] = useState<'greenhouse' | 'lever'>('greenhouse');
  const [newBoardCompany, setNewBoardCompany] = useState('');
  const [newBoardToken, setNewBoardToken] = useState('');

  // Resume Paste / Upload State
  const [resumePasteText, setResumePasteText] = useState('');
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchJobs();
    fetchBoards();
    fetchApplications();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setResumePasteText(data.originalResumeText || '');
      }
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data: JobListing[] = await res.json();
        setJobs(data);
        if (data.length > 0 && !selectedJob) {
          setSelectedJob(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch jobs", e);
    }
  };

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
      }
    } catch (e) {
      console.error("Failed to fetch boards", e);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (e) {
      console.error("Failed to fetch applications", e);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sync Boards
  const handleSyncBoards = async () => {
    setLoadingSync(true);
    setSyncStatusMsg("Connecting to public Greenhouse & Lever endpoints...");
    try {
      const res = await fetch('/api/boards/sync', { method: 'POST' });
      const data = await res.json();
      setSyncStatusMsg(`Sync completed! Added new verified jobs from boards.`);
      await fetchJobs();
      await fetchBoards();
    } catch (e: any) {
      setSyncStatusMsg(`Sync failed: ${e.message}`);
    } finally {
      setLoadingSync(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Run Fit Analysis on Selected Job
  const handleAnalyzeJob = async (job: JobListing) => {
    setSelectedJob(job);
    setLoadingAnalysis(true);
    setActiveTab('fit');
    try {
      const res = await fetch('/api/fit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error("Error analyzing job fit", e);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Tailor Resume for Selected Job
  const handleTailorForJob = async (job: JobListing) => {
    setSelectedJob(job);
    setLoadingTailor(true);
    setActiveTab('tailor');
    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });
      const data = await res.json();
      setTailoredResume(data);
    } catch (e) {
      console.error("Error generating tailored resume", e);
    } finally {
      setLoadingTailor(false);
    }
  };

  // Prepare Application
  const handlePrepareApplication = async (job: JobListing) => {
    setSelectedJob(job);
    try {
      const res = await fetch('/api/applications/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });
      const app = await res.json();
      await fetchApplications();
      setActiveTab('tracker');
    } catch (e) {
      console.error("Error preparing application", e);
    }
  };

  // Add Manual Job
  const handleAddManualJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/jobs/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: manualCompany,
          title: manualTitle,
          location: manualLocation,
          originalApplicationUrl: manualUrl,
          salary: manualSalary || "Not disclosed",
          remoteEligibility: manualRemote,
          jobDescription: manualJD
        })
      });
      if (res.ok) {
        setShowAddJobModal(false);
        setManualCompany('');
        setManualTitle('');
        setManualUrl('');
        setManualJD('');
        setManualSalary('');
        await fetchJobs();
      }
    } catch (e) {
      console.error("Error adding manual job", e);
    }
  };

  // Add Board
  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: newBoardType,
          companyName: newBoardCompany,
          boardTokenOrSlug: newBoardToken
        })
      });
      if (res.ok) {
        setShowAddBoardModal(false);
        setNewBoardCompany('');
        setNewBoardToken('');
        await fetchBoards();
      }
    } catch (e) {
      console.error("Error adding company board", e);
    }
  };

  // Parse Resume Text
  const handleParseResume = async () => {
    try {
      const res = await fetch('/api/profile/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: resumePasteText })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        alert("Resume updated! Please review and confirm extracted facts below.");
      }
    } catch (e) {
      console.error("Error parsing resume", e);
    }
  };

  // PDF Upload Handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/profile/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: base64 })
        });
        const data = await res.json();
        if (res.ok && data.text) {
          setResumePasteText(data.text);
          alert("PDF text extracted! Click 'Save & Extract Facts' to confirm.");
        } else {
          setPdfUploadError(data.error || "Failed to extract text. Please paste resume text below.");
        }
      } catch (err: any) {
        setPdfUploadError("PDF upload error. Please paste text directly into the box.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Filter Jobs
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = searchTerm === '' || 
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.jobDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = filterSource === 'all' || j.source === filterSource;
    const matchesRemote = filterRemote === 'all' || j.remoteEligibility === filterRemote;
    const matchesLoc = filterLocation === 'all' || 
      (filterLocation === 'india' && (j.location.toLowerCase().includes('india') || j.location.toLowerCase().includes('bengaluru') || j.location.toLowerCase().includes('hyderabad'))) ||
      (filterLocation === 'other' && !(j.location.toLowerCase().includes('india') || j.location.toLowerCase().includes('bengaluru') || j.location.toLowerCase().includes('hyderabad')));

    return matchesSearch && matchesSource && matchesRemote && matchesLoc;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">JobPilot</span>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  AI Job Switch Copilot
                </span>
              </div>
              <p className="text-xs text-slate-500">Local-first, truthful matching & tailoring for Abhinav Srivastava</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('discovery')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'discovery' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Job Feed ({jobs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('fit')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'fit' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Explainable Fit</span>
              </button>
              <button
                onClick={() => setActiveTab('tailor')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'tailor' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Resume Tailor</span>
              </button>
              <button
                onClick={() => setActiveTab('tracker')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'tracker' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Tracker ({applications.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'profile' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Profile & Resume</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* ========================================================= */}
        {/* TAB 1: JOB DISCOVERY                                      */}
        {/* ========================================================= */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 flex items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by role, company (.NET, C#, Angular, Backend)..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">All Sources</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="manual">Manual</option>
                  <option value="demo">Demo</option>
                </select>
                <select
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">All Locations</option>
                  <option value="india">India (Bengaluru / Hyderabad)</option>
                  <option value="other">Outside India</option>
                </select>
                <select
                  value={filterRemote}
                  onChange={e => setFilterRemote(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">Any Work Model</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleSyncBoards}
                  disabled={loadingSync}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSync ? 'animate-spin' : ''}`} />
                  <span>Sync Boards</span>
                </button>
                <button
                  onClick={() => setShowAddBoardModal(true)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Company Board</span>
                </button>
                <button
                  onClick={() => setShowAddJobModal(true)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Job Manually</span>
                </button>
              </div>
            </div>

            {/* Sync Notification Banner */}
            {syncStatusMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm flex items-center space-x-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {/* Configured Boards Summary */}
            <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">Connected Public Company Boards:</span>
                {boards.map(b => (
                  <span key={b.id} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {b.companyName} ({b.sourceType})
                    {b.lastError && <span className="text-red-500 ml-1">(! error)</span>}
                  </span>
                ))}
              </div>
              <span className="text-slate-500">Documented API Connectors · No Scraping</span>
            </div>

            {/* Job Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map(job => (
                <div 
                  key={job.id} 
                  className={`bg-white rounded-xl border p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                    selectedJob?.id === job.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-xs text-blue-600 uppercase tracking-wider">{job.company}</span>
                      <div className="flex items-center space-x-1">
                        {job.isDemo && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                            DEMO
                          </span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                          {job.source}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-1">{job.title}</h3>
                    
                    <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{job.location}</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{job.remoteEligibility}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        <span>Salary: <strong>{job.salary}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {job.postedAt ? `Posted: ${job.postedAt}` : `Retrieved: ${job.retrievedAt.substring(0, 10)}`}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-3 mb-4 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {job.jobDescription.substring(0, 220)}...
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleAnalyzeJob(job)}
                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Check Fit</span>
                    </button>
                    <button
                      onClick={() => handleTailorForJob(job)}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Tailor Resume</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: EXPLAINABLE JOB FIT                                */}
        {/* ========================================================= */}
        {activeTab === 'fit' && (
          <div className="space-y-6">
            {!selectedJob ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700">No Job Selected</h3>
                <p className="text-sm text-slate-500 mb-4">Select a job from the feed to review your explainable heuristic fit.</p>
                <button
                  onClick={() => setActiveTab('discovery')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Browse Job Feed
                </button>
              </div>
            ) : loadingAnalysis ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="font-semibold text-slate-800">Analyzing Job Fit...</h3>
                <p className="text-sm text-slate-500">Checking verified profile skills, location constraints, and experience against JD.</p>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Header card for selected job */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
                      <span className="font-bold text-blue-600 uppercase">{selectedJob.company}</span>
                      <span>•</span>
                      <span>{selectedJob.location} ({selectedJob.remoteEligibility})</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedJob.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Salary: <strong>{selectedJob.salary}</strong> · Source: {selectedJob.source}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fit Evaluation</div>
                      <div className="text-3xl font-extrabold text-blue-600">{analysis.heuristicScore}/100</div>
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium mt-0.5">
                        Heuristic fit score (not ATS)
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleTailorForJob(selectedJob)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Tailor Resume</span>
                      </button>
                      <button
                        onClick={() => handlePrepareApplication(selectedJob)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                        <span>Prepare Application</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown & Explanation */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5">
                  <h4 className="font-bold text-sm text-blue-900 mb-2 flex items-center space-x-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Score Breakdown & Heuristic Components</span>
                  </h4>
                  <p className="text-xs text-blue-800 mb-3">{analysis.scoreExplanation.details}</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block">Skills Match</span>
                      <strong className="text-sm text-slate-800">{analysis.scoreExplanation.skillsScore}/35</strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block">Experience Level</span>
                      <strong className="text-sm text-slate-800">{analysis.scoreExplanation.experienceScore}/25</strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block">Location & Visa</span>
                      <strong className="text-sm text-slate-800">{analysis.scoreExplanation.locationScore}/25</strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block">Role Alignment</span>
                      <strong className="text-sm text-slate-800">{analysis.scoreExplanation.roleScore}/15</strong>
                    </div>
                  </div>
                </div>

                {/* Constraints Highlight Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-xl border ${
                    analysis.constraints.locationMatch ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {analysis.constraints.locationMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800">Location Check</h5>
                    </div>
                    <p className="text-xs text-slate-700">{analysis.constraints.locationNote}</p>
                  </div>

                  <div className={`p-4 rounded-xl border ${
                    analysis.constraints.workAuthMatch ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {analysis.constraints.workAuthMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800">Work Authorization</h5>
                    </div>
                    <p className="text-xs text-slate-700">{analysis.constraints.workAuthNote}</p>
                  </div>

                  <div className={`p-4 rounded-xl border ${
                    analysis.constraints.experienceMatch ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {analysis.constraints.experienceMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800">Experience Tier</h5>
                    </div>
                    <p className="text-xs text-slate-700">{analysis.constraints.experienceNote}</p>
                  </div>
                </div>

                {/* Matched vs Missing Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Matched */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-sm text-emerald-700 mb-3 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified Matched Requirements ({analysis.matchedRequirements.length})</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.matchedRequirements.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-medium">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-sm text-amber-700 mb-3 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Missing from Profile ({analysis.missingRequirements.length})</span>
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {analysis.missingRequirements.length === 0 ? (
                        <span className="text-xs text-slate-500">No major missing requirements identified.</span>
                      ) : (
                        analysis.missingRequirements.map((s, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-xs font-medium">
                            ✗ {s}
                          </span>
                        ))
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      * Missing skills are never automatically hallucinated or fabricated on your tailored resume.
                    </p>
                  </div>
                </div>

                {/* Essential vs Nice-to-Have */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-2">Essential Requirements</h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                      {analysis.essentialRequirements.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-2">Nice-To-Have Skills</h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                      {analysis.niceToHaves.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TRUTHFUL RESUME TAILORING                          */}
        {/* ========================================================= */}
        {activeTab === 'tailor' && (
          <div className="space-y-6">
            {!selectedJob ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700">No Job Selected for Tailoring</h3>
                <p className="text-sm text-slate-500 mb-4">Choose a target job to craft a verified, tailored resume version.</p>
                <button
                  onClick={() => setActiveTab('discovery')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Browse Job Feed
                </button>
              </div>
            ) : loadingTailor ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="font-semibold text-slate-800">Generating Truthful Tailored Resume...</h3>
                <p className="text-sm text-slate-500">Checking verified profile evidence and compiling single-column ATS preview.</p>
              </div>
            ) : tailoredResume ? (
              <div className="space-y-6">
                {/* Tailoring Header Bar */}
                <div className="no-print bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-blue-600 font-bold uppercase">Tailored for: {tailoredResume.targetedCompany}</div>
                    <h2 className="text-xl font-bold text-slate-900">{tailoredResume.targetedJobTitle}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Status: {tailoredResume.approvedByCandidate ? (
                        <span className="text-emerald-700 font-bold">✓ Approved by Candidate</span>
                      ) : (
                        <span className="text-amber-700 font-bold">Pending Candidate Approval</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print to PDF</span>
                    </button>
                    {!tailoredResume.approvedByCandidate ? (
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/tailor/${tailoredResume.id}/approve`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ approved: true })
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setTailoredResume(updated);
                            alert("Tailored resume approved! You can now prepare your application.");
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Resume</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrepareApplication(selectedJob)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                        <span>Prepare Application</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Keyword Classification Audit */}
                <div className="no-print bg-white p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Keyword Truthfulness Audit</span>
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    JD keywords are strictly categorized against verified experience. Unverified skills are never fabricated.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="font-bold text-emerald-800 mb-2">Supported by Experience ({tailoredResume.keywords.filter(k => k.category === 'supported').length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tailoredResume.keywords.filter(k => k.category === 'supported').map((k, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800 font-medium">
                            {k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="font-bold text-amber-800 mb-2">Needs Confirmation ({tailoredResume.keywords.filter(k => k.category === 'needs_confirmation').length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tailoredResume.keywords.filter(k => k.category === 'needs_confirmation').map((k, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-800 font-medium">
                            {k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-700 mb-2">Missing Skill — Excluded ({tailoredResume.keywords.filter(k => k.category === 'missing').length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tailoredResume.keywords.filter(k => k.category === 'missing').map((k, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-600 font-medium">
                            {k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Original vs Proposed Bullet Diffs */}
                <div className="no-print bg-white p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Bullet Point Modifications & Supporting Proof</span>
                  </h4>
                  <div className="space-y-4">
                    {tailoredResume.bulletDiffs.map(diff => (
                      <div key={diff.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-blue-600">Proof: {diff.supportingFact}</span>
                          <span className="italic">{diff.changeReason}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 bg-red-50/70 border border-red-200 rounded text-red-900">
                            <span className="font-bold block text-[10px] text-red-700 uppercase mb-1">Original Wording:</span>
                            {diff.original}
                          </div>
                          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-900">
                            <span className="font-bold block text-[10px] text-emerald-700 uppercase mb-1">Tailored Proposal:</span>
                            {diff.proposed}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recruiter Outreach Note */}
                <div className="no-print bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Truthful Outreach / Referral Message</span>
                    </h4>
                    <button
                      onClick={() => handleCopy(tailoredResume.recruiterMessage, 'outreach')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'outreach' ? 'Copied!' : 'Copy Message'}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={6}
                    value={tailoredResume.recruiterMessage}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    * Strictly avoids inventing mutual acquaintances or prior relationships.
                  </p>
                </div>

                {/* Single-Column Clean Resume Paper Preview (Printable) */}
                <div className="bg-white p-8 sm:p-12 rounded-xl border border-slate-300 shadow-lg resume-paper max-w-4xl mx-auto font-sans leading-relaxed text-slate-900">
                  <div className="border-b border-slate-900 pb-4 mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">{profile?.name}</h1>
                    <p className="text-xs text-slate-600 mt-1">
                      Location: {profile?.preferences.preferredLocations.join(' / ')} | Email: abhinav.srivastava@example.com
                    </p>
                    <p className="text-xs text-slate-600">
                      Target Role: <strong>{tailoredResume.targetedJobTitle}</strong> ({tailoredResume.targetedCompany})
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Professional Summary
                    </h3>
                    <p className="text-xs text-slate-700 leading-normal">
                      {tailoredResume.tailoredSummary}
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Verified Technical Skills
                    </h3>
                    <p className="text-xs text-slate-700">
                      <strong>Core Languages & Frameworks:</strong> C#, .NET 8, ASP.NET Web API, SQL, Angular, TypeScript<br />
                      <strong>Database & Architecture:</strong> Relational Database Design, Query Optimization, RESTful APIs, Microservices<br />
                      <strong>Testing & Tooling:</strong> xUnit, Git, CI/CD Pipelines
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Work Experience
                    </h3>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-bold text-slate-900">
                        <span>Software Engineer - Backend & Full-Stack</span>
                        <span>2023 – Present</span>
                      </div>
                      <div className="text-xs text-slate-600 italic mb-2">Enterprise Technology Solutions | Bengaluru, India</div>
                      <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                        <li>Architected and deployed high-throughput ASP.NET Web API and .NET 8 microservices handling core business logic.</li>
                        <li>Optimized relational database schemas and SQL queries, reducing execution latency on core reporting endpoints by 35%.</li>
                        <li>Collaborated with frontend developers to deliver responsive Angular UI components connected to secure REST APIs.</li>
                        <li>Maintained high code quality and test coverage across payment microservices using xUnit test suites.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Key Technical Projects
                    </h3>
                    <div className="text-xs font-bold text-slate-900">
                      High-Performance Order Processing API <span className="font-normal text-slate-600">(.NET 8, C#, SQL Server)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 mt-1">
                      <li>Implemented transactional outbox pattern to guarantee consistency in SQL operations.</li>
                      <li>Created OpenAPI/Swagger specifications and comprehensive API documentation.</li>
                    </ul>
                  </div>

                  {/* Education */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Education
                    </h3>
                    <div className="flex justify-between text-xs text-slate-800">
                      <span><strong>B.Tech in Computer Science and Engineering</strong> — State Technological University</span>
                      <span>Graduated 2022</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: APPLICATION TRACKER & ASSISTANT                   */}
        {/* ========================================================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Application Assistant & Pipeline Tracker</h2>
                <p className="text-xs text-slate-500">
                  Track your prepared submissions, copy exact verified answers, and open official career portals.
                </p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700">No Active Applications Prepared Yet</h3>
                <p className="text-sm text-slate-500 mb-4">Select a job from the feed and click "Prepare Application".</p>
                <button
                  onClick={() => setActiveTab('discovery')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Browse Job Feed
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map(app => {
                  const job = jobs.find(j => j.id === app.jobId);
                  return (
                    <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs uppercase text-blue-600">{job?.company || 'Company'}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">{job?.location}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900">{job?.title || 'Job Opening'}</h3>
                        </div>

                        {/* Status selector & Actions */}
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs text-slate-500 font-medium">Status:</span>
                            <select
                              value={app.status}
                              onChange={async e => {
                                const newStatus = e.target.value as ApplicationStatus;
                                const isUserReported = newStatus === 'Applied';
                                await fetch(`/api/applications/${app.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    status: newStatus,
                                    userReportedStatus: isUserReported,
                                    applicationDate: newStatus === 'Applied' ? new Date().toISOString() : app.applicationDate
                                  })
                                });
                                await fetchApplications();
                              }}
                              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value="Saved">Saved</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Ready for Review">Ready for Review</option>
                              <option value="Application Opened">Application Opened</option>
                              <option value="Applied">Applied (User Reported)</option>
                              <option value="Interview">Interview</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Withdrawn">Withdrawn</option>
                            </select>
                          </div>

                          <a
                            href={app.appliedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={async () => {
                              // Opening application URL must NOT mark the job Applied!
                              await fetch(`/api/applications/${app.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'Application Opened' })
                              });
                              await fetchApplications();
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                          >
                            <span>Open Official Application</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Application Form Answers Assistant */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                            Confirmed Profile Answers (One-Click Copy)
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Strict Rule: Unknown answers left blank for candidate review
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {app.suggestedAnswers.map((ans, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                              <div className="flex-1 pr-2">
                                <span className="font-semibold text-slate-600 block text-[11px]">{ans.question}:</span>
                                {ans.needsCandidateInput && !ans.answer ? (
                                  <span className="text-amber-600 italic text-[11px]">Needs candidate confirmation</span>
                                ) : (
                                  <span className="text-slate-900 font-medium">{ans.answer}</span>
                                )}
                              </div>
                              {ans.answer && (
                                <button
                                  onClick={() => handleCopy(ans.answer, `${app.id}-${idx}`)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                                  title="Copy Answer"
                                >
                                  {copiedKey === `${app.id}-${idx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Automation Safety Boundary Card */}
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-start space-x-2 text-xs text-amber-900">
                        <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Automation Safety Boundary:</strong> Automated submission without human review is disabled to prevent security flags and CAPTCHA rejections. Use the answers above for 30-second assisted submission.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: PROFILE & VERIFIED RESUME                          */}
        {/* ========================================================= */}
        {activeTab === 'profile' && profile && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Backend / Full-Stack Engineer · ~{profile.yearsOfExperience} Years Verified Experience · Profile Version {profile.version}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `JobPilot_Profile_${profile.name.replace(/\s+/g, '_')}.json`;
                    a.click();
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Export Profile JSON
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Reset profile to default verified facts?")) {
                      await fetch('/api/profile/reset', { method: 'POST' });
                      await fetchProfile();
                    }
                  }}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Reset Profile
                </button>
              </div>
            </div>

            {/* Resume Upload and Paste Box */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Original Resume (Immutable Source of Truth)</h3>
                  <p className="text-xs text-slate-500">
                    Paste resume text or upload text-based PDF. Extracted items must be confirmed before tailoring.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                    <span>Upload Text PDF</span>
                    <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
                  </label>
                  <button
                    onClick={handleParseResume}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    Save & Extract Facts
                  </button>
                </div>
              </div>

              {pdfUploadError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{pdfUploadError}</span>
                </div>
              )}

              <textarea
                rows={10}
                value={resumePasteText}
                onChange={e => setResumePasteText(e.target.value)}
                placeholder="Paste original resume text here..."
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Verified Skills vs Learning Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-sm text-emerald-800 mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Skills ({profile.verifiedSkills.length})</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">Backed by actual production experience. Used in truthful matching.</p>
                <div className="flex flex-wrap gap-2">
                  {profile.verifiedSkills.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center space-x-1.5">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Skills I Want to Learn ({profile.learningSkills.length})</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">Target areas for growth. Never presented as production mastery.</p>
                <div className="flex flex-wrap gap-2">
                  {profile.learningSkills.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Preferences Details */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-sm text-slate-900 mb-3">Job Preferences & Search Parameters</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Desired Roles:</span>
                  <strong className="text-slate-800">{profile.preferences.desiredRoles.join(', ')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Preferred Locations:</span>
                  <strong className="text-slate-800">{profile.preferences.preferredLocations.join(', ')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Preferred Compensation:</span>
                  <strong className="text-slate-800">{profile.preferences.preferredCompensation}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Target Experience:</span>
                  <strong className="text-slate-800">{profile.preferences.targetExperienceYears}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Company Types:</span>
                  <strong className="text-slate-800">{profile.preferences.companyTypes.join(', ')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Work Authorization:</span>
                  <strong className="text-slate-800">{profile.preferences.workAuthorization}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Add Manual Job */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-3">Import Job Listing Manually</h3>
            <form onSubmit={handleAddManualJob} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={manualCompany}
                  onChange={e => setManualCompany(e.target.value)}
                  placeholder="e.g. Microsoft / Salesforce"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  placeholder="e.g. Software Engineer (.NET / Backend)"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={e => setManualLocation(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Remote Model</label>
                  <select
                    value={manualRemote}
                    onChange={e => setManualRemote(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Unspecified">Unspecified</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Application URL *</label>
                  <input
                    type="url"
                    required
                    value={manualUrl}
                    onChange={e => setManualUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Disclosed Salary (or leave blank)</label>
                  <input
                    type="text"
                    value={manualSalary}
                    onChange={e => setManualSalary(e.target.value)}
                    placeholder="Defaults to 'Not disclosed'"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Job Description Text *</label>
                <textarea
                  required
                  rows={4}
                  value={manualJD}
                  onChange={e => setManualJD(e.target.value)}
                  placeholder="Paste the requirements and description..."
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Save Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Company Board */}
      {showAddBoardModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-2">Add Public Company Board</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a Greenhouse or Lever board slug to sync live postings via official endpoints.
            </p>
            <form onSubmit={handleAddBoard} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Connector Platform</label>
                <select
                  value={newBoardType}
                  onChange={e => setNewBoardType(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="greenhouse">Greenhouse (boards-api.greenhouse.io)</option>
                  <option value="lever">Lever (api.lever.co)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newBoardCompany}
                  onChange={e => setNewBoardCompany(e.target.value)}
                  placeholder="e.g. Stripe, Figma, GitLab"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Board Token or Slug</label>
                <input
                  type="text"
                  required
                  value={newBoardToken}
                  onChange={e => setNewBoardToken(e.target.value)}
                  placeholder="e.g. gitlab (from boards.greenhouse.io/gitlab)"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBoardModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  Save Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
