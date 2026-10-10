"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CustomerReviewOrder } from "@/lib/google-customer-reviews";

type ReviewApi = { load: (name: string, callback: () => void) => void; surveyoptin: { render: (order: CustomerReviewOrder) => void } };

export function GoogleCustomerReviews({ order, pending }: { order: CustomerReviewOrder | null; pending: boolean }) {
  const router = useRouter();
  const attempts = useRef(0);
  const rendered = useRef(false);
  useEffect(() => {
    if (!pending || order) return;
    const timer = setInterval(() => {
      if (++attempts.current > 12) { clearInterval(timer); return; }
      router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [pending, order, router]);

  if (!order) return null;
  return <>
    <p className="mt-5 text-sm text-muted">Google may ask whether you would like a survey about your shopping experience after delivery. Participation is optional. We share your order number, email, delivery country, and estimated delivery date with Google for this program. <a className="underline" href="/privacy-policy">Privacy policy</a></p>
    <Script id="google-customer-reviews" src="https://apis.google.com/js/platform.js" strategy="afterInteractive" onReady={() => {
      if (rendered.current || window.location.hostname !== "taprater.com") return;
      const api = (window as Window & { gapi?: ReviewApi }).gapi;
      if (!api) return;
      rendered.current = true;
      api.load("surveyoptin", () => api.surveyoptin.render(order));
    }} />
  </>;
}
