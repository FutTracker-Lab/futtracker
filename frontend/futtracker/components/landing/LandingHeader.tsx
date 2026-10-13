import CtaLink from "@/components/landing/CtaLink";
import Logo from "@/components/landing/Logo";
import { RouteConstants } from "@/lib/routes";

export default function LandingHeader() {
  return (
    <header className="bg-panel">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <CtaLink href={RouteConstants.signIn} variant="dark">
            Entrar
          </CtaLink>
          <CtaLink href={RouteConstants.signUp}>Crear cuenta</CtaLink>
        </nav>
      </div>
    </header>
  );
}
