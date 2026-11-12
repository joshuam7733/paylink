// Framework-independent session logic (unit-tested). Cookie handling lives in ./current.ts.
import type { SellerProfile, User } from "@prisma/client";
import { config } from "../config";
import { newToken, sha256 } from "../crypto";
import { db } from "../db";

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "status" | "isDemo" | "demoWelcomeSeenAt" | "phone"> & {
  sellerProfile: Pick<SellerProfile, "businessName" | "location" | "phone"> | null;
};

export async function createSession(userId: string, userAgent?: string | null): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) ?? null },
  });
  return { token, expiresAt };
}

/** Returns the signed-in user for a raw session token, or null if the session is missing, expired or the user is suspended. */
export async function validateSessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const id = sha256(token);
  const session = await db.session.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isDemo: true,
          demoWelcomeSeenAt: true,
          phone: true,
          sellerProfile: { select: { businessName: true, location: true, phone: true } },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  // Touch at most once an hour to avoid a write per request.
  if (Date.now() - session.lastSeenAt.getTime() > 60 * 60 * 1000) {
    await db.session.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return session.user;
}

export async function invalidateSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { id: sha256(token) } });
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
