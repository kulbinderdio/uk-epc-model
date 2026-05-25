"use client";

import HelpTooltip from "./HelpTooltip";

type SelectOption = string | { value: string; label: string };

interface SelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  required?: boolean;
  placeholder?: string;
  help?: React.ReactNode;
}

export function SelectField({ label, id, value, onChange, options, required, placeholder, help }: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {help && <HelpTooltip content={help} />}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        required={required}
      >
        <option value="">{placeholder ?? "Select..."}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

interface NumberProps {
  label: string;
  id: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  unit?: string;
  placeholder?: string;
  help?: React.ReactNode;
}

export function NumberField({ label, id, value, onChange, min, max, step = 1, required, unit, placeholder, help }: NumberProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {unit && <span className="text-gray-400 text-xs">({unit})</span>} {required && <span className="text-red-500">*</span>}
        {help && <HelpTooltip content={help} />}
      </label>
      <input
        type="number"
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

interface RadioProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  help?: React.ReactNode;
}

export function RadioField({ label, id, value, onChange, options, required, help }: RadioProps) {
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {help && <HelpTooltip content={help} />}
      </span>
      <div className="flex gap-4 flex-wrap">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={id}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="accent-blue-600"
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

interface NavProps {
  onBack?: () => void;
  isLast?: boolean;
  isLoading?: boolean;
}

export function FormNav({ onBack, isLast, isLoading }: NavProps) {
  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
      {onBack ? (
        <button type="button" onClick={onBack} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
          ← Back
        </button>
      ) : <div />}
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Predicting..." : isLast ? "Get EPC Rating" : "Next →"}
      </button>
    </div>
  );
}
