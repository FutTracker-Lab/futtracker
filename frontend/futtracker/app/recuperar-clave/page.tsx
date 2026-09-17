import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import RequestPasswordResetForm from "@/components/auth/RequestPasswordResetForm";

// Mismo layout partido que /login (panel de marca + tarjeta blanca).
export default function RequestPasswordResetPage() {
  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-zinc-900">
            Recuperar contraseña
          </h1>
          <p className="mb-6 text-sm text-zinc-500">
            Ingresá tu email y te enviamos un enlace para restablecerla.
          </p>
          <RequestPasswordResetForm />
        </div>
      </div>
    </div>
  );
}
