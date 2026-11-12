"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, homePathFor, requireUser, startSession } from "@/lib/auth/current";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { authenticate, markDemoWelcomeSeen, registerUser, requestPasswordReset, resetPassword } from "@/lib/services/users";
import {
  firstErrors,
  forgotPasswordSchema,
  formValues,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  safeNextPath,
  type FormState,
} from "@/lib/validation";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, ["password"]);
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000).ok) {
    return { error: "Too many sign-ups from this connection. Try again in an hour.", values };
  }
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  let user;
  try {
    user = await registerUser(parsed.data);
  } catch (e) {
    if (e instanceof DomainError && e.code === "EMAIL_TAKEN") return { fieldErrors: { email: e.message }, values };
    throw e;
  }
  await startSession(user.id);
  redirect(safeNextPath(fd.get("next")?.toString()) ?? homePathFor(user.role));
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const ip = await clientIp();
  const limited = !rateLimit(`login:${ip}`, 20, 15 * 60 * 1000).ok || !rateLimit(`login:${parsed.data.email}`, 8, 15 * 60 * 1000).ok;
  if (limited) return { error: "Too many sign-in attempts. Wait 15 minutes and try again, or reset your password.", values };

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      error:
        result.reason === "SUSPENDED"
          ? "This account has been suspended. Contact Paylink support for help."
          : "That email and password don't match. Check both and try again.",
      values,
    };
  }
  await startSession(result.user.id);
  redirect(safeNextPath(fd.get("next")?.toString()) ?? homePathFor(result.user.role));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd);
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const ip = await clientIp();
  if (!rateLimit(`forgot:${ip}`, 10, 60 * 60 * 1000).ok || !rateLimit(`forgot:${parsed.data.email}`, 3, 60 * 60 * 1000).ok) {
    return { error: "Too many reset requests. Check your inbox for the link we already sent, or try again in an hour.", values };
  }
  await requestPasswordReset(parsed.data.email);
  // Same answer whether or not the account exists.
  return { ok: true, values };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  redirect("/login?reset=1");
}

export async function dismissDemoWelcomeAction(): Promise<void> {
  const user = await requireUser();
  await markDemoWelcomeSeen(user.id);
}
