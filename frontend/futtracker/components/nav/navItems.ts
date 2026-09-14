import type { Role } from "@/lib/auth/schemas";
import { RouteConstants } from "@/lib/routes";

export type NavItem = {
  href: string;
  label: string;
};

// Data-driven a propósito (comentario del ticket, foto del kit de diseño):
// la barra lateral del diseño trae bastante más ("Trayectoria", "Buscar
// jugadores", "Convocatorias"...) que lo que existe hoy en la app. Se listan
// acá solo las rutas que ya están construidas; cada feature nueva suma su
// entrada a este array y aparece en las dos barras (la lateral de escritorio
// y la superior de mobile) sin tocar ningún componente.
export const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  player: [
    { href: RouteConstants.profile.mine, label: "Mi perfil" },
    { href: RouteConstants.profile.edit, label: "Editar perfil" },
  ],
  // El delegado no tiene "editar" fijo porque la ruta depende del id de su
  // equipo, y puede no tener ninguno todavía: "Mi equipo" resuelve los dos
  // casos (el perfil o el estado vacío que invita a crearlo).
  delegate: [{ href: RouteConstants.team.mine, label: "Mi equipo" }],
};
