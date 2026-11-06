"use server";

import {
  INVALID_CREDENTIALS,
  INVALID_INPUT,
  MINIMUM_DURATION_MS,
  PASSWORD_RESET_REDIRECT,
  REDIRECT_BY_ROLE,
  SIGN_UP_REDIRECT,
  TOO_MANY_REQUESTS,
  UNEXPECTED,
  type ActionResult,
} from "@/lib/auth/constants";
import {
  requestPasswordResetSchema,
  roleSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  type RequestPasswordResetInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/auth/schemas";
import { requireSession } from "@/lib/auth/requireSession";
import { createClient } from "@/lib/supabase/server";

async function withMinimumDuration<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  const [outcome] = await Promise.all([
    // El error se captura en vez de dejarlo propagar: con un `Promise.all`
    // pelado, un rechazo cortaría antes de cumplirse el piso de tiempo.
    promise.then(
      (value) => ({ ok: true, value }) as const,
      (error: unknown) => ({ ok: false, error }) as const,
    ),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);

  if (!outcome.ok) {
    throw outcome.error;
  }

  return outcome.value;
}

// Un límite de `Authentication → Rate Limits` alcanzado: mails por hora del
// proyecto (`over_email_send_rate_limit`) o pedidos por IP
// (`over_request_rate_limit`). Los dos llegan con 429.
function isRateLimited(error: { status?: number; code?: string } | null) {
  return (
    error?.status === 429 ||
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "over_request_rate_limit"
  );
}

async function runSignUp(input: SignUpInput): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName, role: input.role },
      emailRedirectTo: SIGN_UP_REDIRECT,
    },
  });

  if (isRateLimited(error)) {
    return { ok: false, error: TOO_MANY_REQUESTS };
  }

  // Requisito 9d: un email ya registrado tiene que responder igual que uno
  // nuevo, o el formulario dice quién tiene cuenta. No sacar sin leer
  // docs/auth.md.
  if (error && error.code !== "user_already_exists") {
    return { ok: false, error: UNEXPECTED };
  }

  return { ok: true, redirectTo: REDIRECT_BY_ROLE[input.role] };
}

async function runSignIn(input: SignInInput): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  // El límite de logins es por IP, no por email: decirlo no revela qué
  // cuentas existen.
  if (isRateLimited(error)) {
    return { ok: false, error: TOO_MANY_REQUESTS };
  }

  if (error || !data.user) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = roleSchema.safeParse(profile?.role);

  if (!role.success) {
    return { ok: false, error: UNEXPECTED };
  }

  return { ok: true, redirectTo: REDIRECT_BY_ROLE[role.data] };
}

async function runRequestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<ActionResult> {
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: PASSWORD_RESET_REDIRECT,
  });

  return { ok: true };
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }

  return withMinimumDuration(runSignUp(parsed.data), MINIMUM_DURATION_MS);
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }

  return withMinimumDuration(runSignIn(parsed.data), MINIMUM_DURATION_MS);
}

export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }

  return withMinimumDuration(
    runRequestPasswordReset(parsed.data),
    MINIMUM_DURATION_MS,
  );
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: UNEXPECTED };
  }

  return { ok: true };
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: UNEXPECTED };
  }

  return { ok: true };
}

// Las subidas van del navegador a Storage: sin sesión fallarían ahí, antes de llegar a una action.
export async function ensureSessionAction(): Promise<void> {
  await requireSession();
}
