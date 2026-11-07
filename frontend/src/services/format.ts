/** Indian-locale formatting helpers. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** ₹1,25,450.00 */
export const formatInr = (value: number): string => inr.format(value);
/** ₹1,25,450 */
export const formatInrWhole = (value: number): string => inrWhole.format(value);
/** $6,181.13 */
export const formatUsd = (value: number): string => usd.format(value);

/** "₹15.93 lakh" / "₹1.95 crore"; null below one lakh where the full figure reads fine. */
export function formatInrWords(value: number): string | null {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${trim(value / 1e7)} crore`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)} lakh`;
  return null;
}
const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

/** "6 Nov 2026, 3:42 pm" in the viewer's locale, or the raw string if it is not a date. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export const formatPercent = (fraction: number, digits = 2): string => `${(fraction * 100).toFixed(digits)}%`;
