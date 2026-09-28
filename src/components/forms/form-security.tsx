"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { SupportFormAction } from "@/lib/support-form-security";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function useFormSecurity() {
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reset = useCallback(() => { setToken(""); setAttempt(value => value + 1); }, []);
  return { token, setToken, attempt, reset };
}

export function FormSecurity({ action, attempt, onToken }: {
  action: SupportFormAction; attempt: number; onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setError("Security check unavailable. Please try again shortly.");
    }, 10000);
    setError("");
    fetch("/api/site/form-security", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Configuration unavailable");
        const config = await response.json();
        if (!config.siteKey) throw new Error("Configuration unavailable");
        if (!controller.signal.aborted) setSiteKey(config.siteKey);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Security check unavailable. Please try again shortly."); })
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [retry]);

  useEffect(() => {
    if (!loaded || !siteKey || !container.current || !window.turnstile) return;
    onToken("");
    setError("");
    const api = window.turnstile;
    let id: string;
    try {
      id = api.render(container.current, {
        sitekey: siteKey, action, theme: "light", size: container.current.clientWidth < 300 ? "compact" : "flexible",
        "response-field": false,
        callback: (token: string) => { onToken(token); setError(""); },
        "expired-callback": () => { onToken(""); setError("Security check expired. Please retry."); },
        "error-callback": () => { onToken(""); setError("Security check failed. Please retry."); },
        "timeout-callback": () => { onToken(""); setError("Security check timed out. Please retry."); }
      });
    } catch { setError("Security check unavailable. Please retry."); }
    return () => { if (id) api.remove(id); onToken(""); };
  }, [action, attempt, loaded, onToken, retry, siteKey]);

  return <div className="min-w-0" style={{ containerType: "inline-size" }}>
    <div hidden aria-hidden="true">
      <label>Company website<input name="companyWebsite" type="text" autoComplete="off" tabIndex={-1} /></label>
    </div>
    {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive" onReady={() => setLoaded(true)}
      onError={() => { onToken(""); setError("Security check could not load. Refresh this page to try again."); }} /> : null}
    <div ref={container} className="min-h-[140px] [@container(min-width:300px)]:min-h-[65px]" aria-label="Security verification" />
    {error ? <div className="flex flex-wrap items-center gap-2 text-sm text-muted" role="status">
      <span>{error}</span>
      <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => {
        if (siteKey && !loaded) { window.location.reload(); return; }
        onToken(""); setRetry(value => value + 1);
      }}><RefreshCw size={16} aria-hidden="true" />Retry</button>
    </div> : !loaded ? <p className="text-sm text-muted" role="status">Loading security check...</p> : null}
  </div>;
}
