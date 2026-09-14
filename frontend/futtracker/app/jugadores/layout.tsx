import AppSidebar from "@/components/nav/AppSidebar";
import { roleSchema } from "@/lib/auth/schemas";
import { getProfileById } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

// El sidebar solo aplica acá adentro (/jugadores/**), no en "/" ni en
// /login — corrección de review: antes vivía en el layout raíz y aparecía
// en toda la app. proxy.ts ya exige sesión para este segmento, así que en
// la práctica siempre va a haber `user`; el chequeo sigue siendo el mismo
// chequeo optimista de UX que en el resto del código, no la autorización
// real (esa la hacen RLS y cada Server Action).
export default async function JugadoresLayout({
  children,
}: LayoutProps<"/jugadores">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfileById(user.id) : null;
  // `roleSchema.safeParse` en vez de castear: si el rol en `profiles` no es
  // uno de los dos válidos (dato corrupto, migración a medio camino), el
  // sidebar no se renderiza en vez de reventar con un rol que no está en
  // NAV_ITEMS_BY_ROLE.
  const role = roleSchema.safeParse(profile?.role);

  return (
    <div className="flex min-h-full flex-1">
      {profile && role.success ? (
        <AppSidebar fullName={profile.full_name} role={role.data} />
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
