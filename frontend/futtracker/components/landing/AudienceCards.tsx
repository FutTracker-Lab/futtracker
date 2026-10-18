import CtaLink from "@/components/landing/CtaLink";
import { UserIcon, UsersIcon } from "@/components/landing/icons";
import { RouteConstants } from "@/lib/routes";

export default function AudienceCards() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Para quién es
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
          Una cuenta, dos formas de usarla.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-brand-tint-border bg-brand-tint p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-brand-foreground">
              <UserIcon />
            </span>
            <h3 className="mt-4 text-xl font-bold text-zinc-900">
              Como jugador
            </h3>
            <p className="mt-2 text-sm text-zinc-700">
              Armás tu perfil, cargás partidos y te postulás a equipos.
            </p>
            <CtaLink
              href={RouteConstants.signUpPlayer}
              className="mt-5 w-full sm:w-auto"
            >
              Crear cuenta como jugador
            </CtaLink>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-surface p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white">
              <UsersIcon />
            </span>
            <h3 className="mt-4 text-xl font-bold text-zinc-900">
              Como delegado
            </h3>
            <p className="mt-2 text-sm text-zinc-700">
              Creás el equipo, publicás vacantes y recibís postulaciones.
            </p>
            <CtaLink
              href={RouteConstants.signUpDelegate}
              variant="navy"
              className="mt-5 w-full sm:w-auto"
            >
              Crear cuenta como delegado
            </CtaLink>
          </article>
        </div>
      </div>
    </section>
  );
}
