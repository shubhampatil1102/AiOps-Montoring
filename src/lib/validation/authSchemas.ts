import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export interface LoginFormErrors {
  identifier?: string;
  password?: string;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const result = loginSchema.safeParse(values);
  if (result.success) return {};

  const errors: LoginFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field === "identifier" && !errors.identifier) errors.identifier = issue.message;
    if (field === "password" && !errors.password) errors.password = issue.message;
  }
  return errors;
}

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export interface ForgotPasswordFormErrors {
  email?: string;
}

export function validateForgotPasswordForm(values: ForgotPasswordFormValues): ForgotPasswordFormErrors {
  const result = forgotPasswordSchema.safeParse(values);
  if (result.success) return {};

  const errors: ForgotPasswordFormErrors = {};
  for (const issue of result.error.issues) {
    if (issue.path[0] === "email" && !errors.email) errors.email = issue.message;
  }
  return errors;
}
