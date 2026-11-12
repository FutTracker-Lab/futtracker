import { redirect } from "next/navigation";

import { getMessagesAccess } from "@/app/mensajes/access";
import AppShell from "@/components/nav/AppShell";
import { RouteConstants } from "@/lib/routes";

// proxy.ts ya manda al login sin sesión, con la ruta exacta en `redirectTo`.
// Esto es la segunda red, por si el proxy no corrió.
export default async function MessagesLayout({ children }: LayoutProps<"/mensajes">) {
  const access = await getMessagesAccess();

  if (access.status === "signedOut") {
    redirect(`${RouteConstants.signIn}?redirectTo=${RouteConstants.messages.inbox}`);
  }

  // "unavailable" sigue: la página falla y error.tsx ofrece "Reintentar".
  return <AppShell>{children}</AppShell>;
}
