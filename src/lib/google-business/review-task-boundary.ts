/**
 * Review drafts imported before this release are history, not work assigned to
 * a customer. A user can still explicitly re-open an older review, which is
 * tracked separately by `old_reply_requested_at`.
 */
export const REVIEW_TASK_CUTOVER_AT = '2026-11-07T16:45:00.000Z';

export function reviewTaskBoundary(initialImportCompletedAt?: string | null, consentAt?: string | null) {
  const cutover = Date.parse(REVIEW_TASK_CUTOVER_AT);
  const source = initialImportCompletedAt || consentAt;
  const sourceTime = source ? Date.parse(source) : Number.NaN;
  return new Date(Math.max(cutover, Number.isFinite(sourceTime) ? sourceTime : cutover)).toISOString();
}
