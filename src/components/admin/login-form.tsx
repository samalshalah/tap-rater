"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });
    const body = await response.json();

    if (response.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }

    setStatus(body.error ?? "Login failed.");
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <input className="tr-input" name="email" type="email" placeholder="Admin email" required />
      <input className="tr-input" name="password" type="password" placeholder="Password" required />
      <button className="tr-button-secondary">Log in</button>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </form>
  );
}
