"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { signIn, signUp } from "@/app/(auth)/actions";
import { REDIRECT_BY_ROLE, type ActionResult } from "@/lib/auth/constants";
import type { Role, SignInInput, SignUpInput } from "@/lib/auth/schemas";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";

type Tab = "sign-in" | "sign-up";

type Props = {
  initialTab?: Tab;
  redirectTo?: string;
};

const INITIAL_STATE: ActionResult = { ok: true };

// El schema compartido de T03a (lib/auth/schemas.ts) solo exige min(8). Esta
// regla más estricta es la que muestra el diseño — decisión documentada como
// comentario en FUT-84: se aplica acá además del schema compartido, nunca en
// su reemplazo, hasta que T03a la sume al backend.
const STRONG_PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).+$/;

const ERROR_MESSAGES: Record<string, string> = {
  "auth.errors.invalidInput": "Revisá los datos ingresados.",
  "auth.errors.invalidCredentials": "Email o contraseña incorrectos.",
  "auth.errors.unexpected": "Ocurrió un error inesperado. Probá de nuevo.",
};

export default function AuthForm({ initialTab = "sign-in", redirectTo }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleSignIn(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const input: SignInInput = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const result = await signIn(input);

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
    const role = formData.get("role") as Role | null;

    if (password !== confirmPassword) {
      setClientError("Las contraseñas no coinciden.");
      return INITIAL_STATE;
    }

    if (!STRONG_PASSWORD_RE.test(password)) {
      setClientError("Al menos 8 caracteres, con una mayúscula y un número.");
      return INITIAL_STATE;
    }

    if (!acceptedTerms) {
      setClientError("Tenés que aceptar los términos para continuar.");
      return INITIAL_STATE;
    }

    if (!role) {
      setClientError("Elegí cómo vas a usar FutTracker.");
      return INITIAL_STATE;
    }

    setClientError(null);

    const input: SignUpInput = {
      email: String(formData.get("email") ?? ""),
      password,
      fullName: String(formData.get("fullName") ?? ""),
      role,
    };

    const result = await signUp(input);

    if (result.ok) {
      router.push(redirectTo ?? REDIRECT_BY_ROLE[role]);
    }

    return result;
  }

  const [signInState, signInAction] = useActionState(handleSignIn, INITIAL_STATE);
  const [signUpState, signUpAction] = useActionState(handleSignUp, INITIAL_STATE);

  function switchTab(next: Tab, event: FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    setClientError(null);
    setTab(next);
  }

  const activeState = tab === "sign-in" ? signInState : signUpState;
  const errorMessage =
    clientError ?? (!activeState.ok ? ERROR_MESSAGES[activeState.error] : null);

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div role="tablist" className="flex border-b border-zinc-200">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sign-in"}
          onClick={(event) => switchTab("sign-in", event)}
          className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium ${
            tab === "sign-in" ? "border-brand text-zinc-900" : "border-transparent text-zinc-500"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sign-up"}
          onClick={(event) => switchTab("sign-up", event)}
          className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium ${
            tab === "sign-up" ? "border-brand text-zinc-900" : "border-transparent text-zinc-500"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <div className="p-6">
        {errorMessage ? (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {tab === "sign-in" ? (
          <form action={signInAction} className="flex flex-col gap-4">
            <TextField id="signin-email" name="email" type="email" label="Email" autoComplete="email" required />
            <TextField
              id="signin-password"
              name="password"
              type="password"
              label="Contraseña"
              autoComplete="current-password"
              required
            />
            <a href="/recuperar-clave" className="self-end text-sm text-brand hover:underline">
              Olvidé mi contraseña
            </a>
            <SubmitButton label="Entrar" />
          </form>
        ) : (
          <form action={signUpAction} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-zinc-900">
                ¿Cómo vas a usar FutTracker?
                <span aria-hidden="true" className="text-red-500">
                  {" *"}
                </span>
              </legend>
              <label className="block cursor-pointer">
                <input type="radio" name="role" value="player" required defaultChecked className="peer sr-only" />
                <div className="rounded-md border border-zinc-300 p-3 text-sm peer-checked:border-brand peer-checked:bg-brand-tint">
                  <p className="font-medium text-zinc-900">Como jugador</p>
                  <p className="text-zinc-500">
                    Armás tu perfil, cargás partidos y te postulás a equipos.
                  </p>
                </div>
              </label>
              <label className="block cursor-pointer">
                <input type="radio" name="role" value="delegate" className="peer sr-only" />
                <div className="rounded-md border border-zinc-300 p-3 text-sm peer-checked:border-brand peer-checked:bg-brand-tint">
                  <p className="font-medium text-zinc-900">Como delegado</p>
                  <p className="text-zinc-500">
                    Creás el equipo, publicás vacantes y recibís postulaciones.
                  </p>
                </div>
              </label>
            </fieldset>

            <TextField
              id="signup-fullname"
              name="fullName"
              type="text"
              label="Nombre completo"
              autoComplete="name"
              required
            />
            <TextField id="signup-email" name="email" type="email" label="Email" autoComplete="email" required />
            <TextField
              id="signup-password"
              name="password"
              type="password"
              label="Contraseña"
              autoComplete="new-password"
              required
              hint="Al menos 8 caracteres, con una mayúscula y un número."
            />
            <TextField
              id="signup-confirm"
              name="confirmPassword"
              type="password"
              label="Confirmar contraseña"
              autoComplete="new-password"
              required
            />

            <label className="flex items-start gap-2 text-sm text-zinc-900">
              <input type="checkbox" name="terms" className="mt-1" />
              Acepto los términos y la política de privacidad.
            </label>

            <SubmitButton label="Crear cuenta" />
            <p className="rounded-md border border-brand-tint-border bg-brand-tint px-3 py-2 text-xs text-zinc-700">
              Después de crear la cuenta vas directo a completar tu perfil: sin
              perfil no aparecés en las búsquedas.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
