export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets: string[];
  confirmed: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  bullets: string[];
  confirmed: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  year?: string;
  confirmed: boolean;
}

export interface Achievement {
  id: string;
  description: string;
  metric?: string;
  confirmed: boolean;
}

export interface ProfilePreferences {
  desiredRoles: string[];
  secondaryTracks: string[];
  preferredLocations: string[];
  preferredCompensation: string; // e.g. "₹12 LPA or higher"
  targetExperienceYears: string; // e.g. "2–4 years"
  companyTypes: string[]; // e.g. ["Product companies", "GCCs"]
  workAuthorization: string; // default e.g. "India citizen / eligible"
  noticePeriod?: string;
}

export interface Profile {
  name: string;
  summary: string;
  yearsOfExperience: number;
  originalResumeText: string;
  originalResumeUploadDate?: string;
  version: number;
  
  // Confirmed / Verified profile sections
  verifiedSkills: string[];
  learningSkills: string[];
  experience: WorkExperience[];
  projects: Project[];
  education: Education[];
  achievements: Achievement[];
  
  preferences: ProfilePreferences;
  
  updatedAt: string;
}

export interface JobListing {
  id: string;
  source: 'greenhouse' | 'lever' | 'manual' | 'demo';
  sourceId?: string;
  company: string;
  title: string;
  location: string;
  remoteEligibility: 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified';
  experienceRequirements?: string;
  salary: string; // "Not disclosed" or actual disclosed amount
  jobDescription: string;
  originalApplicationUrl: string;
  retrievedAt: string;
  postedAt?: string; // Only if supplied by the source! Never retrieval time.
  isDemo?: boolean;
  department?: string;
}

export interface FitAnalysis {
  id: string;
  jobId: string;
  profileVersion: number;
  jdHash: string;
  analyzedAt: string;
  
  heuristicScore: number; // 0-100 labelled "Heuristic fit score"
  scoreExplanation: {
    skillsScore: number;
    experienceScore: number;
    locationScore: number;
    roleScore: number;
    details: string;
  };
  
  matchedRequirements: string[];
  missingRequirements: string[];
  unknowns: string[];
  
  essentialRequirements: string[];
  niceToHaves: string[];
  
  constraints: {
    locationMatch: boolean;
    locationNote: string;
    workAuthMatch: boolean;
    workAuthNote: string; // Explicitly noted: never infer remote jobs accept applicants from India without evidence
    experienceMatch: boolean;
    experienceNote: string;
  };
  
  summaryReasoning: string;
}

export interface KeywordClassification {
  keyword: string;
  category: 'supported' | 'needs_confirmation' | 'missing';
  supportingFact?: string; // Linked profile fact or verified bullet
  explanation: string;
}

export interface BulletDiff {
  id: string;
  original: string;
  proposed: string;
  changeReason: string;
  supportingFact: string;
  approved: boolean;
}

export interface TailoredResume {
  id: string;
  jobId: string;
  profileVersion: number;
  createdAt: string;
  updatedAt: string;
  approvedByCandidate: boolean;
  
  targetedJobTitle: string;
  targetedCompany: string;
  
  tailoredSummary: string;
  originalSummary: string;
  summaryChangeReason: string;
  
  keywords: KeywordClassification[];
  bulletDiffs: BulletDiff[];
  
  recruiterMessage: string; // Truthful outreach/referral message
  
  finalMarkdown: string;
}

export type ApplicationStatus =
  | 'Saved'
  | 'Preparing'
  | 'Ready for Review'
  | 'Application Opened'
  | 'Applied'
  | 'Interview'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationRecord {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  userReportedStatus: boolean; // explicitly user-reported
  tailoredResumeId?: string;
  applicationDate?: string;
  appliedUrl: string;
  notes: string;
  followUpDate?: string;
  nextAction?: string;
  suggestedAnswers: {
    question: string;
    answer: string;
    isConfirmed: boolean;
    needsCandidateInput: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyBoardConfig {
  id: string;
  sourceType: 'greenhouse' | 'lever';
  companyName: string;
  boardTokenOrSlug: string;
  boardUrl: string;
  verified: boolean;
  active: boolean;
  lastSyncAt?: string;
  lastError?: string;
}
