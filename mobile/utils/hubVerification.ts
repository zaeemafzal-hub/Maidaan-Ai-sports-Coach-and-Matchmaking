import type { HubVerificationRequest } from '../types';

/** Accept the earlier requestId contract during a backend/mobile rolling update. */
export function normalizeHubVerification(value: HubVerificationRequest & {requestId?: string}): HubVerificationRequest {
  const id = value.id || value.requestId;
  if (!id) throw new Error('Verification response is missing its reference. Please retry.');
  return {...value, id};
}
