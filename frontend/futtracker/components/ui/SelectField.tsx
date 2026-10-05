import type { SelectHTMLAttributes } from "react";

type Option = {
  value: string;
  label: string;
};

// Un grupo de opciones (<optgroup>). Se distingue de una opción suelta por
// tener `options`: así el mismo prop acepta las dos formas y los formularios
// que ya usaban una lista plana no cambian.
type OptionGroup = {
  label: string;
  options: Option[];
};

function isGroup(option: Option | OptionGroup): option is OptionGroup {
  return "options" in option;
}

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: (Option | OptionGroup)[];
  // Texto de la opción vacía. Si no se pasa, el select no ofrece "sin valor".
  placeholder?: string;
  hint?: string;
  error?: string;
};

const SELECT_CLASS =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

const SELECT_ERROR_CLASS =
  "rounded-md border border-red-500 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500";

// El equivalente de TextField para los desplegables: el formulario de perfil
// tenía este mismo bloque (label + select + opciones) copiado por cada
// campo.
export default function SelectField({
  label,
  options,
  placeholder,
  hint,
  error,
  id,
  ...selectProps
}: Props) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-900">
        {label}
        {selectProps.required ? (
          <span aria-hidden="true" className="text-red-500">
            {" *"}
          </span>
        ) : null}
      </label>
      <select
        id={id}
        className={error ? SELECT_ERROR_CLASS : SELECT_CLASS}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...selectProps}
      >
        {placeholder !== undefined ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((option) =>
          isGroup(option) ? (
            <optgroup key={option.label} label={option.label}>
              {option.options.map((child) => (
                <option key={child.value} value={child.value}>
                  {child.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ),
        )}
      </select>
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
