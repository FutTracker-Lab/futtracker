import FollowedTeamsSkeleton from "@/components/team/FollowedTeamsSkeleton";
import FollowingFrame from "@/components/team/FollowingFrame";

export default function FollowingLoading() {
  return (
    <FollowingFrame>
      <FollowedTeamsSkeleton />
    </FollowingFrame>
  );
}
