import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { getProfileById } from "@/lib/data/profiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// Acá y no en page.tsx: dentro del Suspense de loading.tsx el notFound() sale con status 200.
export default async function PlayerSearchLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.search}`);
  }

  const profile = await getProfileById(user.id);

  if (profile?.role !== "delegate") {
    notFound();
  }

  return children;
}
