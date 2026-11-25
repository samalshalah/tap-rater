import type { Metadata } from "next";
import { ManyLocationsForm } from "@/components/forms/many-locations-form";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Multi-Link for many locations",
  description: "Have many locations? Tell us about them and Tap Rater will set up a Multi-Link page and stands for each one.",
  alternates: { canonical: "/multi-link/many-locations" },
};

export default async function ManyLocationsPage({ searchParams }: { searchParams?: Promise<{ business?: string }> }) {
  const params = await searchParams;
  const business = typeof params?.business === "string" ? params.business.slice(0, 160) : "";
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Multi-Link"
        title="Many locations? We'll set them up for you"
        body="Tell us about your locations. We'll set up a page for each one, with its own Google review link and stands, and send you everything to approve before you pay."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <div className="tr-card p-5 md:p-7">
            <ManyLocationsForm defaultBusiness={business} />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
