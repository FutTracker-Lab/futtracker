import FollowButton from "@/components/team/FollowButton";
import { isFollowing } from "@/lib/data/follows";
import { getProfileById } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

export default async function TeamFollowControl({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  let following: boolean;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = user ? await getProfileById(user.id) : null;

    if (profile?.role !== "player") {
      return null;
    }

    following = await isFollowing(supabase, teamId);
  } catch {
    return null;
  }

  return <FollowButton teamId={teamId} teamName={teamName} following={following} />;
}
