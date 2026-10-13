import { TailoredResume, ApplicationRecord, Profile, JobListing } from '../../shared/types.ts';

export interface SubmissionPayload {
  job: JobListing;
  profile: Profile;
  tailoredResume: TailoredResume;
  applicationRecord: ApplicationRecord;
  consentGiven: boolean;
}

export interface SubmissionResult {
  success: boolean;
  status: 'submitted' | 'requires_manual_action' | 'rejected' | 'stopped';
  message: string;
  destinationUrl: string;
  blockingReason?: 'CAPTCHA' | 'MFA' | 'LOGIN_REQUIRED' | 'MISSING_MANDATORY_FIELD' | 'ADAPTER_NOT_AUTHORIZED' | 'UNSUPPORTED_PORTAL';
}

/**
 * AUTOMATION BOUNDARY INTERFACE:
 * - Strictly checks permissions, auth, and user consent.
 * - Stops for CAPTCHA, MFA, login restrictions, or missing required answers.
 * - Never bypasses security checks or stores passwords.
 * - Never fakes auto-apply.
 */
export class ApplicationSubmissionAdapter {
  async evaluateSubmissionCapability(job: JobListing): Promise<{
    canAutomate: boolean;
    reason: string;
  }> {
    // For MVP, third-party sites like Greenhouse/Lever or custom company portals
    // require assisted manual submission because of security checks, CSRF, and CAPTCHA.
    return {
      canAutomate: false,
      reason: `Automated third-party submission is disabled by default to protect account safety and prevent bot detection. JobPilot uses the Assisted Application Mode: we prepare all exact answers and provide one-click copy with direct application link.`
    };
  }

  async executeSubmission(payload: SubmissionPayload): Promise<SubmissionResult> {
    if (!payload.consentGiven) {
      return {
        success: false,
        status: 'stopped',
        message: 'Submission stopped: Explicit candidate consent was not provided.',
        destinationUrl: payload.job.originalApplicationUrl,
        blockingReason: 'ADAPTER_NOT_AUTHORIZED'
      };
    }

    // Check mandatory fields
    const missingAnswers = payload.applicationRecord.suggestedAnswers.filter(
      a => a.needsCandidateInput && (!a.answer || a.answer.trim() === '')
    );

    if (missingAnswers.length > 0) {
      return {
        success: false,
        status: 'requires_manual_action',
        message: `Submission stopped: ${missingAnswers.length} required fields need candidate confirmation.`,
        destinationUrl: payload.job.originalApplicationUrl,
        blockingReason: 'MISSING_MANDATORY_FIELD'
      };
    }

    return {
      success: false,
      status: 'requires_manual_action',
      message: 'Third-party portal requires manual submission to handle security and CSRF tokens.',
      destinationUrl: payload.job.originalApplicationUrl,
      blockingReason: 'UNSUPPORTED_PORTAL'
    };
  }
}

export const submissionAdapter = new ApplicationSubmissionAdapter();
