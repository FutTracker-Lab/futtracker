import Logo from "@/components/landing/Logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-6">
          <Logo tone="dark" />
          {/* Sin enlace: todavía no hay páginas de términos ni privacidad. */}
          <span className="text-zinc-600">Términos</span>
          <span className="text-zinc-600">Privacidad</span>
        </div>
        <p className="text-zinc-600">© {new Date().getFullYear()} FutTracker</p>
      </div>
    </footer>
  );
}
