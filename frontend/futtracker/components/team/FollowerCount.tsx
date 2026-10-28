import { getFollowerCount } from "@/lib/data/follows";
import { followerCountLabel } from "@/lib/format/followLabels";
import { createClient } from "@/lib/supabase/server";

export default async function FollowerCount({ teamId }: { teamId: string }) {
  let count: number;

  try {
    const supabase = await createClient();
    count = await getFollowerCount(supabase, teamId);
  } catch {
    // Sin contador antes que tirar abajo la página del equipo.
    return null;
  }

  return <p className="text-sm text-zinc-500">{followerCountLabel(count)}</p>;
}
