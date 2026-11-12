export const config = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  paymentsMode: (process.env.PAYMENTS_MODE ?? "demo") as "demo",
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 7) || 7,
  isProduction: process.env.NODE_ENV === "production",
  devOutboxEnabled: process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_OUTBOX === "true",
};

export function paymentLinkUrl(slug: string): string {
  return `${config.appUrl}/pay/${slug}`;
}

export function trackingUrl(reference: string, key?: string): string {
  return key ? `${config.appUrl}/t/${reference}/${key}` : `${config.appUrl}/t/${reference}`;
}
