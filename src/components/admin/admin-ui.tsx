import { forwardRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";

type AdminTone = "neutral" | "brand" | "success" | "warning" | "danger" | "ink";
type AdminButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55";

const buttonVariants: Record<AdminButtonVariant, string> = {
  primary: "border border-ink bg-ink text-white hover:border-brand hover:bg-brand",
  secondary: "border border-brand bg-brand text-white hover:border-brand-dark hover:bg-brand-dark",
  outline: "border border-line bg-white text-ink hover:border-brand hover:text-brand",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "border border-transparent bg-transparent text-ink hover:bg-gray-100"
};

export const AdminButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AdminButtonVariant; loading?: boolean }
>(function AdminButton({
  variant = "outline",
  loading = false,
  className,
  children,
  disabled,
  ...props
}, ref) {
  return (
    <button ref={ref} className={cx(buttonBase, buttonVariants[variant], className)} disabled={disabled || loading} {...props}>
      {loading ? "Loading..." : children}
    </button>
  );
});

export function AdminLinkButton({
  variant = "outline",
  className,
  children,
  ...props
}: LinkProps & { className?: string; children: ReactNode; variant?: AdminButtonVariant }) {
  return (
    <Link className={cx(buttonBase, buttonVariants[variant], className)} {...props}>
      {children}
    </Link>
  );
}

export function AdminExternalButton({
  variant = "outline",
  className,
  children,
  disabled,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: AdminButtonVariant; disabled?: boolean }) {
  return (
    <a
      className={cx(buttonBase, buttonVariants[variant], disabled && "pointer-events-none opacity-55", className)}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </a>
  );
}

export function AdminIconButton({
  label,
  variant = "outline",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: AdminButtonVariant }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "grid h-10 w-10 place-items-center rounded-lg p-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
        buttonVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const badgeTones: Record<AdminTone, string> = {
  neutral: "bg-gray-100 text-muted",
  brand: "bg-teal-50 text-brand",
  success: "bg-teal-50 text-brand",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  ink: "bg-ink text-white"
};

export function AdminBadge({ children, tone = "neutral", title }: { children: ReactNode; tone?: AdminTone; title?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]", badgeTones[tone])} title={title}>
      {children}
    </span>
  );
}

export function AdminCard({
  title,
  description,
  children,
  className
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("tr-admin-card p-4 md:p-5", className)}>
      {title ? (
        <div className="mb-4">
          <h2 className="tr-admin-card-title text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminSummaryCard({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <AdminCard className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
    </AdminCard>
  );
}

export function AdminSoftPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("tr-admin-soft-panel p-4", className)}>{children}</div>;
}

export function AdminAlert({ tone = "neutral", children, className, tabIndex }: { tone?: AdminTone; children: ReactNode; className?: string; tabIndex?: number }) {
  const classes =
    tone === "danger"
      ? "tr-status-error"
      : tone === "warning"
        ? "tr-status-warning"
        : tone === "success" || tone === "brand"
          ? "tr-status-success"
          : "rounded-lg border border-line bg-white p-3 text-sm font-semibold text-muted";

  return (
    <div className={cx(classes, className)} tabIndex={tabIndex}>
      {children}
    </div>
  );
}

export function AdminField({
  label,
  helper,
  error,
  children
}: {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      <span>{label}</span>
      {children}
      {helper ? <span className="text-xs font-semibold leading-5 text-muted">{helper}</span> : null}
      {error ? <span className="text-xs font-semibold leading-5 text-red-700">{error}</span> : null}
    </label>
  );
}

export function AdminInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("tr-input min-h-10 px-3 py-2", className)} {...props} />;
}

export function AdminSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx("tr-input min-h-10 px-3 py-2", className)} {...props}>
      {children}
    </select>
  );
}

export function AdminTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("tr-textarea min-h-24 px-3 py-2", className)} {...props} />;
}

export function AdminTableShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("tr-admin-table-shell overflow-hidden", className)}>{children}</div>;
}

export function AdminResponsiveTable({
  table,
  cards,
  className
}: {
  table: ReactNode;
  cards: ReactNode;
  className?: string;
}) {
  return (
    <AdminTableShell className={className}>
      <div className="hidden overflow-x-auto lg:block">{table}</div>
      <div className="grid gap-3 p-3 lg:hidden">{cards}</div>
    </AdminTableShell>
  );
}
