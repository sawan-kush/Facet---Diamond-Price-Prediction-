import { AlertCircle, AlertTriangle, RotateCcw, WifiOff } from "lucide-react";
import type { PredictionState } from "../hooks/usePrediction";
import { formatInr, formatInrWords, formatTimestamp, formatUsd } from "../services/format";
import type { PredictionResponse } from "../types";
import { LogoMark } from "./Logo";
import { RateStatus } from "./RateBadge";

const frame = "rounded-2xl border border-line bg-surface";

export function ResultPanel({ state, onAgain }: { state: PredictionState; onAgain: () => void }) {
  return (
    // aria-live announces the outcome to screen readers when it changes
    <div aria-live="polite" aria-atomic="true" className="lg:sticky lg:top-24">
      {state.status === "idle" && <Idle />}
      {state.status === "loading" && <Loading />}
      {state.status === "error" && <ErrorState message={state.error.message} code={state.error.code} />}
      {state.status === "success" && <Result r={state.result} onAgain={onAgain} />}
    </div>
  );
}

function Idle() {
  return (
    <div className={`${frame} p-8`}>
      <LogoMark className="h-9 w-9 text-ink-2" />
      <h3 className="mt-6 font-serif text-2xl text-ink">Your estimate appears here</h3>
      <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-ink-2">
        Enter a stone’s measurements and grades, then choose Predict price. The model runs on our server and the result
        is shown in Indian rupees.
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className={`${frame} p-8`} aria-busy="true">
      <p className="text-sm text-ink-2">Running the neural network…</p>
      <div className="shimmer mt-5 h-16 w-3/4 rounded-lg" />
      <div className="shimmer mt-3 h-4 w-1/3 rounded" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-4 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, code }: { message: string; code: string }) {
  const Icon = code === "network_error" ? WifiOff : AlertCircle;
  const title =
    code === "network_error"
      ? "Service unreachable"
      : code === "exchange_rate_unavailable"
        ? "Exchange rate unavailable"
        : code === "validation_error" || code === "unsupported_input" || code === "unreliable_prediction"
          ? "These values can’t be valued"
          : "Prediction failed";
  return (
    <div role="alert" className={`${frame} border-danger/50 p-8`}>
      <Icon className="h-6 w-6 text-danger" aria-hidden="true" />
      <h3 className="mt-5 font-serif text-2xl text-ink">{title}</h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{message}</p>
      <p className="mt-4 text-sm text-ink-2">Adjust the inputs if needed and try again.</p>
    </div>
  );
}

function Result({ r, onAgain }: { r: PredictionResponse; onAgain: () => void }) {
  const words = formatInrWords(r.price_inr);
  const d = r.input;
  return (
    <div className={`${frame} reveal overflow-hidden`}>
      <div className="h-px bg-accent" aria-hidden="true" />
      <div className="p-7 sm:p-8">
        <p className="text-sm text-ink-2">Estimated value</p>
        <p className="serif-num mt-2 break-words text-[clamp(2.6rem,6.2vw,4rem)] leading-none text-ink" data-testid="price-inr">
          {formatInr(r.price_inr)}
        </p>
        {words && <p className="mt-2 text-lg text-ink-2">about {words}</p>}

        <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
          {r.converted && r.price_usd !== null && r.exchange_rate ? (
            <>
              <Row label="Model prediction" value={<span data-testid="price-usd">{formatUsd(r.price_usd)}</span>} />
              <Row label="Exchange rate" value={`US$1 = ₹${r.exchange_rate.rate.toFixed(4)}`} />
              <Row
                label="Rate source"
                value={
                  <span className="block text-right">
                    {r.exchange_rate.source}
                    <span className="block text-ink-2">Rate date: {r.exchange_rate.as_of}</span>
                    <span className="block text-ink-2">Fetched {formatTimestamp(r.exchange_rate.fetched_at)}</span>
                  </span>
                }
              />
              <Row label="Rate status" value={<RateStatus rate={r.exchange_rate} />} />
            </>
          ) : (
            <Row label="Model output" value={`${r.model_output.currency} (no conversion needed)`} />
          )}
        </dl>

        {r.exchange_rate?.note && <p className="mt-3 text-sm text-warn">{r.exchange_rate.note}</p>}

        {r.warnings.length > 0 && (
          <div className="mt-5 rounded-lg border border-warn/40 p-4 text-sm text-ink">
            <p className="flex items-center gap-2 font-medium text-warn">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Check these inputs
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
              {r.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <h4 className="mt-8 font-serif text-lg text-ink">Stone summary</h4>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Spec label="Carat" value={d.carat.toFixed(2)} />
          <Spec label="Cut" value={d.cut} />
          <Spec label="Color" value={d.color} />
          <Spec label="Clarity" value={d.clarity} />
          <Spec label="Depth / table" value={`${d.depth}% / ${d.table}%`} />
          <Spec label="Size (mm)" value={`${d.x} × ${d.y} × ${d.z}`} />
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onAgain}
            className="inline-flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-bg"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Make another prediction
          </button>
          <p className="text-xs text-ink-2">An estimate from a statistical model, not a certified appraisal.</p>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-6 py-3">
    <dt className="text-ink-2">{label}</dt>
    <dd className="tnum text-right text-ink">{value}</dd>
  </div>
);
const Spec = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-ink-2">{label}</dt>
    <dd className="tnum mt-0.5 text-ink">{value}</dd>
  </div>
);
