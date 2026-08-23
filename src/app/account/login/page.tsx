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
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-[0.85fr_1.15fr] md:px-6 md:py-16">
        <div className="space-y-4">
          <p className="text-sm font-black uppercase text-brand">Customer account</p>
          <h1 className="text-4xl font-black leading-tight text-ink">Log in to Tap Rater</h1>
          <p className="text-lg leading-8 text-muted">
            Get a secure email link to edit your business information, links, logo, style, and permanent Tap Rater page.
          </p>
        </div>
        <AccountLoginForm token={token} />
      </section>
    </main>
  );
}
