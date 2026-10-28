import { listTeamFollowers, type TeamFollower } from "@/lib/data/follows";
import { getAvatarSignedUrls } from "@/lib/data/players";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TeamFollowersResult = { ok: true; followers: TeamFollower[] } | { ok: false };

export type FollowerRow = TeamFollower & { avatarUrl: string | null };

export type FollowerRowsResult = { ok: true; followers: FollowerRow[] } | { ok: false };

export function loadTeamFollowers(client: Client, teamId: string): Promise<TeamFollowersResult> {
  return listTeamFollowers(client, teamId).then(
    (followers) => ({ ok: true, followers }),
    () => ({ ok: false }),
  );
}

// Aparte de `loadTeamFollowers`: el badge se ve en todas las pestañas y las firmas solo hacen falta en esta.
export async function loadFollowerRows(
  client: Client,
  followers: Promise<TeamFollowersResult>,
): Promise<FollowerRowsResult> {
  const loaded = await followers;

  if (!loaded.ok) {
    return loaded;
  }

  const paths = loaded.followers.flatMap((follower) =>
    follower.avatar_path ? [follower.avatar_path] : [],
  );
  // Sin firma se muestran las iniciales: no vale la pena perder la lista por eso.
  const avatarUrls = await getAvatarSignedUrls(client, paths).catch(
    () => new Map<string, string>(),
  );

  return {
    ok: true,
    followers: loaded.followers.map((follower) => ({
      ...follower,
      avatarUrl: avatarUrls.get(follower.avatar_path ?? "") ?? null,
    })),
  };
}
