import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/nav/AppShell";
import { getPlayerAccess } from "@/lib/auth/playerAccess";
import { RouteConstants } from "@/lib/routes";

// Acá y no solo en page.tsx: dentro del Suspense de loading.tsx el notFound() sale con status 200.
export default async function SuggestionsLayout({ children }: LayoutProps<"/sugerencias">) {
  const access = await getPlayerAccess();

  if (access === "signedOut") {
    redirect(`/login?redirectTo=${RouteConstants.suggestions}`);
  }

  if (access === "notPlayer") {
    notFound();
  }

  return <AppShell>{children}</AppShell>;
}
