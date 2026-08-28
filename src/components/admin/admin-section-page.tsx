import { AdminConfigForm } from "@/components/admin/admin-config-form";
import { AdminCard, AdminLinkButton, AdminSoftPanel } from "./admin-ui";

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
          <h1 className="tr-admin-title mt-2">{title}</h1>
          <p className="tr-body mt-3 max-w-3xl">{description}</p>
        </div>
        {primaryHref && primaryLabel ? (
          <AdminLinkButton href={primaryHref} variant="secondary">
            {primaryLabel}
          </AdminLinkButton>
        ) : null}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {config ? (
          <AdminCard title="Editable settings" className="lg:col-span-2">
            <p className="text-sm leading-6 text-muted">
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
          </AdminCard>
        ) : null}
        <AdminCard title="Controls included">
          <div className="mt-4 grid gap-3">
            {primaryItems.map((item) => (
              <AdminSoftPanel key={item} className="text-sm font-semibold text-ink">
                {item}
              </AdminSoftPanel>
            ))}
          </div>
        </AdminCard>
        <AdminCard title="Next implementation steps">
          <div className="mt-4 grid gap-3">
            {nextItems.map((item) => (
              <div key={item} className="rounded-xl border border-line p-4 text-sm leading-6 text-muted">
                {item}
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </section>
  );
}
