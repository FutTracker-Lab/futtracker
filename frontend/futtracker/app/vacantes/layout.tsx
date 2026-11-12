import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/nav/AppShell";
import { getPlayerAccess } from "@/lib/auth/playerAccess";
import { RouteConstants } from "@/lib/routes";

// Acá y no solo en page.tsx: dentro del Suspense de loading.tsx el notFound() sale con status 200.
export default async function VacanciesLayout({ children }: LayoutProps<"/vacantes">) {
  const access = await getPlayerAccess();

  if (access === "signedOut") {
    redirect(`/login?redirectTo=${RouteConstants.vacancies.board}`);
  }

  if (access === "notPlayer") {
    notFound();
  }

  // "unavailable" sigue: la página falla y error.tsx ofrece "Reintentar".
  return <AppShell>{children}</AppShell>;
}
