import type { LayerInfo } from "../types";

/** Draws the network exactly as reported by the loaded model (GET /model-info). */
export function ArchitectureStack({ inputDim, layers, totalParams }: { inputDim: number; layers: LayerInfo[]; totalParams: number }) {
  const dense = layers.filter((l) => l.type === "Dense");
  const maxUnits = Math.max(...dense.map((l) => l.units ?? 1), 1);

  // Fold each Dropout layer into the Dense layer that precedes it.
  const rows = dense.map((l) => {
    const idx = layers.indexOf(l);
    const next = layers[idx + 1];
    return { ...l, dropout: next?.type === "Dropout" ? next.dropout_rate : undefined };
  });

  return (
    <div>
      <ol className="space-y-3">
        <Row label={`Input · ${inputDim} features`} detail="6 measurements + one-hot cut, color, clarity" width={Math.max(18, (inputDim / maxUnits) * 100)} muted />
        {rows.map((l, i) => {
          const isOut = i === rows.length - 1;
          const parts = [
            l.activation && l.activation !== "linear" ? l.activation.toUpperCase() : isOut ? "Linear output" : "",
            l.dropout ? `dropout ${l.dropout}` : "",
            l.l2 ? `L2 ${l.l2}` : "",
          ].filter(Boolean);
          return (
            <Row
              key={l.name}
              label={`${isOut ? "Output" : "Dense"} · ${l.units}`}
              detail={`${parts.join(" · ")}${parts.length ? " · " : ""}${l.params.toLocaleString("en-IN")} params`}
              width={Math.max(8, ((l.units ?? 1) / maxUnits) * 100)}
              accent={isOut}
            />
          );
        })}
      </ol>
      <p className="mt-5 text-sm text-ink-2 tnum">{totalParams.toLocaleString("en-IN")} trainable parameters across all layers.</p>
    </div>
  );
}

function Row({ label, detail, width, muted, accent }: { label: string; detail: string; width: number; muted?: boolean; accent?: boolean }) {
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-ink-2">{detail}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-surface-2" aria-hidden="true">
        <div
          className={`h-2 rounded-full ${accent ? "bg-accent" : muted ? "bg-line-strong" : "bg-ink"}`}
          style={{ width: `${Math.min(100, width)}%` }}
        />
      </div>
    </li>
  );
}
