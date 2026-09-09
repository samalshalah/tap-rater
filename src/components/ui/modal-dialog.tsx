"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalDialogProps = {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  className?: string;
};

export function ModalDialog({ children, onClose, labelledBy, className = "" }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    // Native modality makes the background inert, including for assistive technology.
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("[data-dialog-heading]")?.focus({ preventScroll: true });

    return () => {
      dialog.close();
      document.body.style.overflow = originalOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-modal="true"
      className={`fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none place-items-center overflow-hidden border-0 bg-transparent text-ink open:grid backdrop:bg-ink/45 ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const controls = getTabStops(dialog);
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        // Keep Tab at the modal's edges from moving into browser chrome.
        if (!first || !last) {
          event.preventDefault();
        } else if (!controls.includes(active as HTMLElement) || (event.shiftKey ? active === first : active === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }}
    >
      {children}
      {/* Iframe key events do not bubble; catch focus as it exits the preview. */}
      <span
        tabIndex={0}
        data-dialog-focus-guard
        aria-hidden="true"
        className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0"
        onFocus={() => {
          const dialog = dialogRef.current;
          if (dialog) (getTabStops(dialog)[0] ?? dialog.querySelector<HTMLElement>("[data-dialog-heading]"))?.focus();
        }}
      />
    </dialog>
  );
}

function getTabStops(dialog: HTMLDialogElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, iframe, [tabindex], [contenteditable="true"]'
  )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled, [data-dialog-focus-guard]")
    && !element.closest("[inert]") && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden");
}
