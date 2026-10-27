import {ExternalLink} from 'lucide-react';
import type {CustomerPortalStand} from '@/lib/customer-portal';
export function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-md bg-soft px-3 py-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className={`mt-1 block break-words text-ink ${label==='Stand ID'?'font-mono text-xs normal-case':'capitalize'}`}>{value}</span>
    </p>
  );
}

export function DetailLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-md bg-soft px-3 py-2 text-brand">
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span className="mt-1 block truncate normal-case">{href}</span>
      </span>
      <ExternalLink size={15} className="shrink-0" />
    </a>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-muted">{message}</div>;
}

export function formatKind(kind: CustomerPortalStand["kind"]) {
  if (kind === "multilink") return "Multi-Link";
  if (kind === "branded") return "Branded Direct";
  if (kind === "custom") return "Custom";
  return "Standard Direct";
}

export function formatPaymentStatus(status?: string) {
  if (status === "manual_unpaid") return "Payment pending review";
  if (!status || status === "unpaid" || status === "pending_payment") return "Payment pending";
  return status.replaceAll("_", " ");
}
