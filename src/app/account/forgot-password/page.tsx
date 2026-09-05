import type { Metadata } from "next";
import { AccountPasswordRecoveryForm } from "@/components/account/account-password-recovery-form";

export const metadata: Metadata = {
  title: "Forgot Password", description: "Recover access to your Tap Rater customer account.",
  robots: { index: false, follow: false }, referrer: "no-referrer"
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-soft">
      <section className="tr-container grid min-h-[calc(100vh-220px)] items-center py-8 md:py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-8">
          <div className="space-y-3">
            <p className="tr-eyebrow">Customer account</p>
            <h1 className="tr-page-title">Forgot password?</h1>
            <p className="tr-body max-w-md">Enter your account email to request a password reset.</p>
          </div>
          <AccountPasswordRecoveryForm />
        </div>
      </section>
    </main>
  );
}
