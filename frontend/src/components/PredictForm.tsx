import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CLARITIES, CLARITY_NOTES, COLORS, COLOR_NOTES, CUTS, CUT_NOTES, DEFAULT_INPUT, NUMERIC_FIELDS, PRESETS,
} from "../constants";
import { toFormValues, validate, type FormErrors, type FormValues } from "../services/validation";
import type { ApiFieldError, DiamondInput } from "../types";
import { NumberField, SelectField } from "./Fields";

interface Props {
  loading: boolean;
  serverErrors: ApiFieldError[];
  onSubmit: (input: DiamondInput) => void;
  /** Incremented by the parent to ask the form to take focus (e.g. "Make another prediction"). */
  focusSignal: number;
}

export function PredictForm({ loading, serverErrors, onSubmit, focusSignal }: Props) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(DEFAULT_INPUT));
  const [errors, setErrors] = useState<FormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Map backend field errors (if any) onto the inputs.
  useEffect(() => {
    if (serverErrors.length === 0) return;
    const mapped: FormErrors = {};
    for (const e of serverErrors) mapped[e.field as keyof FormValues] = e.message;
    setErrors(mapped);
  }, [serverErrors]);

  useEffect(() => {
    if (focusSignal > 0) formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [focusSignal]);

  const set = <K extends keyof FormValues>(key: K, v: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { errors: errs, input } = validate(values);
    setErrors(errs);
    if (!input) {
      const first = NUMERIC_FIELDS.find((f) => errs[f.key]);
      if (first) formRef.current?.querySelector<HTMLInputElement>(`input[name="${first.key}"]`)?.focus();
      return;
    }
    onSubmit(input);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form ref={formRef} onSubmit={submit} noValidate aria-label="Diamond characteristics">
      <fieldset className="mb-8">
        <legend className="text-sm text-ink-2">Start from a sample stone</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setValues(toFormValues(p.input));
                setErrors({});
              }}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-ink"
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div role="group" aria-labelledby="group-proportions" className="border-t border-line pt-6">
        <h3 id="group-proportions" className="font-serif text-xl text-ink">Proportions</h3>
        <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          {NUMERIC_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              name={f.key}
              label={f.label}
              unit={f.unit}
              hint={f.hint}
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.key]}
              error={errors[f.key]}
              onChange={(v) => set(f.key, v)}
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="group-grades" className="mt-9 border-t border-line pt-6">
        <h3 id="group-grades" className="font-serif text-xl text-ink">Grades</h3>
        <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-3">
          <SelectField name="cut" label="Cut" value={values.cut} options={CUTS} note={CUT_NOTES[values.cut]} onChange={(v) => set("cut", v)} />
          <SelectField name="color" label="Color" value={values.color} options={COLORS} note={COLOR_NOTES[values.color]} onChange={(v) => set("color", v)} />
          <SelectField name="clarity" label="Clarity" value={values.clarity} options={CLARITIES} note={CLARITY_NOTES[values.clarity]} onChange={(v) => set("clarity", v)} />
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-w-48 items-center justify-center gap-2.5 rounded-full bg-ink px-7 py-3.5 text-[0.95rem] font-medium text-bg transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-70"
        >
          {loading && <Loader2 className="spin h-4 w-4" aria-hidden="true" />}
          {loading ? "Valuing…" : "Predict price"}
        </button>
        {errorCount > 0 && (
          <p role="alert" className="text-sm text-danger">
            {errorCount === 1 ? "1 field needs attention." : `${errorCount} fields need attention.`}
          </p>
        )}
      </div>
    </form>
  );
}
