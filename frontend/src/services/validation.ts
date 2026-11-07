import { NUMERIC_FIELDS, type NumericKey } from "../constants";
import type { Clarity, Color, Cut, DiamondInput } from "../types";

export type FormValues = Record<NumericKey, string> & { cut: Cut; color: Color; clarity: Clarity };
export type FormErrors = Partial<Record<keyof FormValues, string>>;

export const toFormValues = (d: DiamondInput): FormValues => ({
  carat: String(d.carat),
  depth: String(d.depth),
  table: String(d.table),
  x: String(d.x),
  y: String(d.y),
  z: String(d.z),
  cut: d.cut,
  color: d.color,
  clarity: d.clarity,
});

/** Returns errors keyed by field, and the parsed input when everything is valid. */
export function validate(values: FormValues): { errors: FormErrors; input: DiamondInput | null } {
  const errors: FormErrors = {};
  const nums: Partial<Record<NumericKey, number>> = {};

  for (const f of NUMERIC_FIELDS) {
    const raw = values[f.key].trim();
    if (raw === "") {
      errors[f.key] = `Enter the ${f.label.toLowerCase()}.`;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      errors[f.key] = "Enter a number.";
    } else if (n < f.min || n > f.max) {
      errors[f.key] = `Must be between ${f.min} and ${f.max} ${f.unit}.`;
    } else {
      nums[f.key] = n;
    }
  }
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: { ...(nums as Record<NumericKey, number>), cut: values.cut, color: values.color, clarity: values.clarity },
  };
}
