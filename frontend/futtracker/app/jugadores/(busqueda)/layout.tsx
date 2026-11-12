import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { getProfileById } from "@/lib/data/profiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerSearchLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.search}`);
  }

  const result = await getProfileById(user.id);

  // error.tsx no atrapa el layout de su carpeta: la falla la tira la página.
  if (result.kind === "error") {
    return children;
  }

  if (result.kind === "notFound" || result.profile.role !== "delegate") {
    notFound();
  }

  return children;
}
