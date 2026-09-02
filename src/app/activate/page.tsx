import Link from "next/link";
import { ActivationForm } from "@/components/activation/activation-form";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata = {
  title: "Activate Your Tap Rater",
  description: "Connect your Tap Rater NFC or QR stand to a review, booking, social, or business link."
};

type ActivatePageProps = {
  searchParams?: Promise<{
    device?: string;
  }>;
};

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const params = await searchParams;
  const deviceCode = typeof params?.device === "string" ? params.device : "";
  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_PLATFORM_API_KEY ||
    process.env.MAPS_PLATFORM_API_KEY;

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Tap Rater activation"
        title="Activate your Tap Rater"
        body="Connect your stand to your review, booking, or business link. Once activated, every scan of the NFC chip or QR code will use your saved destination."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
          <div className="grid gap-3 text-sm text-muted">
            <div className="rounded-md border border-line bg-white p-4">
              <p className="font-bold text-ink">What you need</p>
              <p className="mt-1">Your device code, the private activation code from your package, and the destination URL.</p>
            </div>
            <div className="rounded-md border border-line bg-white p-4">
              <p className="font-bold text-ink">No account required yet</p>
              <p className="mt-1">We will create the customer and business record in the backend without opening the full portal.</p>
            </div>
            <div className="rounded-md border border-line bg-white p-4">
              <p className="font-bold text-ink">Need help?</p>
              <Link href="/contact-us" className="mt-1 inline-block font-semibold text-brand">
                Contact Tap Rater support
              </Link>
            </div>
          </div>
        </div>

        <ActivationForm initialDeviceCode={deviceCode} googleMapsApiKey={googleMapsApiKey} />
        </div>
      </SectionShell>
    </main>
  );
}
