import { notFound, redirect } from "next/navigation";

import { getVacanciesAccess } from "@/app/vacantes/access";
import AppShell from "@/components/nav/AppShell";
import { RouteConstants } from "@/lib/routes";

// Acá y no solo en page.tsx: dentro del Suspense de loading.tsx el notFound() sale con status 200.
export default async function FollowingLayout({ children }: LayoutProps<"/siguiendo">) {
  const access = await getVacanciesAccess();

  if (access === "signedOut") {
    redirect(`/login?redirectTo=${RouteConstants.following}`);
  }

  if (access === "notPlayer") {
    notFound();
  }

  return <AppShell>{children}</AppShell>;
}
