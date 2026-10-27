"use client";

import { CheckCircle2,XCircle } from "lucide-react";
import { type ChangeEventHandler,type ReactNode } from "react";
import { AdminBadge,AdminCard,AdminInput,AdminSelect,AdminSoftPanel,AdminTextarea } from "./admin-ui";

export function EditorCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <AdminCard title={title} description={description}>
      <div className="grid gap-4">{children}</div>
    </AdminCard>
  );
}

export function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminCard title={title} className="grid gap-3 p-4">
      {children}
    </AdminCard>
  );
}

export function ControlledInput({
  name,
  label,
  value,
  placeholder,
  helper,
  required = true,
  onChange
}: {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <span className="text-xs font-semibold text-muted">{helper}</span> : null}
    </label>
  );
}

export function Input({
  name,
  label,
  defaultValue,
  placeholder,
  required = true
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}

export function Textarea({
  name,
  label,
  defaultValue,
  placeholder,
  tall = false,
  required = true,
  onChange
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  tall?: boolean;
  required?: boolean;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminTextarea
        className={tall ? "min-h-36" : "min-h-20"}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
      />
    </label>
  );
}

export function StructuredPreview({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-black text-ink">{title}</p>
      <div className="grid gap-2">
        {rows.length > 0 ? (
          rows.map(([label, value], index) => (
            <div key={`${title}-${index}`} className="grid gap-1 rounded-md border border-line bg-white px-3 py-2 text-sm md:grid-cols-[180px_1fr]">
              <span className="font-semibold text-ink">{label}</span>
              <span className="leading-6 text-muted">{value}</span>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted">No structured rows yet.</p>
        )}
      </div>
    </div>
  );
}

export function VariantTextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function VariantNumberInput({
  label,
  value,
  step = "1",
  onChange
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        min="0"
        step={step}
        type="number"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}

export function VariantPriceInput({
  label,
  value,
  allowPending = true,
  onChange
}: {
  label: string;
  value: number | null;
  allowPending?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        inputMode="numeric"
        placeholder={allowPending ? "Pending" : "0"}
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          const trimmed = event.target.value.trim();
          onChange(trimmed === "" && allowPending ? null : Math.max(0, Math.round(Number(trimmed) || 0)));
        }}
      />
    </label>
  );
}

export function VariantBooleanSelect({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminSelect value={value ? "true" : "false"} onChange={(event) => onChange(event.target.value === "true")}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </AdminSelect>
    </label>
  );
}

export function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <AdminSoftPanel className="px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </AdminSoftPanel>
  );
}

export function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-white px-3 py-2">
      <span className="min-w-32 text-xs font-black uppercase text-ink">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function RulePill({ active, label }: { active: boolean; label: string }) {
  return (
    <AdminBadge tone={active ? "success" : "neutral"}>
      {label}
    </AdminBadge>
  );
}

export function OptionReadinessBadge({ ready, missingCount }: { ready: boolean; missingCount: number }) {
  return (
    <AdminBadge tone={ready ? "success" : "warning"}>
      {ready ? "Ready" : `${missingCount} media missing`}
    </AdminBadge>
  );
}

export function ReadinessLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      {ready ? <CheckCircle2 className="h-4 w-4 text-brand" aria-label="Ready" /> : <XCircle className="h-4 w-4 text-red-600" aria-label="Missing" />}
    </div>
  );
}

