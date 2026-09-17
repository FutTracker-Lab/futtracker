"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { updatePassword } from "@/app/(auth)/actions";
import type { ActionResult } from "@/lib/auth/constants";
import type { UpdatePasswordInput } from "@/lib/auth/schemas";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";

const INITIAL_STATE: ActionResult = { ok: true };

// Misma regla estricta que en el alta (ver AuthForm.tsx) — decisión de
// FUT-84, pendiente de sumarse al schema compartido de T03a.
const STRONG_PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).+$/;

const ERROR_MESSAGES: Record<string, string> = {
  "auth.errors.invalidInput": "Revisá los datos ingresados.",
  "auth.errors.unexpected": "Ocurrió un error inesperado. Probá de nuevo.",
};

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  // Controlados por el mismo motivo que AuthForm.tsx: un <form action={...}>
  // no controlado se resetea apenas la action termina, sea éxito o error.
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(
    _prev: ActionResult,
    _formData: FormData,
  ): Promise<ActionResult> {
    if (password !== confirmPassword) {
      setClientError("Las contraseñas no coinciden.");
      return INITIAL_STATE;
    }

    if (!STRONG_PASSWORD_RE.test(password)) {
      setClientError("Al menos 8 caracteres, con una mayúscula y un número.");
      return INITIAL_STATE;
    }

    setClientError(null);

    const input: UpdatePasswordInput = { password };
    const result = await updatePassword(input);

    if (result.ok) {
      setSucceeded(true);
      setTimeout(() => router.push("/login"), 1500);
    }

    return result;
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);
  const errorMessage = clientError ?? (!state.ok ? ERROR_MESSAGES[state.error] : null);

  if (succeeded) {
    return (
      <p role="status" className="text-sm text-zinc-700">
        Contraseña actualizada. Ya podés iniciar sesión con ella.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        id="update-password"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="new-password"
        required
        hint="Al menos 8 caracteres, con una mayúscula y un número."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField
        id="update-confirm"
        name="confirmPassword"
        type="password"
        label="Confirmar contraseña"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <SubmitButton label="Guardar contraseña" />
    </form>
  );
}
