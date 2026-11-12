import { beforeEach, describe, expect, it } from "vitest";
import { createSession, invalidateSession, validateSessionToken } from "@/lib/auth/sessions";
import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { authenticate, getValidResetToken, listUsers, registerUser, requestPasswordReset, resetPassword, setUserStatus } from "@/lib/services/users";
import { makeAdmin, makeBuyer, makeSeller, PASSWORD, resetDb } from "./helpers";

beforeEach(resetDb);

describe("registration and login", () => {
  it("creates a seller with a profile and a hashed password", async () => {
    const seller = await makeSeller("Nakato Crafts");
    const stored = await db.user.findUniqueOrThrow({ where: { id: seller.id }, include: { sellerProfile: true } });
    expect(stored.role).toBe("SELLER");
    expect(stored.isDemo).toBe(true);
    expect(stored.sellerProfile?.businessName).toBe("Nakato Crafts");
    expect(stored.passwordHash).not.toContain(PASSWORD);
  });

  it("creates a buyer without a seller profile", async () => {
    const buyer = await makeBuyer();
    const stored = await db.user.findUniqueOrThrow({ where: { id: buyer.id }, include: { sellerProfile: true } });
    expect(stored.role).toBe("BUYER");
    expect(stored.sellerProfile).toBeNull();
  });

  it("refuses a second account with the same email", async () => {
    const seller = await makeSeller();
    await expect(
      registerUser({ role: "BUYER", name: "Someone Else", email: seller.email, password: PASSWORD, businessName: undefined, phone: undefined }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("signs in with the right password only", async () => {
    const seller = await makeSeller();
    expect((await authenticate(seller.email, PASSWORD)).ok).toBe(true);
    expect(await authenticate(seller.email, "Wrong-Password-1")).toMatchObject({ ok: false, reason: "INVALID" });
    expect(await authenticate("nobody@paylink.test", PASSWORD)).toMatchObject({ ok: false, reason: "INVALID" });
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and resolves the user from the raw token", async () => {
    const seller = await makeSeller();
    const { token } = await createSession(seller.id, "vitest");
    expect(await db.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: sha256(token) } })).not.toBeNull();
    const user = await validateSessionToken(token);
    expect(user?.id).toBe(seller.id);
    expect(user?.sellerProfile?.businessName).toBe("Nakato Crafts");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects unknown, expired and signed-out sessions", async () => {
    const seller = await makeSeller();
    expect(await validateSessionToken("made-up-token")).toBeNull();
    expect(await validateSessionToken(undefined)).toBeNull();

    const { token } = await createSession(seller.id);
    await db.session.update({ where: { id: sha256(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.session.count()).toBe(0);

    const second = await createSession(seller.id);
    await invalidateSession(second.token);
    expect(await validateSessionToken(second.token)).toBeNull();
  });
});

describe("password reset", () => {
  it("emails a single-use link, changes the password and signs out every session", async () => {
    const seller = await makeSeller();
    const { token: sessionToken } = await createSession(seller.id);
    await requestPasswordReset(seller.email);

    const mail = await db.devEmail.findFirstOrThrow();
    expect(mail.to).toBe(seller.email);
    const resetToken = mail.body.match(/reset-password\/([A-Za-z0-9_-]+)/)?.[1];
    expect(resetToken).toBeTruthy();
    // Only the hash is stored.
    expect(await db.passwordResetToken.findUnique({ where: { tokenHash: resetToken! } })).toBeNull();
    expect(await getValidResetToken(resetToken!)).not.toBeNull();

    await resetPassword(resetToken!, "Brand-New-Pass-9");
    expect((await authenticate(seller.email, "Brand-New-Pass-9")).ok).toBe(true);
    expect((await authenticate(seller.email, PASSWORD)).ok).toBe(false);
    expect(await validateSessionToken(sessionToken)).toBeNull();
    await expect(resetPassword(resetToken!, "Another-Pass-10")).rejects.toMatchObject({ code: "RESET_INVALID" });
  });

  it("sends nothing for unknown emails and rejects expired links", async () => {
    await requestPasswordReset("nobody@paylink.test");
    expect(await db.devEmail.count()).toBe(0);

    const seller = await makeSeller();
    await requestPasswordReset(seller.email);
    await db.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const mail = await db.devEmail.findFirstOrThrow();
    const token = mail.body.match(/reset-password\/([A-Za-z0-9_-]+)/)![1]!;
    expect(await getValidResetToken(token)).toBeNull();
    await expect(resetPassword(token, "Brand-New-Pass-9")).rejects.toMatchObject({ code: "RESET_INVALID" });
  });
});

describe("administration of users", () => {
  it("suspends a user: sign-in is blocked and existing sessions stop working", async () => {
    const admin = await makeAdmin();
    const seller = await makeSeller();
    const { token } = await createSession(seller.id);

    await setUserStatus(admin.id, seller.id, "SUSPENDED");
    expect(await validateSessionToken(token)).toBeNull();
    expect(await authenticate(seller.email, PASSWORD)).toMatchObject({ ok: false, reason: "SUSPENDED" });

    await setUserStatus(admin.id, seller.id, "ACTIVE");
    expect((await authenticate(seller.email, PASSWORD)).ok).toBe(true);
  });

  it("won't let an admin suspend themselves or another admin", async () => {
    const admin = await makeAdmin();
    const other = await makeAdmin();
    await expect(setUserStatus(admin.id, admin.id, "SUSPENDED")).rejects.toThrow();
    await expect(setUserStatus(admin.id, other.id, "SUSPENDED")).rejects.toThrow();
  });

  it("lists and searches users without exposing password hashes", async () => {
    await makeAdmin();
    const seller = await makeSeller("Kampala Kitenge");
    await makeBuyer();
    const all = await listUsers({});
    expect(all.total).toBe(3);
    expect(JSON.stringify(all.rows)).not.toContain("scrypt$");
    const sellers = await listUsers({ role: "SELLER" });
    expect(sellers.rows.map((u) => u.id)).toEqual([seller.id]);
    const search = await listUsers({ q: "Kitenge" });
    expect(search.rows.map((u) => u.id)).toEqual([seller.id]);
  });
});
