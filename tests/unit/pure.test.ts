import { describe, expect, it } from "vitest";
import { hashPassword, newReference, newSlug, newToken, sha256, verifyPassword } from "@/lib/crypto";
import { deliverySummary } from "@/lib/delivery";
import { TRANSACTION_STATUSES } from "@/lib/domain/constants";
import { nextStatus } from "@/lib/domain/state-machine";
import { formatUGX, initials, normaliseUgPhone, parseAmount } from "@/lib/format";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { createLinkSchema, demoPaymentSchema, registerSchema, resetPasswordSchema, safeNextPath } from "@/lib/validation";

describe("passwords and tokens", () => {
  it("hashes with a salt and verifies only the right password", async () => {
    const a = await hashPassword("Correct-Horse-1");
    const b = await hashPassword("Correct-Horse-1");
    expect(a).not.toEqual(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(a).not.toContain("Correct-Horse-1");
    expect(await verifyPassword("Correct-Horse-1", a)).toBe(true);
    expect(await verifyPassword("correct-horse-1", a)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("generates unguessable tokens, references and slugs in the expected shape", () => {
    expect(newToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toEqual(newToken());
    expect(newReference()).toMatch(/^PL-[2-9A-HJ-NP-Z]{6}$/);
    expect(newSlug()).toMatch(/^[a-z2-9]{12}$/);
    expect(sha256("abc")).toHaveLength(64);
  });
});

describe("formatting", () => {
  it("formats and parses UGX amounts", () => {
    expect(formatUGX(185000)).toBe("UGX 185,000");
    expect(parseAmount("185,000")).toBe(185000);
    expect(parseAmount("UGX 185 000")).toBe(185000);
    expect(parseAmount("185000.50")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("")).toBeNaN();
  });

  it("normalises Ugandan mobile numbers and rejects others", () => {
    expect(normaliseUgPhone("0772123456")).toBe("0772 123 456");
    expect(normaliseUgPhone("+256 772 123 456")).toBe("0772 123 456");
    expect(normaliseUgPhone("256772123456")).toBe("0772 123 456");
    expect(normaliseUgPhone("0772 12")).toBeNull();
    expect(normaliseUgPhone("0412345678")).toBeNull();
  });

  it("builds initials and delivery summaries", () => {
    expect(initials("Nakato Crafts")).toBe("NC");
    expect(initials("Grace")).toBe("GR");
    expect(deliverySummary("SELLER_DELIVERS", "Kampala", "2–3 days after payment")).toBe("Seller delivers in Kampala, 2–3 days after payment");
    expect(deliverySummary("BUYER_COLLECTS", "Ntinda", "Same day")).toBe("Collect from Ntinda, same day");
  });
});

describe("transaction state machine", () => {
  it("allows exactly the documented transitions", () => {
    const allowed: Record<string, string[]> = {
      PAYMENT_SUCCEEDED: ["PENDING", "PAYMENT_FAILED"],
      PAYMENT_FAILED: ["PENDING", "PAYMENT_FAILED"],
      PAYMENT_CANCELLED_BY_BUYER: ["PENDING", "PAYMENT_FAILED"],
      CANCELLED_BY_SELLER: ["PENDING", "PAYMENT_FAILED"],
      CONFIRMED_BY_BUYER: ["FUNDS_SECURED_DEMO"],
    };
    for (const [action, from] of Object.entries(allowed)) {
      for (const status of TRANSACTION_STATUSES) {
        const result = nextStatus(status, action as never);
        if (from.includes(status)) expect(result, `${status} + ${action}`).not.toBeNull();
        else expect(result, `${status} + ${action}`).toBeNull();
      }
    }
    expect(nextStatus("PENDING", "PAYMENT_SUCCEEDED")).toBe("FUNDS_SECURED_DEMO");
    expect(nextStatus("FUNDS_SECURED_DEMO", "CONFIRMED_BY_BUYER")).toBe("COMPLETED");
    expect(nextStatus("PENDING", "PAYMENT_CANCELLED_BY_BUYER")).toBe("CANCELLED");
  });

  it("never leaves a final status", () => {
    for (const action of ["PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "PAYMENT_CANCELLED_BY_BUYER", "CANCELLED_BY_SELLER", "CONFIRMED_BY_BUYER"] as const) {
      expect(nextStatus("COMPLETED", action)).toBeNull();
      expect(nextStatus("CANCELLED", action)).toBeNull();
    }
  });
});

describe("validation", () => {
  const seller = { role: "SELLER", name: "Sarah Nakato", email: " Sarah@Example.com ", password: "Longenough1x", businessName: "Nakato Crafts", phone: "" };

  it("accepts a valid seller and normalises the email", () => {
    const r = registerSchema.safeParse(seller);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("sarah@example.com");
  });

  it("requires a business name for sellers but not buyers", () => {
    expect(registerSchema.safeParse({ ...seller, businessName: "" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...seller, role: "BUYER", businessName: "" }).success).toBe(true);
  });

  it("rejects weak passwords, bad emails and self-assigned admin role", () => {
    expect(registerSchema.safeParse({ ...seller, password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...seller, password: "onlyletterslong" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...seller, email: "not-an-email" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...seller, role: "ADMIN" }).success).toBe(false);
  });

  it("requires matching passwords on reset", () => {
    const token = "x".repeat(43);
    expect(resetPasswordSchema.safeParse({ token, password: "Longenough1x", confirm: "Longenough1x" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token, password: "Longenough1x", confirm: "Different1xx" }).success).toBe(false);
  });

  const link = {
    itemName: "Basket set",
    description: "Three nesting baskets, natural and indigo.",
    amount: "185,000",
    quantity: "1",
    deliveryMethod: "SELLER_DELIVERS",
    deliveryArea: "Kampala",
    deliveryTimeframe: "2–3 days after payment",
    deliveryNotes: "",
    expiry: "7",
  };

  it("parses a payment link and converts the amount to whole shillings", () => {
    const r = createLinkSchema.safeParse(link);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe(185000);
  });

  it("rejects amounts that are missing, fractional, too small or too large", () => {
    for (const amount of ["", "abc", "100.5", "499", "50,000,001", "-5000"]) {
      expect(createLinkSchema.safeParse({ ...link, amount }).success, amount).toBe(false);
    }
  });

  it("requires a delivery area, a real description and a known expiry", () => {
    expect(createLinkSchema.safeParse({ ...link, deliveryArea: "" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ ...link, description: "short" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ ...link, expiry: "999" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ ...link, deliveryMethod: "TELEPORT" }).success).toBe(false);
  });

  it("validates the payment form", () => {
    const pay = { method: "MTN_MOMO", payerName: "Grace Akello", payerPhone: "0772123456", payerEmail: "", outcome: "SUCCESS" };
    const ok = demoPaymentSchema.safeParse(pay);
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.payerPhone).toBe("0772 123 456");
    expect(demoPaymentSchema.safeParse({ ...pay, payerPhone: "12345" }).success).toBe(false);
    expect(demoPaymentSchema.safeParse({ ...pay, outcome: "REFUND" }).success).toBe(false);
    expect(demoPaymentSchema.safeParse({ ...pay, method: "CARD" }).success).toBe(false);
    expect(demoPaymentSchema.safeParse({ ...pay, payerEmail: "nope" }).success).toBe(false);
  });

  it("only allows same-site redirect targets", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and reports a retry time", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000).ok).toBe(true);
    const blocked = rateLimit("k", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit("other", 3, 60_000).ok).toBe(true);
  });
});
