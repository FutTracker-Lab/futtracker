import type { Role } from "@/lib/auth/schemas";
import { RouteConstants } from "@/lib/routes";

export type NavItem = {
  href: string;
  label: string;
  // Rutas hijas que también dejan la entrada marcada como activa. Hace falta
  // cuando el href no es donde se termina parando: "Partidos cargados"
  // apunta a un índice que redirige a la etapa vigente, así que el pathname
  // final nunca coincide con el href y la entrada quedaba apagada.
  activeOn?: RegExp;
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
    {
      href: RouteConstants.profile.career,
      label: "Trayectoria",
      // El alta y la edición de etapas son parte de esta sección; los
      // partidos NO, aunque cuelguen de la misma ruta (tienen su entrada).
      activeOn: /^\/jugadores\/mi-perfil\/trayectoria(\/nueva|\/[^/]+\/editar)$/,
    },
    // FUT-92 (ScreenPartidos.jsx): "Partidos cargados" es su propia entrada
    // en el diseño. Como el CRUD de partidos cuelga de una etapa puntual, la
    // ruta es un índice que redirige a la etapa vigente (o a la más
    // reciente) — ver careerMatchesIndex en lib/routes.ts.
    {
      href: RouteConstants.profile.careerMatchesIndex,
      label: "Partidos cargados",
      activeOn: /^\/jugadores\/mi-perfil\/trayectoria\/[^/]+\/partidos(\/|$)/,
    },
  ],
  // El delegado no tiene "editar" fijo porque la ruta depende del id de su
  // equipo, y puede no tener ninguno todavía: "Mi equipo" resuelve los dos
  // casos (el perfil o el estado vacío que invita a crearlo).
  delegate: [{ href: RouteConstants.team.mine, label: "Mi equipo" }],
};


/**
 * Qué entrada del nav queda marcada para un pathname. Vive acá y no en cada
 * barra para que la lateral y la de mobile no se contradigan.
 *
 * El orden importa: `activeOn` se evalúa antes que el prefijo del href,
 * porque las rutas de partidos cuelgan de la trayectoria y si no
 * "Trayectoria" se las quedaría a todas.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (item.activeOn) return item.activeOn.test(pathname);
  return false;
}
