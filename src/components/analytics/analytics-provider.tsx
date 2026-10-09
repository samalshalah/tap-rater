"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  analyticsPage,
  type AnalyticsConfig,
  type ConsentChoice,
} from "@/lib/storefront-analytics";
import {
  captureAnalyticsEntry,
  browserConsent,
  saveBrowserConsent,
  syncAnalytics,
  trackPageView,
} from "@/lib/analytics-browser";

const AnalyticsContext = createContext({
  ready: false,
  configured: false,
  openPreferences: () => {},
});
export const useAnalytics = () => useContext(AnalyticsContext);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [config, setConfig] = useState<AnalyticsConfig>({
    measurementId: null,
    origin: "https://taprater.com",
  });
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [gpc, setGpc] = useState(false);
  const lastPage = useRef<string | null>(null);
  const preferences = useRef<HTMLElement>(null);
  const configured = Boolean(config.measurementId);
  const publicPage = Boolean(analyticsPage(pathname));

  useEffect(() => {
    captureAnalyticsEntry();
    let active = true;
    const refresh = () => {
      setChoice(browserConsent());
      setGpc(
        Boolean(
          (navigator as Navigator & { globalPrivacyControl?: boolean })
            .globalPrivacyControl,
        ),
      );
    };
    refresh();
    setHydrated(true);
    fetch("/api/site/analytics-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (
          active &&
          value &&
          (value.measurementId === null ||
            /^G-[A-Z0-9]{6,20}$/.test(value.measurementId)) &&
          typeof value.origin === "string"
        ) {
          if (value.internal) saveBrowserConsent("denied");
          setConfig(value);
        }
      })
      .catch(() => {});
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useLayoutEffect(() => {
    setReady(false);
    syncAnalytics(config, () => setReady(true));
    if (choice !== "granted" || !publicPage) lastPage.current = null;
  }, [config, choice, pathname, publicPage]);

  useEffect(() => {
    if (ready && lastPage.current !== pathname && trackPageView())
      lastPage.current = pathname;
  }, [pathname, ready]);

  function choose(next: ConsentChoice) {
    if (!saveBrowserConsent(next)) {
      setStorageError(true);
      setReady(false);
      setChoice("denied");
      setOpen(true);
      return;
    }
    setStorageError(false);
    setChoice(next);
    setOpen(false);
    // Revoke immediately, before React renders or another event can be dispatched.
    syncAnalytics(config, () => setReady(true));
  }

  function openPreferences() {
    setOpen(true);
    requestAnimationFrame(() => {
      preferences.current?.scrollIntoView({ block: "nearest" });
      preferences.current?.focus();
    });
  }

  return (
    <AnalyticsContext.Provider value={{ ready, configured, openPreferences }}>
      {children}
      {hydrated && (open || (publicPage && configured && choice === null)) ? (
        <section
          ref={preferences}
          tabIndex={-1}
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-0 bottom-0 z-[70] max-h-[70dvh] overflow-y-auto border-t border-line bg-white p-4 shadow-lg sm:p-5"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2
                id="analytics-consent-title"
                className="text-base font-semibold text-ink"
              >
                Your privacy choices
              </h2>
              <p className="mt-1 text-sm text-muted">
                Essential storage keeps your cart and checkout working. Optional
                Google Analytics helps us understand visits and purchases. No
                advertising tracking.{" "}
                <Link href="/privacy-policy" className="underline">
                  Privacy policy
                </Link>
              </p>
              {!configured ? (
                <p className="mt-2 text-sm text-muted">
                  Google Analytics is currently disabled.
                </p>
              ) : null}
              {gpc ? (
                <p className="mt-2 text-sm text-muted">
                  Your browser privacy signal keeps analytics off.
                </p>
              ) : null}
              {storageError ? (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  Your preference could not be saved. Analytics remains off.
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-gray-50"
              >
                Reject analytics
              </button>
              {configured && !gpc ? (
                <button
                  type="button"
                  onClick={() => choose("granted")}
                  className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-gray-50"
                >
                  Accept analytics
                </button>
              ) : null}
              {open ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-11 px-3 text-sm underline"
                >
                  Close
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </AnalyticsContext.Provider>
  );
}

export function AnalyticsPreferencesButton() {
  const { openPreferences } = useAnalytics();
  return (
    <button
      type="button"
      onClick={openPreferences}
      className="mt-2 min-h-11 text-xs underline hover:text-brand"
    >
      Analytics preferences
    </button>
  );
}
