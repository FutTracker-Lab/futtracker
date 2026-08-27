"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { updatePassword, type ActionResult } from "@/app/(auth)/actions";

const INITIAL_STATE: ActionResult = { ok: true };

// Misma regla estricta que en el alta (ver AuthForm.tsx) — decisión de
// FUT-84, pendiente de sumarse al schema compartido de T03a.
const STRONG_PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).+$/;

// Mismas clases que AuthForm.tsx — ver nota en RequestResetForm.tsx.
const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export default function UpdatePasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setClientError(t("auth.validation.passwordMismatch"));
      return INITIAL_STATE;
    }

    if (!STRONG_PASSWORD_RE.test(password)) {
      setClientError(t("auth.validation.passwordWeak"));
      return INITIAL_STATE;
    }

    setClientError(null);
    const result = await updatePassword({ password });

    if (result.ok) {
      setSucceeded(true);
      setTimeout(() => router.push("/login"), 1500);
    }

    return result;
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);
  const errorMessage = clientError ?? (!state.ok ? t(state.error) : null);

  if (succeeded) {
    return (
      <p role="status" className="text-sm text-zinc-700">
        {t("auth.updatePasswordScreen.success")}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="update-password" className="text-sm font-medium text-zinc-900">
          {t("auth.fields.password")}
        </label>
        <input
          id="update-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <span className="text-xs text-zinc-500">{t("auth.hints.password")}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="update-confirm" className="text-sm font-medium text-zinc-900">
          {t("auth.fields.confirmPassword")}
        </label>
        <input
          id="update-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <SubmitButton label={t("auth.actions.updatePassword")} />
    </form>
  );
}
