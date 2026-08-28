"use client";

import { useState } from "react";

type Highlight = {
  title: string;
  body: string;
};

type HowStep = Highlight & {
  step: number;
};

type Specification = {
  label: string;
  value: string;
};

type IncludedItem = {
  label: string;
  appliesTo?: "all" | "branded";
};

type ProductDetailsTabsProps = {
  highlights: Highlight[];
  howItWorks: HowStep[];
  specifications: Specification[];
  includedItems: IncludedItem[];
  standardPrice: string;
  brandedPrice: string;
};

type TabId = "details" | "compare" | "how";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "details", label: "Product details" },
  { id: "compare", label: "Standard vs. Branded" },
  { id: "how", label: "How it works" }
];

export function ProductDetailsTabs({ highlights, howItWorks, specifications, includedItems, standardPrice, brandedPrice }: ProductDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("details");

  return (
    <section className="tr-container">
      <div className="border-b border-line">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-black transition ${
                activeTab === tab.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="py-7">
        {activeTab === "details" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <h2 className="text-2xl font-black text-ink">Product details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {highlights.map((highlight) => (
                  <article key={highlight.title} className="tr-card p-5">
                    <h3 className="tr-card-title">{highlight.title}</h3>
                    <p className="tr-body-sm mt-3">{highlight.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              {specifications.length > 0 ? (
                <div>
                  <h3 className="text-lg font-black text-ink">Specifications</h3>
                  <dl className="tr-card mt-3 overflow-hidden p-0">
                    {specifications.map((specification) => (
                      <div key={specification.label} className="grid grid-cols-[minmax(120px,0.75fr)_1fr] gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0">
                        <dt className="font-semibold text-ink">{specification.label}</dt>
                        <dd className="leading-6 text-muted">{specification.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {includedItems.length > 0 ? (
                <div>
                  <h3 className="text-lg font-black text-ink">Included</h3>
                  <ul className="mt-3 grid gap-2">
                    {includedItems.map((item) => (
                      <li key={item.label} className="tr-card flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
                        <span>{item.label}</span>
                        {item.appliesTo === "branded" ? <span className="text-xs font-black uppercase tracking-[0.05em] text-brand">Branded</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "compare" ? (
          <div>
            <h2 className="text-2xl font-black text-ink">Standard vs. Branded</h2>
            <div className="tr-card mt-4 overflow-hidden p-0">
              <ComparisonRow label="" standard="Standard" branded="Branded" header />
              <ComparisonRow label="NFC Tap" standard="Yes" branded="Yes" />
              <ComparisonRow label="Printed QR" standard="Yes" branded="Yes" />
              <ComparisonRow label="Direct destination" standard="Yes" branded="Yes" />
              <ComparisonRow label="Ready-made design" standard="Yes" branded="No" />
              <ComparisonRow label="Your logo" standard="No" branded="Yes" />
              <ComparisonRow label="Business name" standard="No" branded="Yes" />
              <ComparisonRow label="Front proof" standard="No" branded="Yes" />
              <ComparisonRow label="Monthly subscription" standard="None" branded="None" />
              <ComparisonRow label="Price" standard={standardPrice} branded={brandedPrice} />
            </div>
          </div>
        ) : null}

        {activeTab === "how" ? (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-black text-ink">How it works</h2>
            <article className="tr-card mt-4 p-5 sm:p-6">
              <p className="tr-body">{formatHowItWorksParagraph(howItWorks)}</p>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ComparisonRow({ label, standard, branded, header = false }: { label: string; standard: string; branded: string; header?: boolean }) {
  const className = header ? "font-black text-ink" : "text-muted";
  return (
    <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] border-b border-line px-4 py-3 text-sm last:border-b-0">
      <div className={header ? "font-black text-ink" : "font-semibold text-ink"}>{label}</div>
      <div className={className}>{standard}</div>
      <div className={className}>{branded}</div>
    </div>
  );
}

function formatHowItWorksParagraph(steps: HowStep[]) {
  return steps.map((step) => `${step.title}: ${step.body}`).join(" ");
}
