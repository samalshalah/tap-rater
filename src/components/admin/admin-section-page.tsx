import Link from "next/link";
import { AdminConfigForm } from "@/components/admin/admin-config-form";

type AdminSectionPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  primaryItems: string[];
  nextItems: string[];
  primaryHref?: string;
  primaryLabel?: string;
  config?: {
    area: string;
    primaryLabel: string;
    secondaryLabel: string;
    notesLabel: string;
    primaryPlaceholder: string;
    secondaryPlaceholder: string;
    notesPlaceholder: string;
  };
};

export function AdminSectionPage({
  title,
  eyebrow,
  description,
  primaryItems,
  nextItems,
  primaryHref,
  primaryLabel,
  config
}: AdminSectionPageProps) {
  return (
    <section className="tr-admin-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="tr-eyebrow">{eyebrow}</p>
          <h1 className="tr-page-title mt-2">{title}</h1>
          <p className="tr-body mt-3 max-w-3xl">{description}</p>
        </div>
        {primaryHref && primaryLabel ? (
          <Link href={primaryHref} className="tr-button-secondary">
            {primaryLabel}
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {config ? (
          <div className="tr-card p-5 lg:col-span-2">
            <h2 className="text-xl font-black text-ink">Editable settings</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Save operational settings for this admin area. These records are stored in Postgres `site_content` when configured.
            </p>
            <div className="mt-5">
              <AdminConfigForm
                area={config.area}
                title={title}
                primaryLabel={config.primaryLabel}
                secondaryLabel={config.secondaryLabel}
                notesLabel={config.notesLabel}
                primaryPlaceholder={config.primaryPlaceholder}
                secondaryPlaceholder={config.secondaryPlaceholder}
                notesPlaceholder={config.notesPlaceholder}
              />
            </div>
          </div>
        ) : null}
        <div className="tr-card p-5">
          <h2 className="text-xl font-black text-ink">Controls included</h2>
          <div className="mt-4 grid gap-3">
            {primaryItems.map((item) => (
              <div key={item} className="rounded-lg border border-line bg-soft p-4 text-sm font-semibold text-ink">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="tr-card p-5">
          <h2 className="text-xl font-black text-ink">Next implementation steps</h2>
          <div className="mt-4 grid gap-3">
            {nextItems.map((item) => (
              <div key={item} className="rounded-lg border border-line p-4 text-sm leading-6 text-muted">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
