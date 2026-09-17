import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  // Mensaje de validación de este campo. Reemplaza al hint mientras está
  // presente: mostrar los dos a la vez deja al usuario leyendo la ayuda de
  // un campo que justamente está mal.
  error?: string;
  // El diseño marca los campos no obligatorios con un "opcional" gris a la
  // derecha del label, en vez de marcar los obligatorios con asterisco.
  optionalHint?: boolean;
};

const INPUT_CLASS =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

const INPUT_ERROR_CLASS =
  "rounded-md border border-red-500 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500";

// Genérico: label + input + hint/error opcional, reusado por los forms de
// auth y de perfil (antes cada uno repetía este bloque a mano — comentario
// de review en PR #3).
export default function TextField({
  label,
  hint,
  error,
  optionalHint,
  id,
  ...inputProps
}: Props) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-zinc-900">
          {label}
          {inputProps.required ? (
            <span aria-hidden="true" className="text-red-500">
              {" *"}
            </span>
          ) : null}
        </label>
        {optionalHint ? (
          <span className="text-xs text-zinc-500">opcional</span>
        ) : null}
      </div>
      <input
        id={id}
        className={error ? INPUT_ERROR_CLASS : INPUT_CLASS}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-xs text-zinc-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
