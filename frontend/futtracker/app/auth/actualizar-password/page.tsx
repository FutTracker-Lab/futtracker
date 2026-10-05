import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

// Ruta fijada por el redirect real de las Server Actions de T03a
// (PASSWORD_RESET_REDIRECT en lib/auth/constants.ts), no por el nombre
// "/actualizar-clave" del texto original del ticket — el código manda
// sobre el texto cuando difieren (confirmado en docs/auth.md, sección
// "Pendiente").
export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-xl font-semibold text-zinc-900">
            Actualizar contraseña
          </h1>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
