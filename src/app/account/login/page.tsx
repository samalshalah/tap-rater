import { AccountLoginForm } from "@/components/account/account-login-form";

export const metadata = {
  title: "Account Login",
  description: "Log in to your Tap Rater account."
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
          <p className="tr-eyebrow">Your account</p>
          <h1 className="tr-page-title">Log in to Tap Rater</h1>
          <p className="tr-body max-w-md">
            Use your email and password to access your Tap Rater workspace.
          </p>
        </div>
        <AccountLoginForm token={token} />
        </div>
      </section>
    </main>
  );
}
