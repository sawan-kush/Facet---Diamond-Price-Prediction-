import { RefreshCw } from "lucide-react";
import type { Resource } from "../hooks/useResource";
import { formatInrWhole, formatPercent, formatUsd } from "../services/format";
import type { ModelInfo, RateInfo } from "../types";
import { ArchitectureStack } from "./ArchitectureStack";
import { MetricCard } from "./MetricCard";

interface Props {
  info: Resource<ModelInfo>;
  rate: RateInfo | null;
}

export function ModelAnalytics({ info, rate }: Props) {
  if (info.loading && !info.data) return <div className="shimmer h-64 rounded-2xl" aria-busy="true" />;
  if (info.error || !info.data) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/50 p-8">
        <p className="font-serif text-xl text-ink">Model details unavailable</p>
        <p className="mt-2 text-[0.95rem] text-ink-2">{info.error?.message ?? "No response from the service."}</p>
        <button type="button" onClick={info.reload} className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-sm text-ink hover:bg-ink hover:text-bg">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  const m = info.data.reported_metrics;
  const cur = info.data.output_currency;
  const money = (v: number) => (cur === "USD" ? formatUsd(v) : formatInrWhole(v));
  const inr = (v: number) => (cur === "USD" && rate ? ` ≈ ${formatInrWhole(v * rate.rate)} at ₹${rate.rate.toFixed(2)}/US$` : "");
  const gap = m ? Math.abs(m.train_r2 - m.test_r2) * 100 : null;

  return (
    <div className="space-y-14">
      <div>
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-2">
          Historical evaluation on a held-out test set, reported when the model was trained. These figures describe the network;
          they are not computed from the valuation you run above.
        </p>
        {m ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Test R²" value={formatPercent(m.test_r2)} caption="Share of price variation explained on unseen stones." />
              <MetricCard label="Training R²" value={formatPercent(m.train_r2)} caption="Same measure on the data the model learned from." />
              <MetricCard label="Mean absolute error" value={money(m.mae)} caption={<>Typical miss per stone.{inr(m.mae)}</>} />
              <MetricCard label="Root mean squared error" value={money(m.rmse)} caption={<>Penalises large misses more.{inr(m.rmse)}</>} />
            </div>
            {gap !== null && (
              <p className="mt-4 text-sm text-ink-2">
                Training and test R² differ by {gap.toFixed(2)} percentage points, so the network shows no sign of heavy overfitting.
                Error figures are in {cur === "USD" ? "US dollars, the currency the model was trained on" : "rupees"}.
              </p>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-sm text-ink-2">
            No reported metrics file (<code>backend/artifacts/metrics.json</code>) was found.
          </p>
        )}
      </div>

      <div className="grid gap-10 border-t border-line pt-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <div>
          <h3 className="font-serif text-2xl text-ink">Architecture</h3>
          <p className="mb-6 mt-2 text-sm text-ink-2">Read from the loaded model, layer by layer.</p>
          <ArchitectureStack inputDim={info.data.input_dim} layers={info.data.architecture} totalParams={info.data.total_params} />
        </div>
        <div>
          <h3 className="font-serif text-2xl text-ink">Model information</h3>
          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            {[
              ["Framework", info.data.framework],
              ["Input features", `${info.data.input_dim} (6 numeric, ${info.data.input_dim - 6} one-hot)`],
              ["Output", `1 value, price in ${cur}`],
              ["Preprocessing", "One-hot encoding + StandardScaler"],
              ["Target scaling", `StandardScaler (mean ${info.data.target_scaler.mean.toFixed(0)}, std ${info.data.target_scaler.std.toFixed(0)})`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-3">
                <dt className="text-ink-2">{k}</dt>
                <dd className="text-right text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}