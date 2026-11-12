// Single source of truth for the string "enums" stored in the database.

export const ROLES = ["SELLER", "BUYER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TRANSACTION_STATUSES = [
  "PENDING",
  "FUNDS_SECURED_DEMO",
  "PAYMENT_FAILED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Statuses from which a buyer may (re)try paying. */
export const PAYABLE_STATUSES: readonly TransactionStatus[] = ["PENDING", "PAYMENT_FAILED"];
/** Statuses a seller may cancel from. Cancelling after payment needs a refund flow (later phase). */
export const SELLER_CANCELLABLE_STATUSES: readonly TransactionStatus[] = ["PENDING", "PAYMENT_FAILED"];
export const FINAL_STATUSES: readonly TransactionStatus[] = ["CANCELLED", "COMPLETED"];

/** What people see. The database keeps the explicit _DEMO enum. */
export const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: "Awaiting payment",
  FUNDS_SECURED_DEMO: "Payment secured",
  PAYMENT_FAILED: "Payment failed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const DELIVERY_METHODS = ["SELLER_DELIVERS", "BUYER_COLLECTS", "COURIER"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  SELLER_DELIVERS: "Seller delivers",
  BUYER_COLLECTS: "Buyer collects",
  COURIER: "Courier",
};

export const DELIVERY_TIMEFRAMES = [
  "Same day",
  "1–2 days after payment",
  "2–3 days after payment",
  "3–5 days after payment",
  "Within a week",
  "Agree with buyer",
] as const;

export const LINK_EXPIRY_OPTIONS = [
  { value: "1", label: "In 24 hours" },
  { value: "3", label: "In 3 days" },
  { value: "7", label: "In 7 days" },
  { value: "30", label: "In 30 days" },
  { value: "never", label: "Never" },
] as const;
export type LinkExpiryValue = (typeof LINK_EXPIRY_OPTIONS)[number]["value"];

export const PAYMENT_METHODS = ["MTN_MOMO", "AIRTEL_MONEY"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MTN_MOMO: "MTN Mobile Money",
  AIRTEL_MONEY: "Airtel Money",
};

export const PAYMENT_ATTEMPT_STATUSES = ["INITIATED", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export const DEMO_OUTCOMES = ["SUCCESS", "FAILURE", "CANCEL"] as const;
export type DemoOutcome = (typeof DEMO_OUTCOMES)[number];

export const EVENT_TYPES = [
  "LINK_CREATED",
  "LINK_OPENED",
  "PAYMENT_INITIATED",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "PAYMENT_CANCELLED",
  "DELIVERY_MARKED",
  "TRANSACTION_CANCELLED",
  "TRANSACTION_COMPLETED",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const ACTOR_TYPES = ["SELLER", "BUYER", "ADMIN", "SYSTEM"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const MAX_AMOUNT_UGX = 50_000_000; // demo ceiling; real limits come from the payment provider
export const MIN_AMOUNT_UGX = 500;

export function isTransactionStatus(v: string): v is TransactionStatus {
  return (TRANSACTION_STATUSES as readonly string[]).includes(v);
}
export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}
