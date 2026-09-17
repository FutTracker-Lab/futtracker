import type { Player } from "@/lib/data/players";
import { getPreferredFootLabel } from "@/lib/format/playerLabels";

type Props = {
  player: Player;
  isOwner: boolean;
};

/**
 * Tarjeta "Presentación" del diseño: la bio y debajo unas pastillas con lo
 * que el jugador ya declaró.
 *
 * El diseño muestra pastillas como "Disponible sábados" o "Entrena de noche"
 * que hoy no tienen dónde salir — no hay campos de disponibilidad en
 * `players`. Se arman solo con lo que existe, en vez de inventar el dato.
 */
export default function PlayerPresentationCard({ player, isOwner }: Props) {
  const footLabel = getPreferredFootLabel(player.preferred_foot);

  const tags = [
    player.is_seeking_team ? "Busca equipo" : null,
    footLabel ? `Pie ${footLabel.toLowerCase()}` : null,
    player.weight_kg ? `${player.weight_kg} kg` : null,
  ].filter(Boolean) as string[];

  return (
    <section
      aria-labelledby="presentacion-heading"
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="presentacion-heading"
        className="mb-3 text-lg font-semibold text-zinc-900"
      >
        Presentación
      </h2>

      {player.bio ? (
        <p className="text-sm leading-relaxed text-zinc-700">{player.bio}</p>
      ) : (
        <p className="text-sm text-zinc-500">
          {isOwner
            ? "Todavía no escribiste tu presentación. Contá tu nivel y tu disponibilidad: es lo que evita postulaciones que no encajan."
            : "Este jugador todavía no escribió su presentación."}
        </p>
      )}

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
