import type { Prisma, PrismaClient } from "@prisma/client";
import { config } from "../config";
import { constantTimeEqualHex, newReference, newSlug, newToken, sha256 } from "../crypto";
import { db } from "../db";
import {
  PAYABLE_STATUSES,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUSES,
  isTransactionStatus,
  type ActorType,
  type EventType,
  type PaymentMethod,
  type TransactionStatus,
} from "../domain/constants";
import { TransitionError, allowedFrom, nextStatus, type TransactionAction } from "../domain/state-machine";
import { DomainError, NotFoundError, isUniqueViolation } from "../errors";
import { formatUGX } from "../format";
import type { CreateLinkInput, DemoPaymentInput } from "../validation";

type Tx = Prisma.TransactionClient | PrismaClient;

async function addEvent(
  t: Tx,
  e: {
    transactionId: string;
    type: EventType;
    actorType: ActorType;
    actorId?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  await t.transactionEvent.create({
    data: {
      transactionId: e.transactionId,
      type: e.type,
      actorType: e.actorType,
      actorId: e.actorId ?? null,
      fromStatus: e.fromStatus ?? null,
      toStatus: e.toStatus ?? null,
      message: e.message,
      metadata: e.metadata ? JSON.stringify(e.metadata) : null,
    },
  });
}

/** Moves a transaction through the state machine atomically; fails if someone else changed it first. */
async function transition(
  t: Tx,
  id: string,
  current: TransactionStatus,
  action: TransactionAction,
  data: Prisma.TransactionUpdateManyMutationInput = {},
): Promise<TransactionStatus> {
  const to = nextStatus(current, action);
  if (!to) throw new TransitionError(current, action);
  const res = await t.transaction.updateMany({
    where: { id, status: { in: [...allowedFrom(action)] } },
    data: { ...data, status: to },
  });
  if (res.count !== 1) throw new TransitionError(current, action);
  return to;
}

// ---------------------------------------------------------------- creation

function expiryDate(expiry: string, now = new Date()): Date | null {
  if (expiry === "never") return null;
  const days = Number(expiry);
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function createPaymentLink(sellerId: string, input: CreateLinkInput) {
  const seller = await db.user.findUnique({ where: { id: sellerId }, include: { sellerProfile: true } });
  if (!seller || seller.role !== "SELLER") throw new DomainError("Only seller accounts can create payment links.");

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async (t) => {
        const tx = await t.transaction.create({
          data: {
            reference: newReference(),
            sellerId,
            itemName: input.itemName,
            description: input.description,
            quantity: input.quantity,
            amount: input.amount,
            deliveryMethod: input.deliveryMethod,
            deliveryArea: input.deliveryArea || null,
            deliveryTimeframe: input.deliveryTimeframe,
            deliveryNotes: input.deliveryNotes || null,
            status: "PENDING",
            isDemo: seller.isDemo,
            paymentLink: { create: { slug: newSlug(), expiresAt: expiryDate(input.expiry) } },
          },
          include: { paymentLink: true },
        });
        await addEvent(t, {
          transactionId: tx.id,
          type: "LINK_CREATED",
          actorType: "SELLER",
          actorId: sellerId,
          toStatus: "PENDING",
          message: `Payment link created for ${formatUGX(tx.amount)}`,
        });
        return tx;
      });
    } catch (e) {
      if (isUniqueViolation(e) && attempt < 4) continue; // reference/slug collision: try new values
      throw e;
    }
  }
  throw new Error("Could not allocate a unique reference.");
}

// ---------------------------------------------------------------- link state

export type LinkState = "OPEN" | "EXPIRED" | "DISABLED" | "PAID" | "COMPLETED" | "CANCELLED";

export function linkState(
  link: { expiresAt: Date | null; disabledAt: Date | null },
  status: string,
  now = new Date(),
): LinkState {
  if (status === "FUNDS_SECURED_DEMO") return "PAID";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELLED") return "CANCELLED";
  if (link.disabledAt) return "DISABLED";
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "OPEN";
}

const publicCheckoutSelect = {
  id: true,
  reference: true,
  itemName: true,
  description: true,
  quantity: true,
  amount: true,
  currency: true,
  deliveryMethod: true,
  deliveryArea: true,
  deliveryTimeframe: true,
  deliveryNotes: true,
  status: true,
  isDemo: true,
  sellerId: true,
  createdAt: true,
  seller: {
    select: {
      name: true,
      createdAt: true,
      sellerProfile: { select: { businessName: true, location: true } },
    },
  },
} satisfies Prisma.TransactionSelect;

/** Public checkout data. Never includes buyer details or internal IDs beyond what the page needs. */
export async function getCheckout(slug: string) {
  if (!/^[a-z0-9]{8,32}$/.test(slug)) return null;
  const link = await db.paymentLink.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      expiresAt: true,
      disabledAt: true,
      transaction: { select: publicCheckoutSelect },
    },
  });
  if (!link) return null;
  const completedDeals = await db.transaction.count({
    where: { sellerId: link.transaction.sellerId, status: "COMPLETED" },
  });
  return { ...link, state: linkState(link, link.transaction.status), completedDeals };
}

/** Counts opens; logs a LINK_OPENED event the first time someone other than the seller opens it. */
export async function recordLinkOpen(slug: string, viewerUserId: string | null): Promise<void> {
  const link = await db.paymentLink.findUnique({ where: { slug }, include: { transaction: true } });
  if (!link) return;
  if (viewerUserId && viewerUserId === link.transaction.sellerId) return;
  const now = new Date();
  const first = !link.firstOpenedAt;
  await db.$transaction(async (t) => {
    await t.paymentLink.update({
      where: { id: link.id },
      data: { openCount: { increment: 1 }, lastOpenedAt: now, ...(first ? { firstOpenedAt: now } : {}) },
    });
    if (first) {
      await addEvent(t, {
        transactionId: link.transactionId,
        type: "LINK_OPENED",
        actorType: "BUYER",
        actorId: viewerUserId,
        message: "Buyer opened the payment link",
      });
    }
  });
}

// ---------------------------------------------------------------- demo payment engine

const DEMO_FAILURE_REASON = "The payment was declined by the network. The buyer can try again.";

export type PaymentResult = { reference: string; status: TransactionStatus; buyerKey: string };

/**
 * Simulated payment. No provider is contacted and no money moves. Real providers will implement the
 * same flow (initiate → callback → status change) behind a provider interface in a later phase.
 */
export async function simulateDemoPayment(params: {
  slug: string;
  input: DemoPaymentInput;
  payer: { id: string; role: string } | null;
}): Promise<PaymentResult> {
  if (config.paymentsMode !== "demo") throw new DomainError("Live payments aren't available yet.");
  const link = await db.paymentLink.findUnique({ where: { slug: params.slug }, include: { transaction: true } });
  if (!link) throw new NotFoundError("This payment link doesn't exist.");
  const tx = link.transaction;
  if (!tx.isDemo) throw new DomainError("Live payments aren't available yet.");
  if (params.payer?.id === tx.sellerId) throw new DomainError("You can't pay your own payment link.");
  if (params.payer?.role === "ADMIN") throw new DomainError("Administrator accounts can't make payments.");

  const state = linkState(link, tx.status);
  if (state === "EXPIRED") throw new DomainError("This payment link has expired. Ask the seller for a new one.");
  if (state === "DISABLED" || state === "CANCELLED") throw new DomainError("The seller has cancelled this payment link.");
  if (!isTransactionStatus(tx.status) || !PAYABLE_STATUSES.includes(tx.status)) {
    throw new DomainError("This payment link has already been paid.");
  }

  const { input } = params;
  const action: TransactionAction =
    input.outcome === "SUCCESS" ? "PAYMENT_SUCCEEDED" : input.outcome === "FAILURE" ? "PAYMENT_FAILED" : "PAYMENT_CANCELLED_BY_BUYER";
  const buyerKey = newToken();
  const now = new Date();
  const methodLabel = PAYMENT_METHOD_LABELS[input.method as PaymentMethod];
  const actorId = params.payer?.id ?? null;

  const status = await db.$transaction(async (t) => {
    const attempt = await t.paymentAttempt.create({
      data: {
        transactionId: tx.id,
        provider: "DEMO",
        method: input.method,
        payerName: input.payerName,
        payerPhone: input.payerPhone,
        amount: tx.amount,
        currency: tx.currency,
        status: "INITIATED",
        simulatedOutcome: input.outcome,
      },
    });
    await addEvent(t, {
      transactionId: tx.id,
      type: "PAYMENT_INITIATED",
      actorType: "BUYER",
      actorId,
      message: `${input.payerName} started a ${methodLabel} payment of ${formatUGX(tx.amount)}`,
      metadata: { attemptId: attempt.id, provider: "DEMO", method: input.method },
    });

    const buyerData = {
      buyerName: input.payerName,
      buyerPhone: input.payerPhone,
      buyerEmail: input.payerEmail ?? null,
      buyerAccessHash: sha256(buyerKey),
      ...(params.payer ? { buyerId: params.payer.id } : {}),
    };

    let to: TransactionStatus;
    if (action === "PAYMENT_SUCCEEDED") {
      to = await transition(t, tx.id, tx.status as TransactionStatus, action, { ...buyerData, securedAt: now });
      await t.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "SUCCEEDED", completedAt: now, providerReference: `DEMO-${attempt.id.slice(-8).toUpperCase()}` },
      });
      await addEvent(t, {
        transactionId: tx.id,
        type: "PAYMENT_SUCCEEDED",
        actorType: "SYSTEM",
        fromStatus: tx.status,
        toStatus: to,
        message: `Payment of ${formatUGX(tx.amount)} secured via ${methodLabel}`,
        metadata: { attemptId: attempt.id },
      });
    } else if (action === "PAYMENT_FAILED") {
      to = await transition(t, tx.id, tx.status as TransactionStatus, action, buyerData);
      await t.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "FAILED", completedAt: now, failureReason: DEMO_FAILURE_REASON },
      });
      await addEvent(t, {
        transactionId: tx.id,
        type: "PAYMENT_FAILED",
        actorType: "SYSTEM",
        fromStatus: tx.status,
        toStatus: to,
        message: `${methodLabel} payment failed: ${DEMO_FAILURE_REASON}`,
        metadata: { attemptId: attempt.id },
      });
    } else {
      to = await transition(t, tx.id, tx.status as TransactionStatus, action, { ...buyerData, cancelledAt: now });
      await t.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "CANCELLED", completedAt: now } });
      await t.paymentLink.update({ where: { id: link.id }, data: { disabledAt: now } });
      await addEvent(t, {
        transactionId: tx.id,
        type: "PAYMENT_CANCELLED",
        actorType: "BUYER",
        actorId,
        fromStatus: tx.status,
        toStatus: to,
        message: `${input.payerName} cancelled the payment. The transaction is closed.`,
        metadata: { attemptId: attempt.id },
      });
    }
    return to;
  });

  return { reference: tx.reference, status, buyerKey };
}

// ---------------------------------------------------------------- seller actions

export async function cancelBySeller(sellerId: string, transactionId: string) {
  const tx = await db.transaction.findFirst({ where: { id: transactionId, sellerId } });
  if (!tx) throw new NotFoundError("We couldn't find that transaction.");
  const now = new Date();
  await db.$transaction(async (t) => {
    let to: TransactionStatus;
    try {
      to = await transition(t, tx.id, tx.status as TransactionStatus, "CANCELLED_BY_SELLER", { cancelledAt: now });
    } catch (e) {
      if (e instanceof TransitionError) {
        throw new DomainError(
          tx.status === "FUNDS_SECURED_DEMO"
            ? "A paid transaction can't be cancelled yet. Refunds and disputes arrive in a later phase."
            : "This transaction is already closed.",
        );
      }
      throw e;
    }
    await t.paymentLink.updateMany({ where: { transactionId: tx.id }, data: { disabledAt: now } });
    await addEvent(t, {
      transactionId: tx.id,
      type: "TRANSACTION_CANCELLED",
      actorType: "SELLER",
      actorId: sellerId,
      fromStatus: tx.status,
      toStatus: to,
      message: "Seller cancelled the transaction and disabled the payment link",
    });
  });
}

export async function markDelivered(sellerId: string, transactionId: string) {
  const tx = await db.transaction.findFirst({ where: { id: transactionId, sellerId } });
  if (!tx) throw new NotFoundError("We couldn't find that transaction.");
  if (tx.status !== "FUNDS_SECURED_DEMO") throw new DomainError("You can mark an order as delivered once the payment is secured.");
  if (tx.deliveredAt) throw new DomainError("This order is already marked as delivered.");
  const now = new Date();
  await db.$transaction(async (t) => {
    const res = await t.transaction.updateMany({
      where: { id: tx.id, status: "FUNDS_SECURED_DEMO", deliveredAt: null },
      data: { deliveredAt: now },
    });
    if (res.count !== 1) throw new DomainError("This order changed while you were looking at it. Refresh and try again.");
    await addEvent(t, {
      transactionId: tx.id,
      type: "DELIVERY_MARKED",
      actorType: "SELLER",
      actorId: sellerId,
      message: "Seller marked the order as delivered",
    });
  });
}

// ---------------------------------------------------------------- buyer access & completion

export type Viewer = "SELLER" | "BUYER" | "ADMIN";

/**
 * Who may see a transaction's tracking page: its seller, an administrator, the signed-in buyer who
 * paid, or a guest holding the buyer key issued at payment time (cookie or tracking link).
 */
export async function resolveTrackingAccess(
  reference: string,
  access: { user: { id: string; role: string } | null; keys: (string | undefined | null)[] },
) {
  if (!/^PL-[A-Z0-9]{6}$/.test(reference)) return null;
  const tx = await db.transaction.findUnique({
    where: { reference },
    include: {
      seller: { select: { name: true, sellerProfile: { select: { businessName: true } } } },
      paymentLink: { select: { slug: true, expiresAt: true, disabledAt: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!tx) return null;
  let viewer: Viewer | null = null;
  if (access.user?.role === "ADMIN") viewer = "ADMIN";
  else if (access.user && access.user.id === tx.sellerId) viewer = "SELLER";
  else if (access.user && tx.buyerId && access.user.id === tx.buyerId) viewer = "BUYER";
  else if (tx.buyerAccessHash) {
    for (const k of access.keys) {
      if (k && k.length <= 100 && constantTimeEqualHex(sha256(k), tx.buyerAccessHash)) {
        viewer = "BUYER";
        break;
      }
    }
  }
  if (!viewer) return null;
  return { tx, viewer };
}

export async function confirmReceived(reference: string, access: Parameters<typeof resolveTrackingAccess>[1]) {
  const found = await resolveTrackingAccess(reference, access);
  if (!found || found.viewer !== "BUYER") throw new DomainError("Only the buyer can confirm that the order arrived.");
  const { tx } = found;
  const now = new Date();
  await db.$transaction(async (t) => {
    let to: TransactionStatus;
    try {
      to = await transition(t, tx.id, tx.status as TransactionStatus, "CONFIRMED_BY_BUYER", {
        completedAt: now,
        ...(tx.deliveredAt ? {} : { deliveredAt: now }),
      });
    } catch (e) {
      if (e instanceof TransitionError) throw new DomainError("This order can't be confirmed right now.");
      throw e;
    }
    await addEvent(t, {
      transactionId: tx.id,
      type: "TRANSACTION_COMPLETED",
      actorType: "BUYER",
      actorId: access.user?.id ?? null,
      fromStatus: tx.status,
      toStatus: to,
      message: "Buyer confirmed the order arrived. The deal is complete.",
    });
  });
}

// ---------------------------------------------------------------- reads for dashboards

export async function getSellerTransaction(sellerId: string, id: string) {
  return db.transaction.findFirst({
    where: { id, sellerId },
    include: {
      paymentLink: true,
      paymentAttempts: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type StatusFilter = TransactionStatus | "ALL";

export function parseStatusFilter(v: string | undefined): StatusFilter {
  return v && isTransactionStatus(v) ? v : "ALL";
}

function searchWhere(q: string | undefined): Prisma.TransactionWhereInput {
  const term = q?.trim().slice(0, 80);
  if (!term) return {};
  return {
    OR: [
      { reference: { contains: term.toUpperCase() } },
      { itemName: { contains: term } },
      { buyerName: { contains: term } },
      { buyerPhone: { contains: term } },
    ],
  };
}

export async function listSellerTransactions(sellerId: string, params: { q?: string; status?: StatusFilter; page?: number }) {
  const pageSize = 20;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.TransactionWhereInput = {
    sellerId,
    ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    ...searchWhere(params.q),
  };
  const [rows, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { paymentLink: true },
    }),
    db.transaction.count({ where }),
  ]);
  return { rows, total, page, pageSize };
}

export type StatusCounts = Record<TransactionStatus, number>;

function emptyCounts(): StatusCounts {
  return Object.fromEntries(TRANSACTION_STATUSES.map((s) => [s, 0])) as StatusCounts;
}

/** Every figure is computed from stored transactions; nothing is estimated or invented. */
export async function getSellerStats(sellerId: string) {
  const groups = await db.transaction.groupBy({
    by: ["status"],
    where: { sellerId },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const counts = emptyCounts();
  const sums = emptyCounts();
  for (const g of groups) {
    if (isTransactionStatus(g.status)) {
      counts[g.status] = g._count._all;
      sums[g.status] = g._sum.amount ?? 0;
    }
  }
  const total = TRANSACTION_STATUSES.reduce((n, s) => n + counts[s], 0);
  return {
    total,
    counts,
    inProgress: counts.PENDING + counts.FUNDS_SECURED_DEMO,
    failedOrCancelled: counts.PAYMENT_FAILED + counts.CANCELLED,
    completedValue: sums.COMPLETED,
    securedValue: sums.FUNDS_SECURED_DEMO,
  };
}

export async function getSellerRecentEvents(sellerId: string, limit = 8) {
  return db.transactionEvent.findMany({
    where: { transaction: { sellerId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { transaction: { select: { id: true, reference: true, itemName: true } } },
  });
}

export async function listSellerLinks(sellerId: string) {
  return db.transaction.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { paymentLink: true },
  });
}

export async function listBuyerPurchases(buyerId: string) {
  return db.transaction.findMany({
    where: { buyerId },
    orderBy: { updatedAt: "desc" },
    include: { seller: { select: { name: true, sellerProfile: { select: { businessName: true } } } } },
  });
}

// ---------------------------------------------------------------- administration

export async function getAdminOverview() {
  const [users, groups, recent] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.transaction.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    db.transactionEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { transaction: { select: { id: true, reference: true, itemName: true } } },
    }),
  ]);
  const counts = emptyCounts();
  const sums = emptyCounts();
  for (const g of groups) {
    if (isTransactionStatus(g.status)) {
      counts[g.status] = g._count._all;
      sums[g.status] = g._sum.amount ?? 0;
    }
  }
  const usersByRole = Object.fromEntries(users.map((u) => [u.role, u._count._all])) as Record<string, number>;
  return {
    usersByRole,
    userTotal: users.reduce((n, u) => n + u._count._all, 0),
    counts,
    transactionTotal: TRANSACTION_STATUSES.reduce((n, s) => n + counts[s], 0),
    completedValue: sums.COMPLETED,
    recent,
  };
}

export async function listAllTransactions(params: { q?: string; status?: StatusFilter; page?: number }) {
  const pageSize = 25;
  const page = Math.max(1, params.page ?? 1);
  const term = params.q?.trim();
  const where: Prisma.TransactionWhereInput = {
    ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    ...(term
      ? {
          OR: [
            ...(searchWhere(term).OR ?? []),
            { seller: { is: { email: { contains: term } } } },
            { seller: { is: { sellerProfile: { is: { businessName: { contains: term } } } } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { seller: { select: { email: true, sellerProfile: { select: { businessName: true } } } } },
    }),
    db.transaction.count({ where }),
  ]);
  return { rows, total, page, pageSize };
}

export async function getAdminTransaction(id: string) {
  return db.transaction.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, email: true, name: true, sellerProfile: { select: { businessName: true } } } },
      buyer: { select: { id: true, email: true, name: true } },
      paymentLink: true,
      paymentAttempts: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}
