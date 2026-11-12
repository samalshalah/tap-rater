export function draftHealth(error: string | null | undefined) {
  if (!error) return null;
  if (error.startsWith('Monthly AI allowance exhausted.')) {
    return {label: 'Monthly AI allowance reached', detail: 'Drafting resumes when the allowance resets or is increased.', requiresAttention:true};
  }
  if (error.startsWith('Draft generation is queued')) {
    return {label: 'Drafting is queued', detail: 'Tap Rater will resume after the cooldown.', requiresAttention:false};
  }
  if (error.startsWith('The automatic draft could not be saved.')) {
    return {label: 'Draft could not be saved', detail: 'Tap Rater will retry.', requiresAttention:true};
  }
  if (error.startsWith('The draft was saved.')) {
    return {label: 'Posting needs checking', detail: 'The draft is saved. Open Reviews to check its posting status.', requiresAttention:true};
  }
  return {label: 'Automatic drafting will retry', detail: 'You can also write a reply in Reviews.', requiresAttention:true};
}
