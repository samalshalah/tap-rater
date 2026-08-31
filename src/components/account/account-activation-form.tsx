"use client";

import { useState, type FormEvent } from "react";

export function AccountActivationForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

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
  }

  return (
    <form onSubmit={activate} className="tr-card grid gap-4 p-5 md:p-7">
      <label className="tr-field-label">
        Create password
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="tr-input"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>
      <button disabled={status === "loading"} className="tr-button-secondary disabled:bg-muted">
        {status === "loading" ? "Activating..." : "Activate account"}
      </button>
      {message ? <div className="tr-status-error">{message}</div> : null}
    </form>
  );
}
