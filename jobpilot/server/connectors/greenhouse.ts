import { JobListing } from '../../shared/types.ts';

export async function fetchGreenhouseJobs(boardToken: string, companyName: string): Promise<JobListing[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Greenhouse API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const jobs: any[] = data.jobs || [];

  return jobs.map((j: any) => {
    // Strip HTML from content if present
    const content = j.content ? j.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : 'No description provided';
    
    // Check remote hints from title or location
    const locName = j.location?.name || 'Unspecified';
    let remote: 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified' = 'Unspecified';
    const locLower = (locName + ' ' + (j.title || '')).toLowerCase();
    if (locLower.includes('remote')) {
      remote = 'Remote';
    } else if (locLower.includes('hybrid')) {
      remote = 'Hybrid';
    } else if (locName !== 'Unspecified') {
      remote = 'On-site';
    }

    return {
      id: `gh-${boardToken}-${j.id}`,
      source: 'greenhouse',
      sourceId: String(j.id),
      company: companyName,
      title: j.title || 'Untitled Role',
      location: locName,
      remoteEligibility: remote,
      experienceRequirements: undefined,
      salary: "Not disclosed", // Never estimate!
      jobDescription: content,
      originalApplicationUrl: j.absolute_url || `https://boards.greenhouse.io/${boardToken}/jobs/${j.id}`,
      retrievedAt: new Date().toISOString(),
      postedAt: j.updated_at ? j.updated_at.substring(0, 10) : undefined, // only if provided by source
      isDemo: false,
      department: j.departments && j.departments.length > 0 ? j.departments[0].name : undefined
    };
  });
}
