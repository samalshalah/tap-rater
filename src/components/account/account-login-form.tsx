"use client";

import { useEffect, useState, type FormEvent } from "react";

export function AccountLoginForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  useEffect(() => {
    if (!token) {
      return;
    }

    setStatus("loading");
    fetch("/api/account/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Login token is invalid or expired.");
        }
        window.location.href = body?.redirectTo ?? "/account";
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Login token is invalid or expired.");
      });
  }, [token]);

  async function requestLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/account/login/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Login failed.");
      return;
    }

    setStatus("success");
    window.location.href = body?.redirectTo ?? "/account";
  }

  return (
    <form onSubmit={requestLogin} className="tr-card grid gap-4 p-5 md:p-7">
      <label className="tr-field-label">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="tr-input"
          autoComplete="email"
          placeholder="owner@example.com"
        />
      </label>
      <label className="tr-field-label">
        Password
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="tr-input"
          autoComplete="current-password"
          placeholder="Enter your password"
        />
      </label>
      <button
        disabled={status === "loading"}
        className="tr-button-secondary disabled:bg-muted"
      >
        {status === "loading" ? "Logging in..." : "Log in"}
      </button>
      {message ? (
        <div className={status === "error" ? "tr-status-error" : "tr-status-success"}>
          {message}
        </div>
      ) : null}
    </form>
  );
}
