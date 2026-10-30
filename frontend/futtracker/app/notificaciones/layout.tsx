import { redirect } from "next/navigation";

import AppShell from "@/components/nav/AppShell";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// proxy.ts ya manda al login sin sesión. Esto es la segunda red, por si el proxy no corrió.
export default async function NotificationsLayout({ children }: LayoutProps<"/notificaciones">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${RouteConstants.signIn}?redirectTo=${RouteConstants.notifications.list}`);
  }

  return <AppShell>{children}</AppShell>;
}
