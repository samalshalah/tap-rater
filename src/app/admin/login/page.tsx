import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <p className="tr-eyebrow">Admin</p>
      <h1 className="mt-3 text-3xl font-black text-ink">Tap Rater admin login</h1>
      <div className="tr-card-compact mt-8 p-5">
        <LoginForm />
      </div>
    </section>
  );
}
