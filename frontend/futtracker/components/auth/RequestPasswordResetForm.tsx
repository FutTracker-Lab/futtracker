"use client";

import { useActionState, useState } from "react";

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
  // Controlado por el mismo motivo que AuthForm.tsx (ver ese comentario):
  // un <form action={...}> no controlado se resetea apenas la action
  // termina, incluso con error de input inválido.
  const [email, setEmail] = useState("");

  async function handleSubmit(
    _prev: ActionResult,
    _formData: FormData,
  ): Promise<ActionResult> {
    const input: RequestPasswordResetInput = { email };

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
      <TextField
        id="recover-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {!state.ok ? (
        <p role="alert" className="text-sm text-red-700">
          {ERROR_MESSAGES[state.error]}
        </p>
      ) : null}
      <SubmitButton label="Enviar enlace" />
    </form>
  );
}
