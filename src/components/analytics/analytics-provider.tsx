"use client";

import Link from "next/link";
import { marketingConsent, saveMarketingConsent, syncMetaPixel, trackMetaPage } from "@/lib/meta-pixel";
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
  metaReady: false,
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
  const [marketing, setMarketing] = useState<ConsentChoice | null>(null);
  const [metaReady, setMetaReady] = useState(false);
  const lastMetaPage = useRef<string | null>(null);
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
      setMarketing(marketingConsent());
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

  useLayoutEffect(() => {
    setMetaReady(false);
    syncMetaPixel(config, () => setMetaReady(true));
    if (marketing !== "granted" || !publicPage) lastMetaPage.current = null;
  }, [config, marketing, pathname, publicPage]);
  useEffect(() => {
    if (metaReady && lastMetaPage.current !== pathname && trackMetaPage()) lastMetaPage.current = pathname;
  }, [metaReady, pathname]);

  useEffect(() => {
    if (ready && lastPage.current !== pathname && trackPageView())
      lastPage.current = pathname;
  }, [pathname, ready]);

  function choose(next: ConsentChoice, advertising: ConsentChoice = "denied") {
    const marketingSaved = saveMarketingConsent(advertising);
    setMarketing(marketingSaved ? advertising : "denied");
    if (!marketingSaved) setMetaReady(false);
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
    <AnalyticsContext.Provider value={{ ready, metaReady, configured, openPreferences }}>
      {children}
      {hydrated && (open || (publicPage && ((configured && choice === null) || (config.metaPixelId && marketing === null)))) ? (
        <section
          ref={preferences}
          tabIndex={-1}
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-0 bottom-0 z-[70] max-h-[70dvh] overflow-y-auto border-t border-line bg-white p-4 shadow-lg sm:p-5"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2
                id="analytics-consent-title"
                className="text-base font-semibold text-ink"
              >
                Your privacy choices
              </h2>
              <p className="mt-1 text-sm text-muted">
                Essential cookies keep your cart working. Optional Google Analytics measures visits; Meta receives browsing and purchase events for marketing.{" "}
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
            <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:flex-wrap">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-gray-50"
              >
                Reject optional
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
              {config.metaPixelId && !gpc ? <button type="button" onClick={() => choose("granted", "granted")} className="col-span-2 min-h-11 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-gray-50">Accept analytics and marketing</button> : null}
              {open && config.metaPixelId && !gpc ? <button type="button" onClick={() => choose("denied", "granted")} className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold">Accept marketing only</button> : null}
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
      Cookie preferences
    </button>
  );
}
