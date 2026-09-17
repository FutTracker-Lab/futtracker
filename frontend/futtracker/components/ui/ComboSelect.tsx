"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type OptionGroup = {
  label: string;
  options: Option[];
};

type Props = {
  id: string;
  name: string;
  label: string;
  groups: OptionGroup[];
  value: string;
  onValueChange: (value: string) => void;
  // Opción vacía, arriba de todo. Sin esto el campo no se puede dejar sin
  // valor.
  placeholder?: string;
  hint?: string;
  error?: string;
  // Cuántas opciones entran antes de que la lista tenga que scrollear.
  visibleRows?: number;
};

const ROW_HEIGHT_REM = 2;

/**
 * Desplegable propio para listas largas. Un `<select>` nativo no sirve acá:
 * el alto de su popup lo decide el navegador y no se puede acotar, así que
 * con dieciocho categorías tapaba media pantalla. `size` lo arregla pero deja
 * la lista abierta todo el tiempo, ocupando lugar en el formulario.
 *
 * Esto se abre al tocarlo como cualquier desplegable, y la lista se corta a
 * `visibleRows` con scroll.
 *
 * Sigue el patrón combobox/listbox: el foco no se mueve de la referencia
 * (el botón), y cuál opción está activa se comunica con `aria-activedescendant`.
 * Se maneja entero con teclado — flechas, Enter, Escape, Home y End.
 *
 * El valor viaja además en un input oculto, así el campo sigue estando en el
 * FormData del formulario como lo estaba con el `<select>`.
 */
export default function ComboSelect({
  id,
  name,
  label,
  groups,
  value,
  onValueChange,
  placeholder,
  hint,
  error,
  visibleRows = 5,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  // La lista aplanada es la que se recorre con las flechas: los encabezados
  // de grupo no son seleccionables.
  const flat = useMemo(() => {
    const options: Option[] = placeholder
      ? [{ value: "", label: placeholder }]
      : [];
    for (const group of groups) options.push(...group.options);
    return options;
  }, [groups, placeholder]);

  const selected = flat.find((option) => option.value === value);

  // Abrir posiciona el cursor sobre lo ya elegido. Va acá y no en un efecto:
  // un setState sincrónico dentro de un efecto dispara un render en cascada.
  function openList() {
    const index = flat.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Mantiene visible la opción activa cuando se navega con el teclado más
  // allá de las filas que entran.
  useEffect(() => {
    if (!open) return;

    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function choose(option: Option) {
    onValueChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(flat.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (flat[activeIndex]) choose(flat[activeIndex]);
        break;
    }
  }

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  // El índice de cada opción se calcula antes de renderizar: mutar un
  // contador mientras se dibuja rompe si React repite el render.
  const rows = useMemo(() => {
    const out: (
      | { kind: "group"; label: string }
      | { kind: "option"; option: Option; index: number }
    )[] = [];
    let i = -1;

    if (placeholder) {
      i += 1;
      out.push({
        kind: "option",
        option: { value: "", label: placeholder },
        index: i,
      });
    }

    for (const group of groups) {
      out.push({ kind: "group", label: group.label });
      for (const option of group.options) {
        i += 1;
        out.push({ kind: "option", option, index: i });
      }
    }

    return out;
  }, [groups, placeholder]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-900">
        {label}
      </label>

      <div ref={containerRef} className="relative">
        <input type="hidden" name={name} value={value} />

        <button
          ref={buttonRef}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 ${
            error
              ? "border-red-500 focus-visible:ring-red-500"
              : "border-zinc-300 focus-visible:ring-brand"
          } ${selected?.value ? "text-zinc-900" : "text-zinc-500"} bg-white`}
        >
          <span className="truncate">
            {selected?.label ?? placeholder ?? "Elegí una opción"}
          </span>
          <span aria-hidden="true" className="ml-2 shrink-0 text-zinc-400">
            ▾
          </span>
        </button>

        {open ? (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            style={{ maxHeight: `${visibleRows * ROW_HEIGHT_REM}rem` }}
            className="absolute z-20 mt-1 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {rows.map((row) =>
              row.kind === "group" ? (
                <li
                  key={`g-${row.label}`}
                  role="presentation"
                  className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"
                >
                  {row.label}
                </li>
              ) : (
                <li
                  key={row.option.value || "__placeholder"}
                  id={`${listId}-${row.index}`}
                  data-index={row.index}
                  role="option"
                  aria-selected={row.option.value === value}
                  // `onMouseDown` prevenido: si no, el botón pierde el foco
                  // antes de que el click llegue a resolverse.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(row.option)}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    row.option.value ? "text-zinc-900" : "text-zinc-500"
                  } ${row.index === activeIndex ? "bg-zinc-100" : ""} ${
                    row.option.value === value && row.option.value
                      ? "font-semibold"
                      : ""
                  }`}
                >
                  {row.option.label}
                </li>
              ),
            )}
          </ul>
        ) : null}
      </div>

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
