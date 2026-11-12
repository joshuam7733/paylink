const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

/** 185000 -> "185,000" */
export function formatAmount(amount: number): string {
  return ugx.format(amount);
}

/** 185000 -> "UGX 185,000" */
export function formatUGX(amount: number): string {
  return `UGX ${formatAmount(amount)}`;
}

/** "185,000" / "185 000" / "UGX 185000" -> 185000. Returns NaN when it isn't a whole number. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/ugx/i, "").replace(/[\s,_]/g, "").trim();
  if (!/^\d+$/.test(cleaned)) return Number.NaN;
  return Number.parseInt(cleaned, 10);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kampala" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Kampala",
});

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

export function formatDateTime(d: Date): string {
  return dateTimeFmt.format(d).replace(",", ",");
}

export function timeAgo(d: Date, now: Date = new Date()): string {
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(d);
}

/** Normalises Ugandan mobile numbers to 07XX XXX XXX form; returns null if invalid. */
export function normaliseUgPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+256")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("256")) digits = "0" + digits.slice(3);
  if (!/^07\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}
