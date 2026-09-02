import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

const INPUT_CLASS =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

// Genérico: label + input + hint opcional, reusado por los 3 forms de auth
// (antes cada uno repetía este bloque a mano — comentario de review en PR #3).
export default function TextField({ label, hint, id, ...inputProps }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-900">
        {label}
        {inputProps.required ? (
          <span aria-hidden="true" className="text-red-500">
            {" *"}
          </span>
        ) : null}
      </label>
      <input id={id} className={INPUT_CLASS} {...inputProps} />
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </div>
  );
}
