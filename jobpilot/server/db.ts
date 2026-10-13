import fs from 'fs';
import path from 'path';
import { 
  Profile, 
  JobListing, 
  FitAnalysis, 
  TailoredResume, 
  ApplicationRecord, 
  CompanyBoardConfig 
} from '../shared/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  profile: Profile;
  jobs: JobListing[];
  analyses: FitAnalysis[];
  tailoredResumes: TailoredResume[];
  applications: ApplicationRecord[];
  boardConfigs: CompanyBoardConfig[];
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_PROFILE: Profile = {
  name: "Abhinav Srivastava",
  summary: "Backend/Full-Stack Software Engineer with ~2.5 years of experience building scalable backend services and web applications with .NET, C#, and SQL.",
  yearsOfExperience: 2.5,
  originalResumeText: `Abhinav Srivastava
Email: abhinav.srivastava@example.com | Location: Bengaluru / Hyderabad, India
Backend & Full-Stack Developer (~2.5 Years Experience)

SUMMARY
Backend / Full-Stack Engineer with ~2.5 years of experience developing robust microservices and web APIs using C#, ASP.NET Web API, .NET 8, SQL, and modern frontend technologies like Angular.

EXPERIENCE
Software Engineer - Full Stack & Backend (2023 - Present)
- Designed and built scalable RESTful APIs using ASP.NET Web API and .NET 8.
- Optimized relational SQL queries and stored procedures, reducing execution latency on core reporting endpoints.
- Integrated Angular frontend components with backend endpoints, ensuring secure token authentication.
- Implemented unit testing and integration tests with xUnit.

EDUCATION
Bachelor of Technology in Computer Science & Engineering (2018 - 2022)

CONFIRMED TECHNICAL SKILLS
C#, ASP.NET Web API, .NET 8, SQL, Angular, REST APIs, Git, xUnit`,
  originalResumeUploadDate: new Date().toISOString(),
  version: 1,
  verifiedSkills: [
    "C#",
    "ASP.NET Web API",
    ".NET 8",
    "SQL",
    "Angular",
    "RESTful APIs",
    "Git",
    "xUnit"
  ],
  learningSkills: [
    "Kubernetes / Platform Engineering",
    "Application Security / OWASP",
    "Kafka"
  ],
  experience: [
    {
      id: "exp-1",
      company: "Enterprise Technology Solutions",
      title: "Software Engineer - Backend / Full-Stack",
      location: "Bengaluru, India",
      startDate: "2023-08",
      endDate: "Present",
      current: true,
      bullets: [
        "Architected and deployed high-throughput ASP.NET Web API and .NET 8 microservices handling business logic and reporting.",
        "Engineered relational database schemas in SQL Server/PostgreSQL, optimizing query plans and indexes for sub-100ms response times.",
        "Collaborated with frontend team to implement Angular responsive UI modules communicating with backend REST endpoints.",
        "Authored automated unit and integration tests using xUnit, maintaining test coverage on critical payment and order flows."
      ],
      confirmed: true
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "High-Performance Order Processing API",
      description: "Asynchronous order processing pipeline built with .NET 8 and SQL database.",
      technologies: ["C#", ".NET 8", "SQL", "REST API"],
      bullets: [
        "Implemented transactional outbox pattern to guarantee consistency in SQL operations.",
        "Created OpenAPI/Swagger specifications and comprehensive API documentation."
      ],
      confirmed: true
    }
  ],
  education: [
    {
      id: "edu-1",
      institution: "State Technological University",
      degree: "B.Tech in Computer Science and Engineering",
      year: "2022",
      confirmed: true
    }
  ],
  achievements: [
    {
      id: "ach-1",
      description: "Delivered backend latency optimization improving dashboard load time by 35%",
      metric: "35% faster dashboard query times",
      confirmed: true
    }
  ],
  preferences: {
    desiredRoles: ["Backend Software Engineer", "Full-Stack Engineer"],
    secondaryTracks: ["SRE/Platform", "Security/Vulnerability Management"],
    preferredLocations: ["Hyderabad", "Bengaluru", "Remote (India-eligible)"],
    preferredCompensation: "₹12 LPA or higher",
    targetExperienceYears: "2–4 years",
    companyTypes: ["Product companies", "GCCs"],
    workAuthorization: "India (Citizen / Eligible to work without sponsorship)",
    noticePeriod: "60 Days (Negotiable)"
  },
  updatedAt: new Date().toISOString()
};

const DEFAULT_BOARD_CONFIGS: CompanyBoardConfig[] = [
  {
    id: "board-1",
    sourceType: "greenhouse",
    companyName: "GitLab",
    boardTokenOrSlug: "gitlab",
    boardUrl: "https://boards.greenhouse.io/gitlab",
    verified: true,
    active: true
  },
  {
    id: "board-2",
    sourceType: "greenhouse",
    companyName: "Elastic",
    boardTokenOrSlug: "elastic",
    boardUrl: "https://boards.greenhouse.io/elastic",
    verified: true,
    active: true
  },
  {
    id: "board-3",
    sourceType: "lever",
    companyName: "Canonical",
    boardTokenOrSlug: "canonical",
    boardUrl: "https://jobs.lever.co/canonical",
    verified: true,
    active: true
  }
];

const DEMO_JOBS: JobListing[] = [
  {
    id: "demo-job-1",
    source: "demo",
    sourceId: "demo-net-1",
    company: "Acme Cloud Platform (Demo GCC)",
    title: "Backend Engineer (.NET / C#)",
    location: "Bengaluru, Karnataka, India",
    remoteEligibility: "Hybrid",
    experienceRequirements: "2-4 years experience",
    salary: "Not disclosed",
    jobDescription: `About Us:
Acme Cloud Platform is a global enterprise GCC located in Bengaluru, building next-generation infrastructure management tools.

Responsibilities:
- Build, optimize, and maintain backend REST APIs using .NET 8 and C#.
- Work with relational SQL databases to design performant data models and complex queries.
- Collaborate with frontend teams (Angular/React) to deliver seamless end-to-end features.
- Participate in code reviews, CI/CD pipeline deployments, and security compliance audits.

Requirements:
- 2+ years of professional backend engineering experience with C# and .NET Core / .NET 8.
- Strong knowledge of SQL, relational databases, transactions, and indexing.
- Solid understanding of RESTful API design and API security best practices.
- Experience writing automated unit and integration tests (xUnit/NUnit).
- Nice to have: Familiarity with Angular, Docker containers, or cloud platforms (GCP/Azure).`,
    originalApplicationUrl: "https://example.com/demo/acme-backend-net",
    retrievedAt: new Date().toISOString(),
    postedAt: "2026-10-10",
    isDemo: true,
    department: "Engineering"
  },
  {
    id: "demo-job-2",
    source: "demo",
    sourceId: "demo-fs-2",
    company: "FinTech Orbit Global (Demo Product Co)",
    title: "Full-Stack Software Engineer (C# / Angular)",
    location: "Hyderabad, Telangana, India",
    remoteEligibility: "Hybrid",
    experienceRequirements: "2-5 years experience",
    salary: "₹14 LPA - ₹18 LPA",
    jobDescription: `Overview:
FinTech Orbit Global is a leading product company powering real-time payment reconciliation for global institutions.

Key Responsibilities:
- Design and develop customer-facing web applications using Angular (TypeScript) and ASP.NET Web API (.NET 8).
- Write high-performance SQL queries and stored procedures to handle financial ledger balances.
- Ensure test automation, defensive coding, and vulnerability remediation across the stack.

Qualifications:
- Bachelor's degree in Computer Science or equivalent.
- 2-4 years of experience with C#, ASP.NET Web API, and SQL Server.
- Hands-on experience with modern Angular frameworks.
- Strong problem-solving abilities and communication skills.`,
    originalApplicationUrl: "https://example.com/demo/fintech-orbit-fullstack",
    retrievedAt: new Date().toISOString(),
    postedAt: "2026-10-11",
    isDemo: true,
    department: "Payments Engineering"
  },
  {
    id: "demo-job-3",
    source: "demo",
    sourceId: "demo-us-remote-3",
    company: "Apex Global Dynamics (Demo US Remote)",
    title: "Senior Backend Developer",
    location: "Remote - US & Canada Only",
    remoteEligibility: "Remote",
    experienceRequirements: "5+ years experience",
    salary: "$140,000 - $160,000 USD",
    jobDescription: `We are looking for a Senior Backend Developer. Note: This position is strictly open to US/Canada residents with valid US work authorization. Applicants outside the Americas will not be considered.
Requirements:
- 5+ years building distributed Go or .NET backend systems.
- Kubernetes, AWS, microservices architecture.`,
    originalApplicationUrl: "https://example.com/demo/apex-senior-remote",
    retrievedAt: new Date().toISOString(),
    postedAt: "2026-10-08",
    isDemo: true,
    department: "Core Systems"
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error("Error reading database file, using defaults:", err);
    }
    const initial: DatabaseSchema = {
      profile: DEFAULT_PROFILE,
      jobs: DEMO_JOBS,
      analyses: [],
      tailoredResumes: [],
      applications: [],
      boardConfigs: DEFAULT_BOARD_CONFIGS
    };
    this.save(initial);
    return initial;
  }

  private save(data?: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error writing database file:", err);
    }
  }

  getProfile(): Profile {
    return this.data.profile;
  }

  updateProfile(profile: Partial<Profile>): Profile {
    this.data.profile = {
      ...this.data.profile,
      ...profile,
      version: (this.data.profile.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.profile;
  }

  resetProfile(): Profile {
    this.data.profile = { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.profile;
  }

  getJobs(): JobListing[] {
    return this.data.jobs;
  }

  addJob(job: JobListing): JobListing {
    // Deduplication check
    const existing = this.data.jobs.find(j => 
      (j.sourceId && job.sourceId && j.sourceId === job.sourceId && j.source === job.source) ||
      (j.originalApplicationUrl && job.originalApplicationUrl && j.originalApplicationUrl === job.originalApplicationUrl) ||
      (j.company.toLowerCase() === job.company.toLowerCase() && 
       j.title.toLowerCase() === job.title.toLowerCase() && 
       j.location.toLowerCase() === job.location.toLowerCase())
    );

    if (existing) {
      return existing;
    }

    this.data.jobs.unshift(job);
    this.save();
    return job;
  }

  addJobs(jobs: JobListing[]): { added: number; total: number } {
    let added = 0;
    for (const job of jobs) {
      const existing = this.data.jobs.find(j => 
        (j.sourceId && job.sourceId && j.sourceId === job.sourceId && j.source === job.source) ||
        (j.originalApplicationUrl && job.originalApplicationUrl && j.originalApplicationUrl === job.originalApplicationUrl) ||
        (j.company.toLowerCase() === job.company.toLowerCase() && 
         j.title.toLowerCase() === job.title.toLowerCase() && 
         j.location.toLowerCase() === job.location.toLowerCase())
      );
      if (!existing) {
        this.data.jobs.unshift(job);
        added++;
      }
    }
    if (added > 0) {
      this.save();
    }
    return { added, total: this.data.jobs.length };
  }

  deleteJob(id: string): boolean {
    const prevLen = this.data.jobs.length;
    this.data.jobs = this.data.jobs.filter(j => j.id !== id);
    if (this.data.jobs.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  getAnalyses(): FitAnalysis[] {
    return this.data.analyses;
  }

  getAnalysis(jobId: string, profileVersion: number, jdHash: string): FitAnalysis | undefined {
    return this.data.analyses.find(a => 
      a.jobId === jobId && a.profileVersion === profileVersion && a.jdHash === jdHash
    );
  }

  saveAnalysis(analysis: FitAnalysis): FitAnalysis {
    this.data.analyses = this.data.analyses.filter(a => a.id !== analysis.id && !(a.jobId === analysis.jobId && a.profileVersion === analysis.profileVersion && a.jdHash === analysis.jdHash));
    this.data.analyses.unshift(analysis);
    this.save();
    return analysis;
  }

  getTailoredResumes(): TailoredResume[] {
    return this.data.tailoredResumes;
  }

  getTailoredResume(id: string): TailoredResume | undefined {
    return this.data.tailoredResumes.find(r => r.id === id);
  }

  getTailoredResumeForJob(jobId: string): TailoredResume | undefined {
    return this.data.tailoredResumes.find(r => r.jobId === jobId);
  }

  saveTailoredResume(resume: TailoredResume): TailoredResume {
    this.data.tailoredResumes = this.data.tailoredResumes.filter(r => r.id !== resume.id && r.jobId !== resume.jobId);
    this.data.tailoredResumes.unshift(resume);
    this.save();
    return resume;
  }

  getApplications(): ApplicationRecord[] {
    return this.data.applications;
  }

  getApplication(id: string): ApplicationRecord | undefined {
    return this.data.applications.find(a => a.id === id);
  }

  getApplicationForJob(jobId: string): ApplicationRecord | undefined {
    return this.data.applications.find(a => a.jobId === jobId);
  }

  saveApplication(app: ApplicationRecord): ApplicationRecord {
    this.data.applications = this.data.applications.filter(a => a.id !== app.id && a.jobId !== app.jobId);
    this.data.applications.unshift(app);
    this.save();
    return app;
  }

  getBoardConfigs(): CompanyBoardConfig[] {
    return this.data.boardConfigs;
  }

  saveBoardConfig(config: CompanyBoardConfig): CompanyBoardConfig {
    this.data.boardConfigs = this.data.boardConfigs.filter(b => b.id !== config.id);
    this.data.boardConfigs.push(config);
    this.save();
    return config;
  }

  deleteBoardConfig(id: string): boolean {
    const prev = this.data.boardConfigs.length;
    this.data.boardConfigs = this.data.boardConfigs.filter(b => b.id !== id);
    if (this.data.boardConfigs.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new Database();
