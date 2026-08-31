import Link from "next/link";
import { AccountActivationForm } from "@/components/account/account-activation-form";

export const metadata = {
  title: "Activate Account | Tap Rater",
  description: "Activate your Tap Rater Multi-Link account and create your password."
};

type AccountActivatePageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function AccountActivatePage({ searchParams }: AccountActivatePageProps) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <main className="min-h-screen bg-soft">
      <section className="tr-container grid min-h-[calc(100vh-220px)] items-center py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
          <div className="space-y-4">
            <p className="tr-eyebrow">Multi-Link account</p>
            <h1 className="tr-page-title">Activate your account</h1>
            <p className="tr-body max-w-md">
              Create your password to manage your hosted Multi-Link page, links, icons, business information, and page style.
            </p>
          </div>
          {token ? (
            <AccountActivationForm token={token} />
          ) : (
            <div className="tr-card grid gap-3 p-5 md:p-7">
              <p className="font-bold text-ink">Activation link missing</p>
              <p className="tr-body">Open the activation link from your Tap Rater email, or contact support if the link expired.</p>
              <Link href="/support" className="tr-button-secondary w-fit">
                Contact support
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
