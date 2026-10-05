// Panel de marca fijo del layout de auth (ver diseño: ScreenAuth.jsx). Es un
// elemento de diseño siempre oscuro, no el "dark mode" del sitio — por eso
// usa colores explícitos (bg-panel) y no la media query de prefers-color-scheme.
export default function AuthBrandPanel() {
  return (
    <div className="hidden w-full max-w-sm flex-col justify-between bg-panel p-10 text-panel-foreground md:flex">
      <div>
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
            FT
          </span>
          <span className="text-sm text-panel-muted">FutTracker · MVP</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold leading-tight">
          El fútbol amateur, con perfil propio.
        </h1>
        <p className="mb-8 text-panel-muted">
          Armá tu perfil, cargá tus partidos y dejá que los equipos de tu zona
          te encuentren.
        </p>

        <ul className="flex flex-col gap-3 text-sm">
          <li>Perfil con posiciones, trayectoria y highlights</li>
          <li>Búsqueda por posición, zona y horarios</li>
          <li>Invitaciones a pruebas y postulaciones</li>
        </ul>
      </div>

      <p className="border-t border-white/10 pt-4 text-xs text-panel-muted">
        Una cuenta sirve para jugar y para dirigir: el modo se cambia después.
      </p>
    </div>
  );
}
