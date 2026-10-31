type Failure = { code?: string; path?: string; http_status?: number; occurrences?: number };

export function describeClientFailure(row: Failure) {
  const area = row.path?.includes('/setup/proof') ? 'Stand design preview'
    : row.path?.includes('/checkout') ? 'Checkout'
    : row.path?.includes('/media') ? 'Image upload'
    : row.path?.includes('/landing-pages') ? 'Multi-Link page'
    : 'Customer account';
  const background: Record<string, [string, string]> = {
    review_import: ['Google Reviews could not refresh.', 'Check the Google connection and retry the review refresh.'],
    review_draft: ['A Google review reply draft could not be prepared.', 'Open the review and retry preparing its reply.'],
    review_ai_allowance: ['The monthly review reply allowance has been reached.', 'Review the account allowance. Replies can still be written manually.'],
    review_access_unavailable: ['Google review reply access is unavailable.', 'Check the account access and Google connection.'],
    review_publish_uncertain: ['A Google review reply has an unconfirmed publishing result.', 'Check Google before sending it again to avoid a duplicate reply.'],
    email_delivery: ['A website email failed to send or was returned.', 'Check the email delivery record and recipient address before retrying.'],
    heatmap_result: ['A local search report could not finish.', 'Review the report details before retrying.'],
    heatmap_provider_hold: ['Local search reports are temporarily on hold.', 'Check the provider status in the admin dashboard.'],
    profile_draft: ['A business profile draft could not be prepared.', 'Review the affected draft in the admin dashboard.']
  };
  let [summary, action] = background[row.code ?? ''] ?? (
    row.code?.startsWith('worker_') ? ['A scheduled website task failed.', 'Check the task status in the admin dashboard.']
    : row.http_status === 429 ? [`${area}: a request was temporarily blocked because too many requests arrived close together.`, 'Wait a moment and try again. If it keeps happening, review the incident in the admin dashboard.']
    : row.http_status === 401 ? [`${area}: the session required sign-in again.`, 'Sign in again and retry the action.']
    : row.http_status === 403 ? [`${area}: an action was blocked by an access check.`, 'Check the account permissions before retrying.']
    : row.http_status && row.http_status >= 500 ? [`${area}: the website could not complete a request.`, 'Retry the action. If the problem continues, review the incident in the admin dashboard.']
    : [`${area}: an action could not be completed.`, 'Review the incident in the admin dashboard to identify the affected action.']
  );
  const count = Number(row.occurrences) || 1;
  return `${summary} Recorded ${count === 1 ? 'once' : `${count} times`}. Next step: ${action}`;
}
