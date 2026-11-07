import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { API_URL } from "../services/api";
import type { ModelInfo } from "../types";

const TABS = ["Model", "Currency", "API"] as const;
type Tab = (typeof TABS)[number];

const ENDPOINTS = [
  ["GET", "/health", "Service and model status."],
  ["POST", "/predict", "Validate inputs, run the ANN, return the price in INR."],
  ["GET", "/exchange-rate", "The USD/INR rate in use, its source and its date."],
  ["GET", "/model-info", "Architecture, features, reported metrics."],
] as const;

export function Technology({ info }: { info: ModelInfo | null }) {
  const [tab, setTab] = useState<Tab>("Model");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const n = TABS.length;
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + n) % n;
    setTab(TABS[next]);
    refs.current[next]?.focus();
  };

  const dense = info?.architecture.filter((l) => l.type === "Dense") ?? [];
  const shape = info ? [info.input_dim, ...dense.map((l) => l.units)].join(" → ") : "26 → … → 1";

  const panels: Record<Tab, ReactNode> = {
    Model: (
      <div className="space-y-4 leading-relaxed text-ink-2">
        <p>
          A feed-forward artificial neural network built and trained in TensorFlow/Keras. It maps {info?.input_dim ?? 26} scaled features,{" "}
          <span className="tnum text-ink">{shape}</span>, to a single price.
        </p>
        <p>
          The trained model, both scalers and the feature-column list are loaded once when the API starts and are cross-checked against
          each other. If their shapes disagree, the server refuses to start rather than return a wrong price.
        </p>
        <p>The scalers are only applied, never refitted, and the model’s weights are never changed.</p>
      </div>
    ),
    Currency: (
      <div className="space-y-4 leading-relaxed text-ink-2">
        <p>
          The network was trained on prices in US dollars, so the backend converts: <span className="text-ink">INR = USD prediction × USD/INR rate</span>.
          If the model were configured to output rupees, no conversion would be applied.
        </p>
        <p>
          Rates come from Frankfurter (European Central Bank reference rates), with ExchangeRate-API as a second source. A fetched rate is
          cached for six hours.
        </p>
        <p>
          If both sources fail, the last fetched rate is reused and marked as such. If none exists, a configured fallback rate is used and
          clearly labelled. With neither, the API returns an error instead of guessing.
        </p>
      </div>
    ),
    API: (
      <div>
        <ul className="divide-y divide-line border-y border-line text-sm">
          {ENDPOINTS.map(([method, path, desc]) => (
            <li key={path} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="w-12 font-medium text-accent">{method}</span>
              <code className="text-ink">{path}</code>
              <span className="text-ink-2">{desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-2">
          This site is talking to <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">{API_URL}</code>. Interactive docs live at{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">/docs</code> on the backend.
        </p>
      </div>
    ),
  };

  return (
    <div className="grid gap-8 md:grid-cols-[13rem_1fr] md:gap-14">
      <div role="tablist" aria-label="Technology" className="flex gap-1 border-b border-line md:flex-col md:border-b-0 md:border-l">
        {TABS.map((t, i) => {
          const active = t === tab;
          return (
            <button
              key={t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t}`}
              aria-selected={active}
              aria-controls={`panel-${t}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => onKey(e, i)}
              className={`-mb-px px-4 py-2.5 text-left text-[0.95rem] transition-colors md:-ml-px md:mb-0 md:border-l-2 ${
                active ? "border-b-2 border-accent text-ink md:border-b-0" : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="max-w-2xl">
        {panels[tab]}
      </div>
    </div>
  );
}
