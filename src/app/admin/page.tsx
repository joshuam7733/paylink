import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";
import { STATUS_LABELS, TRANSACTION_STATUSES } from "@/lib/domain/constants";
import { formatUGX, timeAgo } from "@/lib/format";
import { getAdminOverview } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  await requireUser(["ADMIN"], "/admin");
  const o = await getAdminOverview();
  return (
    <div className="grid gap-6">
      <PageHeader title="Platform overview">
        <p className="max-w-[60ch] text-[14px] text-ink-2">Every figure is counted from stored records. All payments on the platform are simulated in this phase.</p>
      </PageHeader>

      <section aria-label="Platform totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="admin-stats">
        <StatCard
          label="Registered users"
          value={<span data-testid="admin-users-total">{o.userTotal}</span>}
          sub={`${o.usersByRole.SELLER ?? 0} sellers · ${o.usersByRole.BUYER ?? 0} buyers · ${o.usersByRole.ADMIN ?? 0} admins`}
        />
        <StatCard label="Transactions" value={<span data-testid="admin-tx-total">{o.transactionTotal}</span>} sub={`${o.counts.PENDING} awaiting payment`} />
        <StatCard label="Completed" value={o.counts.COMPLETED} sub={o.counts.COMPLETED > 0 ? `${formatUGX(o.completedValue)} (simulated)` : "None yet"} />
        <StatCard label="Failed or cancelled" value={o.counts.PAYMENT_FAILED + o.counts.CANCELLED} sub={`${o.counts.PAYMENT_FAILED} failed · ${o.counts.CANCELLED} cancelled`} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="mb-3 text-[17px]">By status</h2>
          <dl className="grid gap-2 text-[14px]">
            {TRANSACTION_STATUSES.map((s) => (
              <div key={s} className="flex items-baseline justify-between gap-3">
                <dt>
                  <Link href={`/admin/transactions?status=${s}`} className="underline-offset-2 hover:underline">
                    {STATUS_LABELS[s]}
                  </Link>
                  <span className="ref ml-2 !text-[11px] text-ink-3">{s}</span>
                </dt>
                <dd className="tnum font-semibold">{o.counts[s]}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-[17px]">Latest activity</h2>
          {o.recent.length === 0 ? (
            <p className="text-[14px] text-ink-3">No activity yet. Events appear here as sellers create links and buyers pay.</p>
          ) : (
            <ul className="grid gap-3">
              {o.recent.map((e) => (
                <li key={e.id} className="text-[13.5px]">
                  <div>{e.message}</div>
                  <div className="text-[12px] text-ink-3">
                    <Link href={`/admin/transactions/${e.transaction.id}`} className="ref !text-[12px] underline-offset-2 hover:underline">
                      {e.transaction.reference}
                    </Link>{" "}
                    · {e.transaction.itemName} · {timeAgo(e.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
