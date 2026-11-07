import type { ReactNode } from "react";

export function MetricCard({ label, value, caption }: { label: string; value: string; caption: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-6">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="serif-num mt-3 text-[2.6rem] leading-none text-ink">{value}</p>
      <p className="mt-4 text-sm leading-snug text-ink-2">{caption}</p>
    </div>
  );
}
