"use client";

import { useState } from "react";
import { AdminButton } from "./admin-ui";

export function GoogleConnectButton({ disabled, connected }: { disabled: boolean; connected: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function connect() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/google-business/connect", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Connection unavailable. Check that you are signed in and try again.");
      const data = await response.json();
      const destination = new URL(data.authorizationUrl);
      if (destination.origin !== "https://accounts.google.com" || destination.pathname !== "/o/oauth2/v2/auth") throw new Error("Unexpected Google sign-in destination.");
      // Navigate after a same-origin request so the restrictive form-action CSP remains unchanged.
      window.location.assign(destination.href);
    } catch {
      setError("Could not start Google sign-in. Check that you are signed in and try again.");
      setLoading(false);
    }
  }
  return <div><AdminButton type="button" disabled={disabled} loading={loading} onClick={connect}>{connected ? "Reconnect Google account" : "Connect Google account"}</AdminButton>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</div>;
}
