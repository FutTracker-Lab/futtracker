"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { requestPasswordReset, type ActionResult } from "@/app/(auth)/actions";

const INITIAL_STATE: ActionResult = { ok: true };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
    >
      {label}
    </button>
  );
}

export default function RequestResetForm() {
  const t = useTranslations();

  async function handleSubmit(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    return requestPasswordReset({ email: formData.get("email") });
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);

  // Requisito 4: el mensaje es exactamente el mismo exista o no la cuenta —
  // `requestPasswordReset` siempre devuelve `ok: true` del lado del server.
  if (state.ok && state !== INITIAL_STATE) {
    return (
      <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
        {t("auth.recover.submitted")}
      </p>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="recover-email" className="text-sm font-medium">
          {t("auth.fields.email")}
        </label>
        <input
          id="recover-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700"
        />
      </div>
      {!state.ok ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {t(state.error)}
        </p>
      ) : null}
      <SubmitButton label={t("auth.actions.sendResetLink")} />
    </form>
  );
}
