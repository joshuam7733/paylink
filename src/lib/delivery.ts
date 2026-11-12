/** One-line delivery description shown to buyers, e.g. "Seller delivers in Kampala, 2–3 days after payment". */
export function deliverySummary(method: string, area: string | null | undefined, timeframe: string | null | undefined): string {
  const where = area?.trim();
  const when = timeframe && timeframe !== "Agree with buyer" ? timeframe.charAt(0).toLowerCase() + timeframe.slice(1) : null;
  if (method === "BUYER_COLLECTS") return [`Collect from ${where || "the seller"}`, when].filter(Boolean).join(", ");
  const who = method === "COURIER" ? "Sent by courier" : "Seller delivers";
  return [where ? `${who} in ${where}` : who, when].filter(Boolean).join(", ");
}
