import type {MouseEvent} from 'react';

/** Row whitespace opens details; nested controls retain their own actions.
 * Keep a native detail button/link in every row for keyboard users. */
export function activateListRow(event: MouseEvent<HTMLElement>, open: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target as HTMLElement;
  if (target.closest('a,button,input,select,textarea,label,summary,dialog,[role="dialog"],[contenteditable="true"]')) return;
  if (target.closest('[data-dashboard-row]') !== event.currentTarget) return;
  if (event.currentTarget.ownerDocument.getSelection()?.toString()) return;
  open();
}
