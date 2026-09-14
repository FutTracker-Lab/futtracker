// Rutas de jugador centralizadas. Comentario de review en PR #9: el href a
// "editar perfil" estaba repetido como string suelto en varios archivos
// (page.tsx, [id]/page.tsx, AppSidebar.tsx) — si la ruta cambia, hay que
// acordarse de tocar los tres. Con esto se toca un solo lugar.
//
// Vive en `lib/routes.ts` y no en `lib/auth/constants.ts`: ese archivo es de
// T03a (auth), no de este ticket, y ya tiene su propio `REDIRECT_BY_ROLE`
// con la misma ruta hardcodeada — se deja así para no tocar un módulo ajeno
// sin necesidad.
export const RouteConstants = {
  profile: {
    view: (id: string) => `/jugadores/${id}`,
    mine: "/jugadores/mi-perfil",
    edit: "/jugadores/mi-perfil/editar",
  },
} as const;
