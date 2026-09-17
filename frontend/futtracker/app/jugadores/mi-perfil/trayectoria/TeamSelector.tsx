"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type TeamOption = { id: string; name: string; city: string | null };

type Props = {
  // El club es siempre texto libre (requisito 2): esto solo ayuda a
  // encontrar un equipo ya dado de alta en FutTracker y a linkear la etapa a
  // su perfil (mismo criterio que `getClubHref` en careerTimelineView.ts).
  value: string | null;
  label: string;
  onSelect: (team: TeamOption | null) => void;
};

const DEBOUNCE_MS = 300;

/**
 * Selector opcional de equipo. Llamada del cliente y no Server Action (nota
 * técnica del ticket): es una búsqueda mientras se tipea, y una Server Action
 * por tecla sería una vuelta al servidor por cada letra.
 */
export default function TeamSelector({ value, label, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TeamOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Nada de `setOptions([])` acá: un setState sincrónico dentro del efecto
    // dispara un render en cascada (lo marca el lint del repo). Con menos de
    // dos letras simplemente no se busca, y la lista se filtra al renderizar
    // — ver `visibleOptions`.
    if (query.trim().length < 2) {
      return;
    }

    // `setIsSearching(true)` va adentro del timeout y no acá por lo mismo que
    // arriba, y además es más honesto: durante los 300 ms de debounce todavía
    // no se está buscando nada, se está esperando a que el usuario deje de
    // tipear.
    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      const { data } = await createClient()
        .from("teams")
        .select("id, name, city")
        .ilike("name", `%${query.trim()}%`)
        .limit(10);

      setOptions(data ?? []);
      setIsSearching(false);
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  // Derivado y no estado: si la consulta quedó corta (el usuario borró lo que
  // había escrito), las opciones viejas no se muestran aunque sigan en el
  // estado. Evita tener que limpiarlas desde el efecto.
  const visibleOptions = query.trim().length < 2 ? [] : options;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="team-selector" className="text-sm font-medium text-zinc-900">
        {label}
      </label>
      <input
        id="team-selector"
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (value) {
            onSelect(null);
          }
        }}
        placeholder={
          value ? "Equipo vinculado — buscá para cambiarlo" : "Buscá un equipo…"
        }
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
      {isSearching ? (
        <p className="text-xs text-zinc-500">Buscando…</p>
      ) : visibleOptions.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-sm">
          {visibleOptions.map((team) => (
            <li key={team.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(team);
                  setQuery("");
                  setOptions([]);
                }}
                className="w-full rounded px-2 py-1 text-left text-zinc-900 hover:bg-brand-tint"
              >
                {team.name}
                {team.city ? (
                  <span className="text-zinc-500"> · {team.city}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-zinc-500">
        {value
          ? "Etapa vinculada a un equipo de FutTracker."
          : "Opcional: si tu club está en FutTracker, la etapa queda linkeada a su perfil."}
      </p>
    </div>
  );
}
