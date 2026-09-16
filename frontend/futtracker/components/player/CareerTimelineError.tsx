// Nota técnica de FUT-91: si falla la consulta, mensaje inline con
// reintentar en vez de tumbar la página (el resto del perfil ya se
// renderizó, incluido el encabezado). No hace falta estado de cliente para
// "reintentar": un link vacío recarga la URL actual, y evita otro wrapper
// "use client" solo para esto.
export default function CareerTimelineError() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-900">
        No pudimos cargar la trayectoria.
      </p>
      <a href="" className="text-sm font-medium text-brand hover:underline">
        Reintentar
      </a>
    </div>
  );
}
