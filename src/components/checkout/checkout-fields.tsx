"use client";
import Link from 'next/link';
import {AlertCircle} from 'lucide-react';
import type {InvalidEvent} from 'react';
import {US_STATE_OPTIONS} from '@/lib/us-states';
export function CheckoutInput({
  autoComplete,
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  autoComplete?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-ink">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        onInvalid={revealFirstInvalidControl}
        className="min-h-11 w-full min-w-0 scroll-mt-32 rounded-md border border-line bg-white px-3 text-base font-normal text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}

export function CheckoutStateSelect({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-ink">
      State
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInvalid={revealFirstInvalidControl}
        autoComplete="shipping address-level1"
        required
        className="min-h-11 w-full min-w-0 scroll-mt-32 rounded-md border border-line bg-white px-3 text-base font-normal text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
      >
        <option value="">Select state</option>
        {US_STATE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name} ({option.code})
          </option>
        ))}
      </select>
    </label>
  );
}

export function revealFirstInvalidControl(
  event: InvalidEvent<HTMLInputElement | HTMLSelectElement>,
) {
  const control = event.currentTarget;

  if (control.form?.querySelector(":invalid") !== control) {
    return;
  }

  window.requestAnimationFrame(() => {
    control.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

export function CheckoutError({ message }: { message: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center p-6 text-center">
      <div>
        <AlertCircle className="mx-auto text-amber-600" size={34} />
        <p className="mt-4 font-medium text-ink">{message}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your cart details are still available if the session expired or was
          opened in another tab.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/cart" className="tr-button-primary">
            Return to cart
          </Link>
          <Link href="/shop" className="tr-button-outline">
            Shop ready stands
          </Link>
        </div>
      </div>
    </div>
  );
}
