import type { z } from "zod";
import { config } from "../config";
import { hashPassword, newToken, sha256, verifyPassword } from "../crypto";
import { db } from "../db";
import { DomainError, isUniqueViolation } from "../errors";
import { sendEmail } from "../mailer";
import { invalidateAllSessions } from "../auth/sessions";
import type { profileSchema, registerSchema } from "../validation";

type RegisterInput = z.infer<typeof registerSchema>;

export async function registerUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone ?? null,
        role: input.role,
        passwordHash,
        isDemo: true,
        sellerProfile:
          input.role === "SELLER"
            ? { create: { businessName: input.businessName ?? input.name, phone: input.phone ?? null } }
            : undefined,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("An account with this email already exists. Sign in instead.", "EMAIL_TAKEN");
    throw e;
  }
}

// Used to keep response time similar whether or not the email exists.
let dummyHash: Promise<string> | null = null;

export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    dummyHash ??= hashPassword("not-a-real-password-1");
    await verifyPassword(password, await dummyHash);
    return { ok: false as const, reason: "INVALID" as const };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false as const, reason: "INVALID" as const };
  if (user.status !== "ACTIVE") return { ok: false as const, reason: "SUSPENDED" as const };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true as const, user };
}

const RESET_TTL_MS = 30 * 60 * 1000;

/** Always resolves the same way whether or not the account exists, so emails can't be enumerated. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = newToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  const link = `${config.appUrl}/reset-password/${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Paylink password",
    body: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in 30 minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password stays the same.\n\nPaylink`,
  });
}

export async function getValidResetToken(token: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
  return record;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await getValidResetToken(token);
  if (!record) throw new DomainError("This reset link has expired or was already used. Request a new one.", "RESET_INVALID");
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Retire any other outstanding reset links for this user.
    db.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  // Sign out everywhere: whoever had the old password loses access.
  await invalidateAllSessions(record.userId);
}

export async function updateSellerProfile(userId: string, input: z.infer<typeof profileSchema>) {
  await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      sellerProfile: {
        upsert: {
          create: { businessName: input.businessName, location: input.location ?? null, phone: input.phone ?? null },
          update: { businessName: input.businessName, location: input.location ?? null, phone: input.phone ?? null },
        },
      },
    },
  });
}

export async function markDemoWelcomeSeen(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { demoWelcomeSeenAt: new Date() } });
}

// ---------- administration ----------

export async function listUsers(params: { q?: string; role?: string; page?: number }) {
  const pageSize = 25;
  const page = Math.max(1, params.page ?? 1);
  const q = params.q?.trim();
  const where = {
    ...(params.role && ["SELLER", "BUYER", "ADMIN"].includes(params.role) ? { role: params.role } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
            { sellerProfile: { is: { businessName: { contains: q } } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isDemo: true,
        createdAt: true,
        lastLoginAt: true,
        sellerProfile: { select: { businessName: true } },
        _count: { select: { sales: true, purchases: true } },
      },
    }),
    db.user.count({ where }),
  ]);
  return { rows, total, page, pageSize };
}

export async function setUserStatus(adminId: string, userId: string, status: "ACTIVE" | "SUSPENDED") {
  if (adminId === userId) throw new DomainError("You can't change the status of your own account.");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new DomainError("That user no longer exists.");
  if (target.role === "ADMIN") throw new DomainError("Administrator accounts can't be suspended from here.");
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === "SUSPENDED") await invalidateAllSessions(userId);
}
