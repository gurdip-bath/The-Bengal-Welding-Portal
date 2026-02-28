import { Job } from '../types';

/**
 * Shared job identity display helpers for consistency across Jobs, Sites, and Certificates pages.
 * Use these so users can easily identify site, customer, job, and service.
 */

/** Site/Customer name (primary identifier) */
export const getSiteName = (job: Job): string => job.customerName || 'No Name';

/** Job identifier (e.g. J-1234, r3) */
export const getJobIdentifier = (job: Job): string => job.id;

/** Service type (job title/description) */
export const getJobService = (job: Job): string =>
  job.jobType || job.title || job.description || 'Full Duct Clean';

/** Site address: "address, postcode" */
export const getSiteAddress = (job: Job): string =>
  [job.customerAddress, job.customerPostcode].filter(Boolean).join(', ') || '—';

/** Label combining job ID and service: "J-1234 • Full Duct Clean" */
export const getJobIdentifierAndService = (job: Job): string =>
  `${getJobIdentifier(job)} • ${getJobService(job)}`;
