import { notFound, redirect } from "next/navigation";

import { getPlayerAccess } from "@/lib/auth/playerAccess";
import AppShell from "@/components/nav/AppShell";
import { RouteConstants } from "@/lib/routes";

// Acá y no solo en page.tsx: dentro del Suspense de loading.tsx el notFound() sale con status 200.
export default async function FollowingLayout({ children }: LayoutProps<"/siguiendo">) {
  const access = await getPlayerAccess();

  if (access === "signedOut") {
    redirect(`/login?redirectTo=${RouteConstants.following}`);
  }

  if (access === "notPlayer") {
    notFound();
  }

  return <AppShell>{children}</AppShell>;
}
