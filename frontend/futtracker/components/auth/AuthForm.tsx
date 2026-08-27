"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { signIn, signUp, type ActionResult } from "@/app/(auth)/actions";
import { REDIRECT_BY_ROLE, type Role } from "@/lib/auth/schemas";

type Tab = "sign-in" | "sign-up";

type Props = {
  initialTab?: Tab;
  redirectTo?: string;
};

const INITIAL_STATE: ActionResult = { ok: true };

// El schema compartido de T03a (lib/auth/schemas.ts) solo exige min(8). Esta
// regla más estricta es la que muestra el diseño — decisión documentada como
// comentario en FUT-84 (2026-08-26): se aplica acá además del schema
// compartido, nunca en su reemplazo, hasta que T03a la sume al backend.
const STRONG_PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).+$/;

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? <Spinner /> : null}
      {label}
    </button>
  );
}

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

const REQUIRED_MARK = " *";

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-red-500">
      {REQUIRED_MARK}
    </span>
  );
}

export default function AuthForm({ initialTab = "sign-in", redirectTo }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleSignIn(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const result = await signIn({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (result.ok) {
      router.push(redirectTo ?? result.redirectTo ?? "/");
    }

    return result;
  }

  async function handleSignUp(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const acceptedTerms = formData.get("terms") === "on";

    if (password !== confirmPassword) {
      setClientError(t("auth.validation.passwordMismatch"));
      return INITIAL_STATE;
    }

    if (!STRONG_PASSWORD_RE.test(password)) {
      setClientError(t("auth.validation.passwordWeak"));
      return INITIAL_STATE;
    }

    if (!acceptedTerms) {
      setClientError(t("auth.validation.termsRequired"));
      return INITIAL_STATE;
    }

    setClientError(null);

    const role = formData.get("role") as Role | null;
    const result = await signUp({
      email: formData.get("email"),
      password,
      fullName: formData.get("fullName"),
      role,
    });

    if (result.ok) {
      const destination = redirectTo ?? (role ? REDIRECT_BY_ROLE[role] : "/");
      router.push(destination);
    }

    return result;
  }

  const [signInState, signInAction] = useActionState(
    handleSignIn,
    INITIAL_STATE,
  );
  const [signUpState, signUpAction] = useActionState(
    handleSignUp,
    INITIAL_STATE,
  );

  function switchTab(next: Tab, event: FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    setClientError(null);
    setTab(next);
  }

  const activeState = tab === "sign-in" ? signInState : signUpState;
  const errorMessage =
    clientError ?? (!activeState.ok ? t(activeState.error) : null);

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div role="tablist" className="flex border-b border-zinc-200">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sign-in"}
          onClick={(event) => switchTab("sign-in", event)}
          className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium ${
            tab === "sign-in"
              ? "border-brand text-zinc-900"
              : "border-transparent text-zinc-500"
          }`}
        >
          {t("auth.tabs.signIn")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sign-up"}
          onClick={(event) => switchTab("sign-up", event)}
          className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium ${
            tab === "sign-up"
              ? "border-brand text-zinc-900"
              : "border-transparent text-zinc-500"
          }`}
        >
          {t("auth.tabs.signUp")}
        </button>
      </div>

      <div className="p-6">
        {errorMessage ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}

        {tab === "sign-in" ? (
          <form action={signInAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="signin-email" className="text-sm font-medium text-zinc-900">
                {t("auth.fields.email")}
                <RequiredMark />
              </label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="signin-password" className="text-sm font-medium text-zinc-900">
                {t("auth.fields.password")}
                <RequiredMark />
              </label>
              <input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </div>
            <a
              href="/recuperar-clave"
              className="self-end text-sm text-brand hover:underline"
            >
              {t("auth.actions.forgotPassword")}
            </a>
            <SubmitButton label={t("auth.actions.signIn")} />
          </form>
        ) : (
          <form action={signUpAction} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-zinc-900">
                {t("auth.fields.roleLabel")}
                <RequiredMark />
              </legend>
              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="player"
                  required
                  defaultChecked
                  className="peer sr-only"
                />
                <div className="rounded-md border border-zinc-300 p-3 text-sm peer-checked:border-brand peer-checked:bg-brand-tint">
                  <p className="font-medium text-zinc-900">{t("auth.fields.roleplayer")}</p>
                  <p className="text-zinc-500">
                    {t("auth.fields.roleplayerDescription")}
                  </p>
                </div>
              </label>
              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="delegate"
                  className="peer sr-only"
                />
                <div className="rounded-md border border-zinc-300 p-3 text-sm peer-checked:border-brand peer-checked:bg-brand-tint">
                  <p className="font-medium text-zinc-900">{t("auth.fields.roledelegate")}</p>
                  <p className="text-zinc-500">
                    {t("auth.fields.roledelegateDescription")}
                  </p>
                </div>
              </label>
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor="signup-fullname" className="text-sm font-medium text-zinc-900">
                {t("auth.fields.fullName")}
                <RequiredMark />
              </label>
              <input
                id="signup-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="signup-email" className="text-sm font-medium text-zinc-900">
                {t("auth.fields.email")}
                <RequiredMark />
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="signup-password" className="text-sm font-medium text-zinc-900">
                {t("auth.fields.password")}
                <RequiredMark />
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={inputClass}
              />
              <span className="text-xs text-zinc-500">
                {t("auth.hints.password")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="signup-confirm" className="text-sm font-medium text-zinc-900">
                {t("auth.fields.confirmPassword")}
                <RequiredMark />
              </label>
              <input
                id="signup-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-zinc-900">
              <input type="checkbox" name="terms" className="mt-1" />
              {t("auth.terms")}
            </label>
            <SubmitButton label={t("auth.actions.signUp")} />
            <p className="rounded-md border border-brand-tint-border bg-brand-tint px-3 py-2 text-xs text-zinc-700">
              {t("auth.signUpNotice")}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
