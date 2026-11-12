import type { TransactionStatus } from "./constants";

/**
 * Every allowed status change in Phase 1. Anything not listed is rejected.
 *
 *   PENDING ──pay ok──▶ FUNDS_SECURED_DEMO ──buyer confirms──▶ COMPLETED
 *     │  ▲
 *     │  └── retry ── PAYMENT_FAILED ──pay ok──▶ FUNDS_SECURED_DEMO
 *     ├──pay fails──▶ PAYMENT_FAILED
 *     └──buyer cancels at payment / seller cancels──▶ CANCELLED
 */
export type TransactionAction =
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED_BY_BUYER"
  | "CANCELLED_BY_SELLER"
  | "CONFIRMED_BY_BUYER";

const TRANSITIONS: Record<TransactionAction, { from: readonly TransactionStatus[]; to: TransactionStatus }> = {
  PAYMENT_SUCCEEDED: { from: ["PENDING", "PAYMENT_FAILED"], to: "FUNDS_SECURED_DEMO" },
  PAYMENT_FAILED: { from: ["PENDING", "PAYMENT_FAILED"], to: "PAYMENT_FAILED" },
  PAYMENT_CANCELLED_BY_BUYER: { from: ["PENDING", "PAYMENT_FAILED"], to: "CANCELLED" },
  CANCELLED_BY_SELLER: { from: ["PENDING", "PAYMENT_FAILED"], to: "CANCELLED" },
  CONFIRMED_BY_BUYER: { from: ["FUNDS_SECURED_DEMO"], to: "COMPLETED" },
};

export function nextStatus(current: TransactionStatus, action: TransactionAction): TransactionStatus | null {
  const rule = TRANSITIONS[action];
  return rule.from.includes(current) ? rule.to : null;
}

export function allowedFrom(action: TransactionAction): readonly TransactionStatus[] {
  return TRANSITIONS[action].from;
}

export class TransitionError extends Error {
  constructor(
    public readonly current: string,
    public readonly action: TransactionAction,
  ) {
    super(`This transaction can't do that right now (status ${current}, action ${action}).`);
    this.name = "TransitionError";
  }
}
