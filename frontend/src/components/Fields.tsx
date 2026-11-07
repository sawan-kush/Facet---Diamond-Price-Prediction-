import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";

const control =
  "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition-colors " +
  "placeholder:text-ink-2 focus:border-accent focus:ring-1 focus:ring-accent";

interface NumberFieldProps {
  name: string;
  label: string;
  unit: string;
  hint: string;
  value: string;
  min: number;
  max: number;
  step: number;
  error?: string;
  onChange: (v: string) => void;
}

export function NumberField({ name, label, unit, hint, value, min, max, step, error, onChange }: NumberFieldProps) {
  const id = useId();
  const describedBy = `${id}-d`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        <span className="text-xs font-normal text-ink-2">
          {min}–{max} {unit}
        </span>
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} tnum pr-11 ${error ? "border-danger" : "border-line"}`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-2">{unit}</span>
      </div>
      <p id={describedBy} className={`mt-1.5 text-xs leading-snug ${error ? "text-danger" : "text-ink-2"}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  name: string;
  label: string;
  value: T;
  options: readonly T[];
  note: string;
  onChange: (v: T) => void;
  extra?: ReactNode;
}

export function SelectField<T extends string>({ name, label, value, options, note, onChange }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          aria-describedby={`${id}-d`}
          className={`${control} cursor-pointer appearance-none border-line pr-10`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" aria-hidden="true" />
      </div>
      <p id={`${id}-d`} className="mt-1.5 text-xs leading-snug text-ink-2">
        {note}
      </p>
    </div>
  );
}
