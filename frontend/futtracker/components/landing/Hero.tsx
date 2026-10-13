import CtaLink from "@/components/landing/CtaLink";
import ProfilePreview from "@/components/landing/ProfilePreview";
import { ArrowRightIcon } from "@/components/landing/icons";
import { RouteConstants } from "@/lib/routes";

export default function Hero() {
  return (
    <section className="bg-panel text-panel-foreground">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:pb-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-panel-active px-3 py-1 text-xs font-semibold text-panel-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-brand"
            />
            Para jugadores y equipos de fútbol amateur
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            El fútbol amateur, con perfil propio.
          </h1>
          <p className="mt-4 max-w-md text-lg text-panel-muted">
            Armá tu perfil, cargá tus partidos y dejá que los equipos de tu zona
            te encuentren.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaLink href={RouteConstants.signUp} className="w-full sm:w-auto">
              Crear cuenta
              <ArrowRightIcon />
            </CtaLink>
            <CtaLink
              href={RouteConstants.signIn}
              variant="dark"
              className="w-full sm:w-auto"
            >
              Ya tengo cuenta
            </CtaLink>
          </div>
          <p className="mt-6 text-xs text-panel-muted">
            Una cuenta sirve para jugar y para dirigir: el modo se cambia
            después.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <ProfilePreview />
        </div>
      </div>
    </section>
  );
}
