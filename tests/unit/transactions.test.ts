import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  cancelBySeller,
  confirmReceived,
  getAdminOverview,
  getCheckout,
  getSellerRecentEvents,
  getSellerStats,
  getSellerTransaction,
  linkState,
  listAllTransactions,
  listBuyerPurchases,
  listSellerTransactions,
  markDelivered,
  recordLinkOpen,
  resolveTrackingAccess,
  simulateDemoPayment,
} from "@/lib/services/transactions";
import { makeAdmin, makeBuyer, makeLink, makeSeller, payInput, resetDb } from "./helpers";

beforeEach(resetDb);

const guest = null;
const eventTypes = async (transactionId: string) =>
  (await db.transactionEvent.findMany({ where: { transactionId }, orderBy: { createdAt: "asc" } })).map((e) => e.type);

describe("payment link creation", () => {
  it("creates a pending demo transaction, a unique link and a first event", async () => {
    const seller = await makeSeller();
    const { tx, slug } = await makeLink(seller.id);
    expect(tx.reference).toMatch(/^PL-[A-Z0-9]{6}$/);
    expect(tx.status).toBe("PENDING");
    expect(tx.isDemo).toBe(true);
    expect(tx.amount).toBe(185_000);
    expect(slug).toMatch(/^[a-z0-9]{12}$/);
    expect(tx.paymentLink!.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 6.9 * 86_400_000);
    expect(await eventTypes(tx.id)).toEqual(["LINK_CREATED"]);

    const second = await makeLink(seller.id, { expiry: "never" });
    expect(second.slug).not.toBe(slug);
    expect(second.tx.reference).not.toBe(tx.reference);
    expect(second.tx.paymentLink!.expiresAt).toBeNull();
  });

  it("only lets seller accounts create links", async () => {
    const buyer = await makeBuyer();
    await expect(makeLink(buyer.id)).rejects.toThrow(/Only seller accounts/);
  });
});

describe("buyer checkout", () => {
  it("returns the public details a buyer needs and nothing private", async () => {
    const seller = await makeSeller("Nakato Crafts");
    const { slug } = await makeLink(seller.id);
    const checkout = await getCheckout(slug);
    expect(checkout?.state).toBe("OPEN");
    expect(checkout?.transaction.itemName).toBe("Handwoven raffia basket set (3)");
    expect(checkout?.transaction.seller.sellerProfile?.businessName).toBe("Nakato Crafts");
    expect(checkout?.completedDeals).toBe(0);
    const json = JSON.stringify(checkout);
    expect(json).not.toContain(seller.email);
    expect(json).not.toContain("passwordHash");
    expect(await getCheckout("doesnotexist1")).toBeNull();
    expect(await getCheckout("../../etc")).toBeNull();
  });

  it("counts opens, logs the first one, and ignores the seller's own visits", async () => {
    const seller = await makeSeller();
    const { tx, slug } = await makeLink(seller.id);
    await recordLinkOpen(slug, seller.id);
    await recordLinkOpen(slug, null);
    await recordLinkOpen(slug, null);
    const link = await db.paymentLink.findUniqueOrThrow({ where: { slug } });
    expect(link.openCount).toBe(2);
    expect(link.firstOpenedAt).not.toBeNull();
    expect(await eventTypes(tx.id)).toEqual(["LINK_CREATED", "LINK_OPENED"]);
  });
});

describe("simulated payments", () => {
  it("success: moves to FUNDS_SECURED_DEMO and records attempt, buyer and events", async () => {
    const seller = await makeSeller();
    const { tx, slug } = await makeLink(seller.id);
    const result = await simulateDemoPayment({ slug, input: payInput(), payer: guest });
    expect(result.status).toBe("FUNDS_SECURED_DEMO");
    expect(result.reference).toBe(tx.reference);

    const stored = await db.transaction.findUniqueOrThrow({ where: { id: tx.id }, include: { paymentAttempts: true } });
    expect(stored.status).toBe("FUNDS_SECURED_DEMO");
    expect(stored.securedAt).not.toBeNull();
    expect(stored.buyerName).toBe("Grace Akello");
    expect(stored.buyerId).toBeNull();
    expect(stored.buyerAccessHash).not.toBe(result.buyerKey);
    expect(stored.paymentAttempts).toHaveLength(1);
    expect(stored.paymentAttempts[0]).toMatchObject({ provider: "DEMO", status: "SUCCEEDED", simulatedOutcome: "SUCCESS", amount: 185_000 });
    expect(await eventTypes(tx.id)).toEqual(["LINK_CREATED", "PAYMENT_INITIATED", "PAYMENT_SUCCEEDED"]);
  });

  it("a link can only be paid once", async () => {
    const seller = await makeSeller();
    const { slug } = await makeLink(seller.id);
    await simulateDemoPayment({ slug, input: payInput(), payer: guest });
    await expect(simulateDemoPayment({ slug, input: payInput(), payer: guest })).rejects.toThrow(/already been paid/);
    expect(await db.paymentAttempt.count()).toBe(1);
  });

  it("failure: moves to PAYMENT_FAILED, then a retry on the same link can succeed", async () => {
    const seller = await makeSeller();
    const { tx, slug } = await makeLink(seller.id);
    const failed = await simulateDemoPayment({ slug, input: payInput({ outcome: "FAILURE" }), payer: guest });
    expect(failed.status).toBe("PAYMENT_FAILED");
    const afterFail = await db.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(afterFail.securedAt).toBeNull();
    expect((await getCheckout(slug))?.state).toBe("OPEN");

    const retried = await simulateDemoPayment({ slug, input: payInput(), payer: guest });
    expect(retried.status).toBe("FUNDS_SECURED_DEMO");
    const attempts = await db.paymentAttempt.findMany({ where: { transactionId: tx.id }, orderBy: { createdAt: "asc" } });
    expect(attempts.map((a) => a.status)).toEqual(["FAILED", "SUCCEEDED"]);
    expect(attempts[0]!.failureReason).toBeTruthy();
    expect(await eventTypes(tx.id)).toEqual(["LINK_CREATED", "PAYMENT_INITIATED", "PAYMENT_FAILED", "PAYMENT_INITIATED", "PAYMENT_SUCCEEDED"]);
  });

  it("buyer cancellation: closes the transaction and disables the link", async () => {
    const seller = await makeSeller();
    const { tx, slug } = await makeLink(seller.id);
    const result = await simulateDemoPayment({ slug, input: payInput({ outcome: "CANCEL" }), payer: guest });
    expect(result.status).toBe("CANCELLED");
    const stored = await db.transaction.findUniqueOrThrow({ where: { id: tx.id }, include: { paymentLink: true, paymentAttempts: true } });
    expect(stored.cancelledAt).not.toBeNull();
    expect(stored.paymentLink!.disabledAt).not.toBeNull();
    expect(stored.paymentAttempts[0]!.status).toBe("CANCELLED");
    await expect(simulateDemoPayment({ slug, input: payInput(), payer: guest })).rejects.toThrow(/cancelled/);
  });

  it("refuses expired links, the seller's own link and admin payers", async () => {
    const seller = await makeSeller();
    const admin = await makeAdmin();
    const { slug } = await makeLink(seller.id);
    await expect(simulateDemoPayment({ slug, input: payInput(), payer: { id: seller.id, role: "SELLER" } })).rejects.toThrow(/your own/);
    await expect(simulateDemoPayment({ slug, input: payInput(), payer: { id: admin.id, role: "ADMIN" } })).rejects.toThrow(/Administrator/);
    await db.paymentLink.update({ where: { slug }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await getCheckout(slug))?.state).toBe("EXPIRED");
    await expect(simulateDemoPayment({ slug, input: payInput(), payer: guest })).rejects.toThrow(/expired/);
    expect(await db.paymentAttempt.count()).toBe(0);
  });

  it("links the purchase to a signed-in buyer", async () => {
    const seller = await makeSeller();
    const buyer = await makeBuyer();
    const { tx, slug } = await makeLink(seller.id);
    await simulateDemoPayment({ slug, input: payInput(), payer: { id: buyer.id, role: "BUYER" } });
    const purchases = await listBuyerPurchases(buyer.id);
    expect(purchases.map((p) => p.id)).toEqual([tx.id]);
    const other = await makeBuyer();
    expect(await listBuyerPurchases(other.id)).toEqual([]);
  });
});

describe("lifecycle after payment", () => {
  it("seller marks delivered, buyer confirms, transaction completes with a full history", async () => {
    const seller = await makeSeller();
    const { tx, slug } = await makeLink(seller.id);
    await recordLinkOpen(slug, null);
    const { buyerKey } = await simulateDemoPayment({ slug, input: payInput(), payer: guest });

    await markDelivered(seller.id, tx.id);
    await expect(markDelivered(seller.id, tx.id)).rejects.toThrow(/already marked/);
    await confirmReceived(tx.reference, { user: null, keys: [buyerKey] });

    const done = await db.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(done.status).toBe("COMPLETED");
    expect(done.deliveredAt).not.toBeNull();
    expect(done.completedAt).not.toBeNull();
    expect(await eventTypes(tx.id)).toEqual(["LINK_CREATED", "LINK_OPENED", "PAYMENT_INITIATED", "PAYMENT_SUCCEEDED", "DELIVERY_MARKED", "TRANSACTION_COMPLETED"]);
    const events = await db.transactionEvent.findMany({ where: { transactionId: tx.id, toStatus: { not: null } }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => `${e.fromStatus ?? "-"}>${e.toStatus}`)).toEqual(["->PENDING", "PENDING>FUNDS_SECURED_DEMO", "FUNDS_SECURED_DEMO>COMPLETED"]);
    await expect(confirmReceived(tx.reference, { user: null, keys: [buyerKey] })).rejects.toThrow();
  });

  it("only the buyer can confirm receipt", async () => {
    const seller = await makeSeller();
    const stranger = await makeBuyer();
    const { tx, slug } = await makeLink(seller.id);
    await simulateDemoPayment({ slug, input: payInput(), payer: guest });
    await expect(confirmReceived(tx.reference, { user: { id: seller.id, role: "SELLER" }, keys: [] })).rejects.toThrow(/Only the buyer/);
    await expect(confirmReceived(tx.reference, { user: { id: stranger.id, role: "BUYER" }, keys: [] })).rejects.toThrow(/Only the buyer/);
    await expect(confirmReceived(tx.reference, { user: null, keys: ["wrong-key"] })).rejects.toThrow(/Only the buyer/);
    expect((await db.transaction.findUniqueOrThrow({ where: { id: tx.id } })).status).toBe("FUNDS_SECURED_DEMO");
  });

  it("can't be marked delivered before payment", async () => {
    const seller = await makeSeller();
    const { tx } = await makeLink(seller.id);
    await expect(markDelivered(seller.id, tx.id)).rejects.toThrow(/once the payment is secured/);
  });

  it("seller can cancel before payment but not after", async () => {
    const seller = await makeSeller();
    const a = await makeLink(seller.id);
    await cancelBySeller(seller.id, a.tx.id);
    const cancelled = await db.transaction.findUniqueOrThrow({ where: { id: a.tx.id }, include: { paymentLink: true } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(linkState(cancelled.paymentLink!, cancelled.status)).toBe("CANCELLED");
    await expect(simulateDemoPayment({ slug: a.slug, input: payInput(), payer: guest })).rejects.toThrow();
    await expect(cancelBySeller(seller.id, a.tx.id)).rejects.toThrow(/already closed/);

    const b = await makeLink(seller.id);
    await simulateDemoPayment({ slug: b.slug, input: payInput(), payer: guest });
    await expect(cancelBySeller(seller.id, b.tx.id)).rejects.toThrow(/can't be cancelled yet/);
  });
});

describe("access control", () => {
  it("sellers can only read and change their own transactions", async () => {
    const alice = await makeSeller("Alice Shop");
    const bob = await makeSeller("Bob Shop");
    const { tx } = await makeLink(alice.id);
    expect(await getSellerTransaction(alice.id, tx.id)).not.toBeNull();
    expect(await getSellerTransaction(bob.id, tx.id)).toBeNull();
    await expect(cancelBySeller(bob.id, tx.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(markDelivered(bob.id, tx.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db.transaction.findUniqueOrThrow({ where: { id: tx.id } })).status).toBe("PENDING");
    expect((await listSellerTransactions(bob.id, {})).total).toBe(0);
    expect((await getSellerStats(bob.id)).total).toBe(0);
    expect(await getSellerRecentEvents(bob.id)).toEqual([]);
  });

  it("tracking is visible to the seller, the buyer and admins, and to nobody else", async () => {
    const seller = await makeSeller();
    const otherSeller = await makeSeller();
    const admin = await makeAdmin();
    const buyer = await makeBuyer();
    const stranger = await makeBuyer();
    const { tx, slug } = await makeLink(seller.id);
    const { buyerKey } = await simulateDemoPayment({ slug, input: payInput(), payer: { id: buyer.id, role: "BUYER" } });
    const see = (user: { id: string; role: string } | null, keys: string[] = []) => resolveTrackingAccess(tx.reference, { user, keys });

    expect((await see({ id: seller.id, role: "SELLER" }))?.viewer).toBe("SELLER");
    expect((await see({ id: buyer.id, role: "BUYER" }))?.viewer).toBe("BUYER");
    expect((await see({ id: admin.id, role: "ADMIN" }))?.viewer).toBe("ADMIN");
    expect((await see(null, [buyerKey]))?.viewer).toBe("BUYER");
    expect(await see(null)).toBeNull();
    expect(await see(null, ["guess"])).toBeNull();
    expect(await see({ id: stranger.id, role: "BUYER" })).toBeNull();
    expect(await see({ id: otherSeller.id, role: "SELLER" })).toBeNull();
    expect(await resolveTrackingAccess("PL-ZZZZZZ", { user: null, keys: [buyerKey] })).toBeNull();
    expect(await resolveTrackingAccess("not-a-ref", { user: null, keys: [] })).toBeNull();
  });
});

describe("dashboard calculations", () => {
  it("counts every status and sums values from real records only", async () => {
    const seller = await makeSeller();
    const other = await makeSeller();
    const empty = await getSellerStats(seller.id);
    expect(empty).toMatchObject({ total: 0, inProgress: 0, failedOrCancelled: 0, completedValue: 0, securedValue: 0 });

    // 1 pending
    await makeLink(seller.id, { amount: 10_000 });
    // 1 secured
    const secured = await makeLink(seller.id, { amount: 20_000 });
    await simulateDemoPayment({ slug: secured.slug, input: payInput(), payer: guest });
    // 2 completed
    for (const amount of [30_000, 45_000]) {
      const l = await makeLink(seller.id, { amount });
      const { buyerKey } = await simulateDemoPayment({ slug: l.slug, input: payInput(), payer: guest });
      await confirmReceived(l.tx.reference, { user: null, keys: [buyerKey] });
    }
    // 1 failed
    const failed = await makeLink(seller.id, { amount: 50_000 });
    await simulateDemoPayment({ slug: failed.slug, input: payInput({ outcome: "FAILURE" }), payer: guest });
    // 1 cancelled by buyer, 1 cancelled by seller
    const c1 = await makeLink(seller.id, { amount: 60_000 });
    await simulateDemoPayment({ slug: c1.slug, input: payInput({ outcome: "CANCEL" }), payer: guest });
    const c2 = await makeLink(seller.id, { amount: 70_000 });
    await cancelBySeller(seller.id, c2.tx.id);
    // another seller's sale must not leak in
    const foreign = await makeLink(other.id, { amount: 999_000 });
    await simulateDemoPayment({ slug: foreign.slug, input: payInput(), payer: guest });

    const stats = await getSellerStats(seller.id);
    expect(stats.total).toBe(7);
    expect(stats.counts).toEqual({ PENDING: 1, FUNDS_SECURED_DEMO: 1, PAYMENT_FAILED: 1, CANCELLED: 2, COMPLETED: 2 });
    expect(stats.inProgress).toBe(2);
    expect(stats.failedOrCancelled).toBe(3);
    expect(stats.completedValue).toBe(75_000);
    expect(stats.securedValue).toBe(20_000);

    const overview = await getAdminOverview();
    expect(overview.transactionTotal).toBe(8);
    expect(overview.counts.FUNDS_SECURED_DEMO).toBe(2);
    expect(overview.completedValue).toBe(75_000);
    expect(overview.usersByRole.SELLER).toBe(2);
  });

  it("searches and filters a seller's transactions", async () => {
    const seller = await makeSeller();
    const basket = await makeLink(seller.id, { itemName: "Raffia basket" });
    const dress = await makeLink(seller.id, { itemName: "Kitenge dress" });
    await simulateDemoPayment({ slug: dress.slug, input: payInput({ payerName: "Brian Kato" }), payer: guest });

    const ids = async (p: Parameters<typeof listSellerTransactions>[1]) => (await listSellerTransactions(seller.id, p)).rows.map((r) => r.id);
    expect((await ids({})).sort()).toEqual([basket.tx.id, dress.tx.id].sort());
    expect(await ids({ q: "kitenge" })).toEqual([dress.tx.id]);
    expect(await ids({ q: "Brian" })).toEqual([dress.tx.id]);
    expect(await ids({ q: basket.tx.reference.toLowerCase() })).toEqual([basket.tx.id]);
    expect(await ids({ status: "PENDING" })).toEqual([basket.tx.id]);
    expect(await ids({ status: "FUNDS_SECURED_DEMO" })).toEqual([dress.tx.id]);
    expect(await ids({ status: "COMPLETED" })).toEqual([]);
    expect(await ids({ q: "no such thing" })).toEqual([]);
  });

  it("lets admins search all transactions, including by seller", async () => {
    const alice = await makeSeller("Alice Shop");
    const bob = await makeSeller("Bob Shop");
    const a = await makeLink(alice.id, { itemName: "Alice item" });
    await makeLink(bob.id, { itemName: "Bob item" });
    expect((await listAllTransactions({})).total).toBe(2);
    expect((await listAllTransactions({ q: "Alice Shop" })).rows.map((r) => r.id)).toEqual([a.tx.id]);
    expect((await listAllTransactions({ q: alice.email })).rows.map((r) => r.id)).toEqual([a.tx.id]);
    expect((await listAllTransactions({ q: a.tx.reference })).rows.map((r) => r.id)).toEqual([a.tx.id]);
    expect((await listAllTransactions({ status: "COMPLETED" })).total).toBe(0);
  });
});
