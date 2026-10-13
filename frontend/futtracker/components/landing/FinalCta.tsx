import CtaLink from "@/components/landing/CtaLink";
import { RouteConstants } from "@/lib/routes";

export default function FinalCta() {
  return (
    <section className="border-t border-zinc-200 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl bg-panel p-8 text-panel-foreground md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Sin perfil no aparecés en las búsquedas.
            </h2>
            <p className="mt-2 text-sm text-panel-muted">
              Después de crear la cuenta vas directo a completar tu perfil.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <CtaLink href={RouteConstants.signUp}>Crear cuenta</CtaLink>
            <CtaLink href={RouteConstants.signIn} variant="dark">
              Entrar
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
