import type { Metadata } from "next";
import Link from "next/link";
import { AccountPasswordRecoveryForm } from "@/components/account/account-password-recovery-form";
import { passwordResetTokenPattern } from "@/lib/customer-password-reset";

export const metadata: Metadata = {
  title: "Reset Password", description: "Choose a new password for your Tap Rater account.",
  robots: { index: false, follow: false }, referrer: "no-referrer"
};

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" && passwordResetTokenPattern.test(params.token) ? params.token : "";
  return (
    <main className="min-h-screen bg-soft">
      <section className="tr-container grid min-h-[calc(100vh-220px)] items-center py-8 md:py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-8">
          <div className="space-y-3">
            <p className="tr-eyebrow">Customer account</p>
            <h1 className="tr-page-title">Reset password</h1>
            <p className="tr-body max-w-md">Choose a new password with at least 8 characters.</p>
          </div>
          {token ? <AccountPasswordRecoveryForm token={token} /> : <div className="tr-card grid min-w-0 gap-4 p-5 md:p-7">
            <p role="alert" className="tr-status-error">This reset link is missing or invalid.</p>
            <Link href="/account/forgot-password" className="tr-button-secondary">Request a new reset link</Link>
            <Link href="/account/login" className="flex min-h-11 items-center text-sm text-teal underline underline-offset-4">Back to log in</Link>
          </div>}
        </div>
      </section>
    </main>
  );
}
