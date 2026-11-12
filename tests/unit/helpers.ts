import { db } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { createPaymentLink } from "@/lib/services/transactions";
import { registerUser } from "@/lib/services/users";
import type { CreateLinkInput, DemoPaymentInput } from "@/lib/validation";

export const PASSWORD = "Test-Password-123";

export async function resetDb() {
  await db.transactionEvent.deleteMany();
  await db.paymentAttempt.deleteMany();
  await db.paymentLink.deleteMany();
  await db.transaction.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.session.deleteMany();
  await db.sellerProfile.deleteMany();
  await db.devEmail.deleteMany();
  await db.user.deleteMany();
  resetRateLimits();
}

let n = 0;
export async function makeSeller(name = "Nakato Crafts") {
  n++;
  return registerUser({ role: "SELLER", name: "Sarah Nakato", email: `seller${n}@paylink.test`, password: PASSWORD, businessName: name, phone: undefined });
}
export async function makeBuyer() {
  n++;
  return registerUser({ role: "BUYER", name: "Grace Akello", email: `buyer${n}@paylink.test`, password: PASSWORD, businessName: undefined, phone: undefined });
}
export async function makeAdmin() {
  n++;
  const u = await registerUser({ role: "BUYER", name: "Admin", email: `admin${n}@paylink.test`, password: PASSWORD, businessName: undefined, phone: undefined });
  return db.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
}

export const linkInput = (over: Partial<CreateLinkInput> = {}): CreateLinkInput => ({
  itemName: "Handwoven raffia basket set (3)",
  description: "Set of three nesting baskets, natural and indigo.",
  amount: 185_000,
  quantity: 1,
  deliveryMethod: "SELLER_DELIVERS",
  deliveryArea: "Kampala and Wakiso",
  deliveryTimeframe: "2–3 days after payment",
  deliveryNotes: undefined,
  expiry: "7",
  ...over,
});

export const payInput = (over: Partial<DemoPaymentInput> = {}): DemoPaymentInput => ({
  method: "MTN_MOMO",
  payerName: "Grace Akello",
  payerPhone: "0772 123 456",
  payerEmail: undefined,
  outcome: "SUCCESS",
  ...over,
});

export async function makeLink(sellerId: string, over: Partial<CreateLinkInput> = {}) {
  const tx = await createPaymentLink(sellerId, linkInput(over));
  return { tx, slug: tx.paymentLink!.slug };
}
