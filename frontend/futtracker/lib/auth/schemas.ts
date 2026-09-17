import { z } from "zod";

export const roleSchema = z.enum(["player", "delegate"]);

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: roleSchema,
});

export const signInSchema = z.object({
  email: z.email(),
  // min(1) y no min(8): el login no aplica la política de alta. Con min(8) una
  // password vieja más corta daría "input inválido" en vez de "credenciales
  // incorrectas", que son dos errores distinguibles desde afuera.
  password: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.email(),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8),
});

export type Role = z.infer<typeof roleSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
