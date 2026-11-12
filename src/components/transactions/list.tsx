import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { STATUS_LABELS, TRANSACTION_STATUSES, type TransactionStatus } from "@/lib/domain/constants";
import { formatAmount, timeAgo } from "@/lib/format";

export type Row = {
  id: string;
  href: string;
  reference: string;
  itemName: string;
  party: string | null; // buyer (for sellers) or seller (for buyers/admin)
  partyFallback?: string;
  amount: number;
  status: string;
  updatedAt: Date;
};

/** A real table from md up; stacked tappable rows on phones. */
export function TransactionList({ rows, partyLabel, caption }: { rows: Row[]; partyLabel: string; caption: string }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-[13.5px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-[#FAFBFD] text-left">
              {["Reference", "Item", partyLabel].map((h) => (
                <th key={h} scope="col" className="eyebrow px-4 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
              <th scope="col" className="eyebrow px-4 py-2.5 text-right font-semibold">
                Amount (UGX)
              </th>
              <th scope="col" className="eyebrow px-4 py-2.5 font-semibold">
                Status
              </th>
              <th scope="col" className="eyebrow px-4 py-2.5 font-semibold">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line-soft transition-colors duration-[var(--dur-fast)] last:border-b-0 hover:bg-[#F9FBFD]">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link href={r.href} className="ref font-medium underline-offset-2 hover:underline">
                    {r.reference}
                  </Link>
                </td>
                <td className="max-w-[260px] truncate px-4 py-3">
                  <Link href={r.href} className="font-medium text-ink underline-offset-2 hover:underline">
                    {r.itemName}
                  </Link>
                </td>
                <td className={cn("max-w-[180px] truncate px-4 py-3", !r.party && "text-ink-3")}>{r.party ?? r.partyFallback ?? "—"}</td>
                <td className="tnum whitespace-nowrap px-4 py-3 text-right font-semibold">{formatAmount(r.amount)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-3">{timeAgo(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="border-b border-line-soft last:border-b-0">
            <Link href={r.href} className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-sunken">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{r.itemName}</div>
                <div className="truncate text-[12px] text-ink-3">
                  {r.party ?? r.partyFallback ?? "—"} · {timeAgo(r.updatedAt)}
                </div>
              </div>
              <div className="grid justify-items-end gap-1">
                <span className="tnum text-[13.5px] font-semibold">{formatAmount(r.amount)}</span>
                <StatusPill status={r.status} size="sm" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function SearchForm({ action, q, placeholder, hidden }: { action: string; q?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form action={action} method="get" role="search" className="flex min-w-0 flex-1 gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-line bg-card pl-9 pr-3 text-[16px] placeholder:text-[#8797AB] hover:border-slate-300 focus:border-emerald focus:shadow-[0_0_0_3px_rgba(16,168,138,0.28)] focus:outline-none md:text-[14px]"
        />
      </label>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}

export function FilterChips({
  basePath,
  active,
  counts,
  total,
  q,
}: {
  basePath: string;
  active: TransactionStatus | "ALL";
  counts: Record<TransactionStatus, number>;
  total: number;
  q?: string;
}) {
  const chips: { key: TransactionStatus | "ALL"; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: total },
    ...TRANSACTION_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], count: counts[s] })),
  ];
  return (
    <nav aria-label="Filter by status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {chips.map((c) => {
        const params = new URLSearchParams();
        if (c.key !== "ALL") params.set("status", c.key);
        if (q) params.set("q", q);
        const href = params.size ? `${basePath}?${params}` : basePath;
        const on = c.key === active;
        return (
          <Link
            key={c.key}
            href={href}
            aria-current={on ? "true" : undefined}
            className={cn(
              "inline-flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors duration-[var(--dur-fast)]",
              on ? "border-navy bg-navy text-cloud" : "border-line bg-card text-ink-2 hover:border-slate-300",
            )}
          >
            {c.label}
            <b className={cn("tnum font-semibold", on ? "text-slate-300" : "text-ink-3")}>{c.count}</b>
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({ basePath, page, pageSize, total, params }: { basePath: string; page: number; pageSize: number; total: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    return sp.size ? `${basePath}?${sp}` : basePath;
  };
  const cls = "inline-flex h-9 items-center rounded-sm border border-line bg-card px-3 text-[13.5px] font-semibold hover:border-slate-300";
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-[13px] text-ink-3">
      <span>
        Page {page} of {pages} · {total} in total
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={link(page - 1)} className={cls}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={link(page + 1)} className={cls}>
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function ListCard({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      {header ? <div className="grid gap-3 border-b border-line p-4">{header}</div> : null}
      {children}
    </Card>
  );
}
