// El atributo que lleva un link para que `useUnsavedChangesGuard` lo frene si
// hay cambios sin guardar (FUT-158). Hoy lo ponen las pestañas de
// /equipos/mi-equipo.
//
// Vive acá y no en el hook porque lo usa `TeamTabs`, que es un Server
// Component: lo que exporta un módulo con "use client" llega al servidor como
// una referencia de cliente, no como el string.
export const UNSAVED_GUARD_ATTRIBUTE = "data-unsaved-guard";
