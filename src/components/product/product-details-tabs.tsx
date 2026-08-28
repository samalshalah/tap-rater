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

type TabId = "details" | "specifications" | "compare" | "how";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "details", label: "Product details" },
  { id: "specifications", label: "Specifications" },
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
          <div>
            <h2 className="text-2xl font-black text-ink">Product details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {highlights.map((highlight, index) => (
                <InfoCard
                  key={highlight.title}
                  eyebrow={String(index + 1).padStart(2, "0")}
                  title={highlight.title}
                  body={highlight.body}
                />
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "specifications" ? (
          <div>
            <h2 className="text-2xl font-black text-ink">Specifications</h2>
            {specifications.length > 0 ? (
              <dl className="tr-card mt-5 overflow-hidden p-0">
                {specifications.map((specification) => (
                  <div key={specification.label} className="grid gap-2 border-b border-line px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(160px,0.6fr)_1fr] sm:gap-4 sm:px-5 sm:py-4">
                    <dt className="font-semibold text-ink">{specification.label}</dt>
                    <dd className="leading-6 text-muted">{specification.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {includedItems.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-lg font-black text-ink">Included</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {includedItems.map((item, index) => (
                    <InfoCard
                      key={item.label}
                      eyebrow={item.appliesTo === "branded" ? "Branded" : String(index + 1).padStart(2, "0")}
                      title={item.label}
                      body={item.appliesTo === "branded" ? "Included with Branded + QR." : "Included with this stand."}
                    />
                  ))}
                </div>
              </div>
            ) : null}
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

function InfoCard({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <article className="tr-process-step-card">
      <p className="text-xs font-semibold uppercase text-accent">{eyebrow}</p>
      <h3 className="mt-3 max-w-[18rem] text-[1.35rem] font-semibold leading-[1.12] text-ink sm:text-[1.45rem]">{title}</h3>
      <p className="mt-4 text-[0.95rem] leading-7 text-muted">{body}</p>
    </article>
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
