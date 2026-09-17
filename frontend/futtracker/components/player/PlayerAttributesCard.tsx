import type { Player } from "@/lib/data/players";
import { calculateAge } from "@/lib/format/age";
import { getPositionLabel, getPreferredFootLabel } from "@/lib/format/playerLabels";

type Props = {
  player: Player;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 py-2 last:border-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

/**
 * Columna derecha del diseño. Ahí va "Dónde juega" con una cancha y la
 * posición principal más la alternativa, pero `players.position` es una sola
 * columna: no hay posición alternativa que dibujar, y una cancha con un solo
 * punto no dice más que el badge que ya está en el encabezado.
 *
 * Hasta que exista ese dato, la columna muestra la ficha en una lista de
 * etiqueta y valor, que es lo mismo que tenía la pantalla pero ubicado donde
 * el diseño lo pide.
 */
export default function PlayerAttributesCard({ player }: Props) {
  const age = calculateAge(player.birth_date);
  const location = [player.city, player.province].filter(Boolean).join(", ");

  return (
    <section
      aria-labelledby="ficha-heading"
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 id="ficha-heading" className="text-lg font-semibold text-zinc-900">
        Ficha
      </h2>
      <p className="mb-2 text-sm text-zinc-500">
        Lo que ven los delegados cuando te buscan.
      </p>

      <dl>
        <Row label="Posición" value={getPositionLabel(player.position) ?? "—"} />
        <Row
          label="Pierna hábil"
          value={getPreferredFootLabel(player.preferred_foot) ?? "—"}
        />
        <Row label="Edad" value={age !== null ? `${age} años` : "—"} />
        <Row
          label="Altura"
          value={player.height_cm ? `${player.height_cm} cm` : "—"}
        />
        <Row label="Peso" value={player.weight_kg ? `${player.weight_kg} kg` : "—"} />
        <Row label="Ubicación" value={location || "—"} />
      </dl>
    </section>
  );
}
