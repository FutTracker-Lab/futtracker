// Rutas centralizadas. Comentario de review en PR #9: el href a "editar
// perfil" estaba repetido como string suelto en varios archivos (page.tsx,
// [id]/page.tsx, AppSidebar.tsx) — si la ruta cambia, hay que acordarse de
// tocar los tres. Con esto se toca un solo lugar.
//
// Vive en `lib/routes.ts` y no en `lib/auth/constants.ts`: ese archivo es de
// T03a (auth), no de estos tickets, y ya tiene su propio `REDIRECT_BY_ROLE`
// con las mismas rutas hardcodeadas — se deja así para no tocar un módulo
// ajeno sin necesidad.
export const RouteConstants = {
  profile: {
    view: (id: string) => `/jugadores/${id}`,
    mine: "/jugadores/mi-perfil",
    edit: "/jugadores/mi-perfil/editar",
    // FUT-91. La CTA del estado vacío apunta a `${career}/nueva`, que crea
    // T06b: por eso la trayectoria propia cuelga de acá y no es una ruta
    // suelta.
    career: "/jugadores/mi-perfil/trayectoria",
  },
  team: {
    view: (id: string) => `/equipos/${id}`,
    mine: "/equipos/mi-equipo",
    new: "/equipos/nuevo",
    edit: (id: string) => `/equipos/${id}/editar`,
  },
} as const;
