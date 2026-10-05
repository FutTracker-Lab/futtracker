import SeasonMetrics from "@/components/player/SeasonMetrics";
import SeasonStatsEmptyState from "@/components/player/SeasonStatsEmptyState";
import SeasonStatsError from "@/components/player/SeasonStatsError";
import {
  groupSeasonTotalsByYear,
  type SeasonTotals,
} from "@/components/player/seasonTotalsView";
import { getSeasonStats } from "@/lib/data/stats";
import { createClient } from "@/lib/supabase/server";

type Props = {
  playerId: string;
  isOwner: boolean;
};

// try/catch y no `error.tsx`: el error no puede tumbar el encabezado del perfil.
export default async function SeasonStatsPanel({ playerId, isOwner }: Props) {
  let seasons: SeasonTotals[];

  try {
    const supabase = await createClient();
    seasons = groupSeasonTotalsByYear(await getSeasonStats(supabase, playerId));
  } catch {
    return <SeasonStatsError />;
  }

  if (seasons.length === 0) {
    return <SeasonStatsEmptyState isOwner={isOwner} />;
  }

  return <SeasonMetrics seasons={seasons} />;
}
