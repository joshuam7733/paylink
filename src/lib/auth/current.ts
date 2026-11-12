// Next.js glue: reads/writes the session cookie and enforces roles in pages and server actions.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "../domain/constants";
import { config } from "../config";
import { createSession, invalidateSession, validateSessionToken, type SessionUser } from "./sessions";

export const SESSION_COOKIE = "pl_session";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return validateSessionToken(jar.get(SESSION_COOKIE)?.value);
});

export async function startSession(userId: string): Promise<void> {
  const h = await headers();
  const { token, expiresAt } = await createSession(userId, h.get("user-agent"));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  await invalidateSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
}

export function homePathFor(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "SELLER") return "/dashboard";
  return "/purchases";
}

/**
 * Authoritative access check. Call it at the top of every protected page, layout and server action;
 * hiding links in the UI is never relied on for security.
 */
export async function requireUser(roles?: readonly Role[], nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  if (roles && !roles.includes(user.role as Role)) redirect("/not-authorized");
  return user;
}
