import { AlertTriangle, Clock } from "lucide-react";
import type { RateInfo } from "../types";

/** Says plainly whether a rate is live, stale or a configured fallback. */
export function RateStatus({ rate }: { rate: RateInfo }) {
  if (rate.is_fallback)
    return (
      <span className="inline-flex items-center gap-1.5 text-warn">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Fallback rate, live source unavailable
      </span>
    );
  if (rate.is_stale)
    return (
      <span className="inline-flex items-center gap-1.5 text-warn">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Last fetched rate, refresh failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" /> Live rate
    </span>
  );
}

interface Props {
  rate: RateInfo | null;
  loading: boolean;
  failed: boolean;
}

/** Compact pill used in the hero. */
export function RatePill({ rate, loading, failed }: Props) {
  const base = "inline-flex min-h-9 items-center gap-3 rounded-full border border-line px-4 py-2 text-sm text-ink-2";
  if (loading) return <div className={base} aria-busy="true"><span className="shimmer h-3 w-52 rounded" /></div>;
  if (failed || !rate) return <div className={base}>Live exchange rate unavailable right now</div>;
  return (
    <div className={base}>
      <RateStatus rate={rate} />
      <span className="h-3.5 w-px bg-line" aria-hidden="true" />
      <span className="tnum text-ink">
        US$1 = ₹{rate.rate.toFixed(2)}
      </span>
      <span className="hidden text-ink-2 sm:inline">· {rate.as_of}</span>
    </div>
  );
}
