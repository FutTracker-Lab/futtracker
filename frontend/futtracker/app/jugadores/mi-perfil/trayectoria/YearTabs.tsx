"use client";

import Link from "next/link";
import { useState } from "react";

import DeleteMatchStatButton from "@/app/jugadores/mi-perfil/trayectoria/DeleteMatchStatButton";
import ActionsMenu from "@/components/ui/ActionsMenu";
import type { YearGroup } from "@/app/jugadores/mi-perfil/trayectoria/matchStatsView";
import { formatDayMonthYear } from "@/lib/format/dates";
import { formatInteger } from "@/lib/format/numbers";
import { RouteConstants } from "@/lib/routes";

const MENU_ITEM =
  "block w-full px-3 py-1.5 text-left text-sm text-zinc-900 hover:bg-zinc-50";

type Props = {
  entryId: string;
  groups: YearGroup[];
};

// Solapas por año con tabla y subtotal (ScreenPartidos.jsx, requisito 3). La
// tabla del diseño trae una columna RESULTADO que no se implementa —
// discrepancia ya resuelta en el ticket, ver "Resuelto (2026-09-10)".
export default function YearTabs({ entryId, groups }: Props) {
  const [selectedYear, setSelectedYear] = useState(groups[0]?.year);
  const group = groups.find((g) => g.year === selectedYear) ?? groups[0];

  if (!group) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 border-b border-zinc-200">
        {groups.map((g) => (
          <button
            key={g.year}
            type="button"
            onClick={() => setSelectedYear(g.year)}
            className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium ${
              g.year === group.year
                ? "border-brand text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {g.year}
            <span className="text-xs text-zinc-400">{g.totals.matches}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-4">Fecha</th>
              <th className="pb-2 pr-4">Rival</th>
              <th className="pb-2 pr-4">Min</th>
              <th className="pb-2 pr-4">G</th>
              <th className="pb-2 pr-4">A</th>
              <th className="pb-2 pr-4">Tarjetas</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {group.matches.map((match) => (
              <tr key={match.id} className="border-t border-zinc-100">
                <td className="py-2 pr-4 text-zinc-900">
                  {formatDayMonthYear(match.match_date)}
                </td>
                <td className="py-2 pr-4 text-zinc-900">{match.opponent}</td>
                <td className="py-2 pr-4 text-zinc-600">{match.minutes_played}</td>
                <td className="py-2 pr-4 text-zinc-600">{match.goals}</td>
                <td className="py-2 pr-4 text-zinc-600">{match.assists}</td>
                <td className="py-2 pr-4 text-zinc-600">
                  {match.yellow_cards > 0 ? (
                    <span className="mr-1 inline-block h-3 w-2.5 rounded-sm bg-yellow-400" />
                  ) : null}
                  {match.red_cards > 0 ? (
                    <span className="inline-block h-3 w-2.5 rounded-sm bg-red-600" />
                  ) : null}
                  {match.yellow_cards === 0 && match.red_cards === 0 ? "—" : null}
                </td>
                <td className="py-2 text-right">
                  {/* El diseno muestra un "..." por fila, no los botones
                      sueltos: con una fila por partido, dos acciones visibles
                      en cada una compiten con los numeros de la tabla. */}
                  <div className="flex justify-end">
                    <ActionsMenu label={`Acciones del partido vs. ${match.opponent}`}>
                      <Link
                        href={RouteConstants.profile.careerMatchEdit(entryId, match.id)}
                        className={MENU_ITEM}
                      >
                        Editar
                      </Link>
                      <DeleteMatchStatButton
                        entryId={entryId}
                        matchId={match.id}
                        opponent={match.opponent}
                        matchDate={match.match_date}
                        triggerClassName={`${MENU_ITEM} text-red-700 hover:bg-red-50`}
                      />
                    </ActionsMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 font-semibold text-zinc-900">
              <td className="py-2 pr-4" colSpan={2}>
                Totales {group.year}
              </td>
              <td className="py-2 pr-4">{formatInteger(group.totals.minutes)}</td>
              <td className="py-2 pr-4">{formatInteger(group.totals.goals)}</td>
              <td className="py-2 pr-4">{formatInteger(group.totals.assists)}</td>
              <td className="py-2 pr-4" />
              <td className="py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
