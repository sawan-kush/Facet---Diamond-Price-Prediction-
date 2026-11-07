import { useEffect, useMemo, useRef } from "react";

/**
 * A round brilliant seen from above, drawn from its real facet structure:
 * 1 table, 8 star facets, 8 kite (bezel) facets and 16 upper-girdle facets.
 * Light slowly orbits the stone; moving the pointer over it steers the light.
 * Dimension lines echo the inputs of the valuation form.
 */

const CX = 200;
const CY = 215;
const R = 158; // girdle radius
const TABLE = 0.55 * R;
const STAR = 0.8 * R;

type Facet = { points: string; angle: number; weight: number; jitter: number };

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180; // 0° points straight up
const pt = (deg: number, r: number): [number, number] => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
const poly = (...pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
const mid = (a: number, b: number) => a + (b - a) / 2;

function buildFacets(): Facet[] {
  const facets: Facet[] = [];
  const add = (points: string, angle: number, weight: number) =>
    facets.push({ points, angle, weight, jitter: Math.sin(facets.length * 2.399) * 0.14 });

  // Table (octagon)
  add(poly(...Array.from({ length: 8 }, (_, k) => pt(45 * k, TABLE))), 0, 0);
  for (let k = 0; k < 8; k++) {
    const a = 45 * k;
    const next = a + 45;
    const half = a + 22.5;
    const V = pt(a, TABLE);
    const Vn = pt(next, TABLE);
    const A = pt(half, STAR); // star apex
    const G = pt(a, R);
    const Gn = pt(next, R);
    const H = pt(half, R);
    // Star facet: triangle on the table edge
    add(poly(V, Vn, A), half, 1);
    // Kite facet: table vertex -> neighbouring star apexes -> girdle point
    const Ap = pt(a - 22.5, STAR);
    add(poly(V, Ap, G, A), a, 2);
    // Two upper-girdle facets per star apex
    add(poly(A, G, H), mid(a, half), 3);
    add(poly(A, H, Gn), mid(half, next), 3);
  }
  return facets;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

type RGB = [number, number, number];
const SHADOW: RGB = [43, 46, 51];
const MID: RGB = [134, 140, 148];
const LIGHT: RGB = [233, 234, 236];
const CHAMPAGNE: RGB = [214, 188, 132];
// Interpolate in RGB (not HSL) so silver -> champagne never passes through odd hues.
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function shade(f: Facet, light: number): string {
  const facing = 0.5 + 0.5 * Math.cos(((f.angle - light) * Math.PI) / 180);
  // The table reads as a flatter, brighter plane; outer facets carry more contrast.
  const contrast = f.weight === 0 ? 0.3 : 0.42 + f.weight * 0.1;
  const i = clamp01(0.5 + (facing - 0.5) * contrast * 2 + f.jitter + (f.weight === 0 ? 0.14 : 0));
  const base = i < 0.55 ? mix(SHADOW, MID, i / 0.55) : mix(MID, LIGHT, (i - 0.55) / 0.45);
  const [r, g, b] = mix(base, CHAMPAGNE, smooth(0.86, 1, i) * 0.6);
  return `rgb(${r.toFixed(0)} ${g.toFixed(0)} ${b.toFixed(0)})`;
}

export function DiamondHero() {
  const facets = useMemo(buildFacets, []);
  const refs = useRef<(SVGPolygonElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paint = (light: number) => facets.forEach((f, i) => refs.current[i]?.setAttribute("fill", shade(f, light)));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paint(-50);
      return;
    }

    let light = -50;
    let target: number | null = null;
    let lastPointer = 0;
    let raf = 0;
    let prev = performance.now();

    const onMove = (e: PointerEvent) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * (CY / 440));
      target = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      lastPointer = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (target !== null && now - lastPointer < 2200) {
        let d = ((target - light + 540) % 360) - 180; // shortest way round
        light += d * Math.min(1, dt * 7);
      } else {
        light += dt * 11; // idle orbit, ~33 s per revolution
      }
      paint(light);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [facets]);

  return (
    <div ref={wrap} className="mx-auto w-full max-w-[26rem] select-none">
      <svg
        viewBox="0 0 400 440"
        role="img"
        aria-label="Top view of a round brilliant diamond with its table width and girdle diameter marked"
        className="h-auto w-full overflow-visible"
      >
        <g strokeLinejoin="round">
          {facets.map((f, i) => (
            <polygon
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              points={f.points}
              fill={shade(f, -50)}
              stroke="var(--bg)"
              strokeWidth="1.1"
              strokeOpacity="0.8"
            />
          ))}
        </g>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-strong)" strokeWidth="1" />

        {/* Table width */}
        <g stroke="var(--ink-2)" strokeWidth="1" fill="none">
          <line x1={CX - TABLE} y1="34" x2={CX + TABLE} y2="34" />
          <line x1={CX - TABLE} y1="29" x2={CX - TABLE} y2="39" />
          <line x1={CX + TABLE} y1="29" x2={CX + TABLE} y2="39" />
          <line x1={CX - TABLE} y1="39" x2={CX - TABLE} y2={CY - TABLE * 0.92} strokeDasharray="2 4" stroke="var(--line-strong)" />
          <line x1={CX + TABLE} y1="39" x2={CX + TABLE} y2={CY - TABLE * 0.92} strokeDasharray="2 4" stroke="var(--line-strong)" />
        </g>
        <text x={CX} y="22" textAnchor="middle" fontSize="11.5" fill="var(--ink-2)" fontFamily="var(--font-sans)">
          Table %
        </text>

        {/* Girdle diameter */}
        <g stroke="var(--ink-2)" strokeWidth="1" fill="none">
          <line x1={CX - R} y1="400" x2={CX + R} y2="400" />
          <line x1={CX - R} y1="395" x2={CX - R} y2="405" />
          <line x1={CX + R} y1="395" x2={CX + R} y2="405" />
        </g>
        <text x={CX} y="422" textAnchor="middle" fontSize="11.5" fill="var(--ink-2)" fontFamily="var(--font-sans)">
          Length × width (mm)
        </text>
      </svg>
    </div>
  );
}
