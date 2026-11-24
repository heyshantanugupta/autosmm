"use client";

interface Props<T extends string> {
  label: string;
  value: T;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (next: T) => void;
}

/** A small row of buttons for switching between parts of one page. */
export default function SubNav<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="subnav" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" disabled={o.disabled} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
