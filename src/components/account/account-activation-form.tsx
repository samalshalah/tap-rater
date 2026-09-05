"use client";

import { useState, type FormEvent } from "react";
import { PasswordField } from "@/components/account/password-field";

export function AccountActivationForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/account/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus("error");
        setMessage(body?.error ?? "Activation failed.");
        return;
      }

      window.location.href = body?.redirectTo ?? "/account";
    } catch {
      setStatus("error");
      setMessage("Unable to connect. Please try activating your account again.");
    }
  }

  return (
    <form onSubmit={activate} className="tr-card grid gap-4 p-5 md:p-7">
      <PasswordField
        label="Create password"
        required
        minLength={8}
        maxLength={200}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <button disabled={status === "loading"} className="tr-button-secondary disabled:bg-muted">
        {status === "loading" ? "Activating..." : "Activate account"}
      </button>
      {message ? <div role="alert" className="tr-status-error">{message}</div> : null}
    </form>
  );
}
