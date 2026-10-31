'use client';

import {useEffect, useRef, type ReactNode} from 'react';

/** Only existing detail links and explicitly marked popup openers make a row interactive. */
export function AdminRowExplorer({children}: {children: ReactNode}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const original = new Map<HTMLTableRowElement, {tabIndex: string | null; label: string | null}>();
    const destination = (row: HTMLTableRowElement) =>
      row.querySelector<HTMLButtonElement>('button[data-admin-row-open]:not(:disabled)') ||
      row.querySelector<HTMLAnchorElement>('a[href^="/admin/"]:not([aria-disabled="true"])');
    const restore = (row: HTMLTableRowElement) => {
      const previous = original.get(row);
      if (!previous) return;
      delete row.dataset.adminRow;
      for (const [name, value] of [['tabindex', previous.tabIndex], ['aria-label', previous.label]]) {
        if (value === null) row.removeAttribute(name!);
        else row.setAttribute(name!, value!);
      }
      original.delete(row);
    };
    const tableViewports = new Set<HTMLElement>();
    const updateTableOverflow = () => tableViewports.forEach(viewport => {
      const table = viewport.querySelector('table');
      viewport.toggleAttribute('data-mobile-scroll', Boolean(table && table.offsetWidth > viewport.clientWidth + 1));
    });
    const resizeObserver = new ResizeObserver(updateTableOverflow);
    const enhance = () => {
      el.querySelectorAll('table').forEach(table => {
        const viewport = table.parentElement;
        if (!viewport || tableViewports.has(viewport)) return;
        viewport.classList.add('tr-admin-table-viewport');
        tableViewports.add(viewport);
        resizeObserver.observe(viewport);
        resizeObserver.observe(table);
      });
      updateTableOverflow();
      el.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
        const actionable = !row.closest('dialog,[role="dialog"]') && row.cells.length >= 2 && row.cells[0]?.colSpan <= 1 && destination(row);
        if (!actionable) { restore(row); return; }
        if (original.has(row)) return;
        original.set(row, {tabIndex: row.getAttribute('tabindex'), label: row.getAttribute('aria-label')});
        row.dataset.adminRow = 'true';
        if (!row.hasAttribute('tabindex')) row.tabIndex = 0;
        const identity = Array.from(row.cells).map(cell => cell.innerText.trim()).find(Boolean) || 'Row';
        row.setAttribute('aria-label', `Open details: ${identity.slice(0, 90)}`);
      });
    };
    const activate = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('a,button,input,select,textarea,label,summary,[contenteditable=true],dialog,[role="dialog"]')) return;
      const row = target.closest<HTMLTableRowElement>('tr[data-admin-row]');
      if (!row || !el.contains(row)) return;
      if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey || event.shiftKey || window.getSelection()?.toString())) return;
      const action = destination(row);
      if (!action) return;
      event.preventDefault();
      action.click();
    };
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(el, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'href']});
    el.addEventListener('click', activate);
    el.addEventListener('keydown', activate);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      tableViewports.forEach(viewport => viewport.removeAttribute("data-mobile-scroll"));
      el.removeEventListener('click', activate);
      el.removeEventListener('keydown', activate);
      original.forEach((_, row) => restore(row));
    };
  }, []);

  return <div ref={root} className="tr-admin-content">{children}</div>;
}
