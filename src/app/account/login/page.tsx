import { AccountLoginForm } from "@/components/account/account-login-form";

export const metadata = {
  title: "Customer Login | Tap Rater",
  description: "Log in to manage your Tap Rater Multi-Link page."
};

type LoginPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function AccountLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <main className="min-h-screen bg-soft">
      <section className="tr-container grid min-h-[calc(100vh-220px)] items-center py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
        <div className="space-y-4">
          <p className="tr-eyebrow">Customer account</p>
          <h1 className="tr-page-title">Log in to Tap Rater</h1>
          <p className="tr-body max-w-md">
            Get a secure email link to edit your business information, links, logo, style, and permanent Tap Rater page.
          </p>
        </div>
        <AccountLoginForm token={token} />
        </div>
      </section>
    </main>
  );
}
