"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/app/(auth)/actions";
import type { ActionResult } from "@/lib/auth/constants";
import type { RequestPasswordResetInput } from "@/lib/auth/schemas";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";

const INITIAL_STATE: ActionResult = { ok: true };

const ERROR_MESSAGES: Record<string, string> = {
  "auth.errors.invalidInput": "Revisá los datos ingresados.",
  "auth.errors.unexpected": "Ocurrió un error inesperado. Probá de nuevo.",
};

export default function RequestPasswordResetForm() {
  async function handleSubmit(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const input: RequestPasswordResetInput = {
      email: String(formData.get("email") ?? ""),
    };

    return requestPasswordReset(input);
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);

  // Requisito 4: el mensaje es exactamente el mismo exista o no la cuenta —
  // `requestPasswordReset` siempre devuelve `ok: true` del lado del server
  // (ver docs/auth.md).
  if (state.ok && state !== INITIAL_STATE) {
    return (
      <p role="status" className="text-sm text-zinc-700">
        Si el email existe, te enviamos un enlace para restablecer la
        contraseña.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField id="recover-email" name="email" type="email" label="Email" autoComplete="email" required />
      {!state.ok ? (
        <p role="alert" className="text-sm text-red-700">
          {ERROR_MESSAGES[state.error]}
        </p>
      ) : null}
      <SubmitButton label="Enviar enlace" />
    </form>
  );
}
