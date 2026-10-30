import { getFollowerCount, listTeamFollowers, type TeamFollower } from "@/lib/data/follows";
import { getAvatarSignedUrls } from "@/lib/data/players";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type FollowerCountResult = { ok: true; count: number } | { ok: false };

export type FollowerRow = TeamFollower & { avatarUrl: string | null };

export type FollowerRowsResult = { ok: true; followers: FollowerRow[] } | { ok: false };

// El badge sale del mismo contador que el encabezado público: la lista la corta `max_rows`.
export function loadFollowerCount(client: Client, teamId: string): Promise<FollowerCountResult> {
  return getFollowerCount(client, teamId).then(
    (count) => ({ ok: true, count }),
    () => ({ ok: false }),
  );
}

export async function loadFollowerRows(client: Client, teamId: string): Promise<FollowerRowsResult> {
  try {
    const followers = await listTeamFollowers(client, teamId);
    const paths = followers.flatMap((follower) => (follower.avatar_path ? [follower.avatar_path] : []));
    // Sin firma se muestran las iniciales: no vale la pena perder la lista por eso.
    const avatarUrls = await getAvatarSignedUrls(client, paths).catch(
      () => new Map<string, string>(),
    );

    return {
      ok: true,
      followers: followers.map((follower) => ({
        ...follower,
        avatarUrl: avatarUrls.get(follower.avatar_path ?? "") ?? null,
      })),
    };
  } catch {
    return { ok: false };
  }
}
