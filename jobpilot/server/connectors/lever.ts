import { JobListing } from '../../shared/types.ts';

export async function fetchLeverJobs(siteSlug: string, companyName: string): Promise<JobListing[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(siteSlug)}?mode=json`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Lever API returned ${response.status}: ${response.statusText}`);
  }

  const data: any[] = await response.json();

  return data.map((j: any) => {
    const descText = (j.descriptionPlain || (j.description ? j.description.replace(/<[^>]*>?/gm, ' ') : ''))
      + '\n' + (j.additionalPlain || '');

    const workplaceType = j.workplaceType || '';
    let remote: 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified' = 'Unspecified';
    if (workplaceType.toLowerCase() === 'remote' || (j.text || '').toLowerCase().includes('remote')) {
      remote = 'Remote';
    } else if (workplaceType.toLowerCase() === 'hybrid') {
      remote = 'Hybrid';
    } else if (j.categories?.location) {
      remote = 'On-site';
    }

    return {
      id: `lever-${siteSlug}-${j.id}`,
      source: 'lever',
      sourceId: String(j.id),
      company: companyName,
      title: j.text || 'Untitled Role',
      location: j.categories?.location || (remote === 'Remote' ? 'Remote' : 'Unspecified'),
      remoteEligibility: remote,
      experienceRequirements: j.categories?.commitment,
      salary: j.salaryDescription || "Not disclosed",
      jobDescription: descText.trim() || 'No description provided',
      originalApplicationUrl: j.hostedUrl || j.applyUrl || `https://jobs.lever.co/${siteSlug}/${j.id}`,
      retrievedAt: new Date().toISOString(),
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString().substring(0, 10) : undefined,
      isDemo: false,
      department: j.categories?.department || j.categories?.team
    };
  });
}
