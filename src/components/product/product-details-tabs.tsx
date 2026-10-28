"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

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

type ProductDetailsTabsProps = {
  highlights: Highlight[];
  howItWorks: HowStep[];
  specifications: Specification[];
};

type TabId = "details" | "specifications" | "how";

const allTabs: Array<{ id: TabId; label: string }> = [
  { id: "details", label: "Product details" },
  { id: "specifications", label: "Specifications" },
  { id: "how", label: "How it works" }
];

export function ProductDetailsTabs({ highlights, howItWorks, specifications }: ProductDetailsTabsProps) {
  const [selectedTab, setActiveTab] = useState<TabId>("details");
  const tabs = allTabs.filter((tab) => (tab.id !== "details" || highlights.length > 0) && (tab.id !== "specifications" || specifications.length > 0));
  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : tabs[0].id;
  const id = useId();
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight": nextIndex = (index + 1) % tabs.length; break;
      case "ArrowLeft": nextIndex = (index - 1 + tabs.length) % tabs.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = tabs.length - 1; break;
      default: return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  return (
    <section className="tr-container min-w-0" aria-label="Product information">
      <div className="md:hidden">
        <label htmlFor={`${id}-section`} className="mb-2 block text-sm font-semibold text-ink">Product information</label>
        <select
          id={`${id}-section`}
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as TabId)}
          aria-controls={`${id}-panel-${activeTab}`}
          className="h-12 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-base font-semibold text-ink focus:border-brand"
        >
          {tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
      </div>

      <div className="hidden border-b border-line md:block">
        <div role="tablist" aria-label="Product information" className="flex flex-wrap gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[tab.id] = element; }}
              id={`${id}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${id}-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`min-h-12 border-b-2 px-4 py-3 text-sm font-black transition ${
                activeTab === tab.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="min-w-0 py-7 [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          {tab.id === "details" ? (
            <div>
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

          {tab.id === "specifications" ? (
            <div>
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

            </div>
          ) : null}

          {tab.id === "how" ? (
            <div className="max-w-4xl">
              <article className="tr-card mt-4 p-5 sm:p-6">
                <p className="tr-body">{formatHowItWorksParagraph(howItWorks)}</p>
              </article>
            </div>
          ) : null}
        </div>
      ))}
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

function formatHowItWorksParagraph(steps: HowStep[]) {
  return steps.map((step) => `${step.title}: ${step.body}`).join(" ");
}
