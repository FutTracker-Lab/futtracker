import type { ReactNode } from "react";

import AppMobileNav from "@/components/nav/AppMobileNav";
import AppSidebar from "@/components/nav/AppSidebar";
import { roleSchema } from "@/lib/auth/schemas";
import { getProfileById } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

/**
 * El chrome de las secciones con sesión (/jugadores/**, /equipos/**): la
 * navegación más el área de contenido.
 *
 * Alto fijo al viewport y `overflow-hidden` acá, con el scroll propio en cada
 * columna: así el nav no se va hacia arriba cuando se scrollea un formulario
 * largo, y scrollear el nav no mueve el contenido. Si el scroll fuera de la
 * página entera, las dos cosas bajarían juntas.
 *
 * `h-dvh` y no `h-screen` porque en mobile `100vh` no descuenta la barra del
 * navegador y el contenido queda cortado abajo.
 *
 * proxy.ts ya exige sesión para estos segmentos, así que en la práctica
 * siempre va a haber `user`. El chequeo es el mismo chequeo optimista de UX
 * que en el resto del código, no la autorización real (esa la hacen RLS y
 * cada Server Action).
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfileById(user.id) : null;
  // `roleSchema.safeParse` en vez de castear: si el rol en `profiles` no es
  // uno de los dos válidos (dato corrupto, migración a medio camino), el
  // chrome no se renderiza en vez de reventar con un rol que no está en
  // NAV_ITEMS_BY_ROLE.
  const role = roleSchema.safeParse(profile?.role);

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      {profile && role.success ? (
        <>
          <AppMobileNav role={role.data} />
          <AppSidebar fullName={profile.full_name} role={role.data} />
        </>
      ) : null}
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
