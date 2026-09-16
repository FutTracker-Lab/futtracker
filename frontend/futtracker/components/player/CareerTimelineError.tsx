"use client";

// Nota técnica de FUT-91: si falla la consulta, mensaje inline con
// reintentar en vez de tumbar la página (el resto del perfil ya se
// renderizó, incluido el encabezado).
//
// Un <button> y no el <a href=""> original: el href vacío recarga la URL
// actual de casualidad, pero un lector de pantalla lo anuncia como link sin
// destino.
//
// `location.reload()` y no `router.refresh()`: probado contra Supabase local
// (revocando el grant de select sobre career_entries), `router.refresh()`
// deja la sección en el estado de error — el árbol servido no se vuelve a
// pedir. La recarga completa sí recupera, que es lo que el usuario espera de
// "Reintentar".
export default function CareerTimelineError() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-900">
        No pudimos cargar la trayectoria.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-sm font-medium text-brand hover:underline"
      >
        Reintentar
      </button>
    </div>
  );
}
