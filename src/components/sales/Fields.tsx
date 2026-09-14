import type { ReactNode } from "react";
export const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
export function Field({
  label,
  name,
  value = "",
  type = "text",
  required = false,
  step,
  min,
  max,
  readOnly = false,
  placeholder,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        step={step}
        min={min}
        max={max}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </label>
  );
}
export function Panel({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <h2 className="mb-5 text-xl font-semibold text-[#162334]">{title}</h2>
      {children}
    </section>
  );
}
