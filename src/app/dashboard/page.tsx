import { Check, Link2, Lock, Plus, Truck, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ListCard, SearchForm, TransactionList } from "@/components/transactions/list";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";
import { formatUGX, timeAgo } from "@/lib/format";
import { getSellerRecentEvents, getSellerStats, listSellerTransactions } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Overview" };

function eventIcon(type: string) {
  switch (type) {
    case "PAYMENT_SUCCEEDED":
      return { Icon: Lock, cls: "bg-emerald-50 text-emerald-700" };
    case "TRANSACTION_COMPLETED":
      return { Icon: Check, cls: "bg-emerald text-navy" };
    case "PAYMENT_FAILED":
    case "PAYMENT_CANCELLED":
    case "TRANSACTION_CANCELLED":
      return { Icon: X, cls: "bg-danger-bg text-danger" };
    case "DELIVERY_MARKED":
      return { Icon: Truck, cls: "bg-emerald-50 text-emerald-700" };
    default:
      return { Icon: Link2, cls: "bg-info-bg text-info" };
  }
}

export default async function SellerOverview() {
  const user = await requireUser(["SELLER"], "/dashboard");
  const [stats, recent, events] = await Promise.all([
    getSellerStats(user.id),
    listSellerTransactions(user.id, { page: 1 }),
    getSellerRecentEvents(user.id, 6),
  ]);
  const firstName = user.name.split(" ")[0];

  if (stats.total === 0) {
    return (
      <div className="grid gap-6">
        <PageHeader title={`Welcome, ${firstName}`} />
        <Card>
          <EmptyState
            icon={<LogoMark className="h-9 w-9" />}
            title="No transactions yet"
            actions={
              <>
                <ButtonLink href="/dashboard/links/new">
                  <Plus className="h-5 w-5" aria-hidden />
                  Create your first payment link
                </ButtonLink>
                <ButtonLink href="/#how-it-works" variant="quiet">
                  How Paylink works
                </ButtonLink>
              </>
            }
          >
            Create a payment link and share it with a buyer. When they open it or pay, you'll see it here with every step recorded.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const rows = recent.rows.slice(0, 6).map((t) => ({
    id: t.id,
    href: `/dashboard/transactions/${t.id}`,
    reference: t.reference,
    itemName: t.itemName,
    party: t.buyerName,
    partyFallback: t.paymentLink?.firstOpenedAt ? "Opened, not paid" : "Not yet opened",
    amount: t.amount,
    status: t.status,
    updatedAt: t.updatedAt,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Overview"
        actions={
          <ButtonLink href="/dashboard/links/new" className="max-lg:hidden">
            <Plus className="h-5 w-5" aria-hidden />
            New payment link
          </ButtonLink>
        }
      />

      <section aria-label="Transaction totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="stats">
        <StatCard label="All transactions" value={<span data-testid="stat-total">{stats.total}</span>} sub="Since you joined" />
        <StatCard
          label="In progress"
          value={<span data-testid="stat-in-progress">{stats.inProgress}</span>}
          sub={`${stats.counts.PENDING} awaiting payment · ${stats.counts.FUNDS_SECURED_DEMO} secured`}
        />
        <StatCard
          label="Completed"
          value={<span data-testid="stat-completed">{stats.counts.COMPLETED}</span>}
          sub={stats.counts.COMPLETED > 0 ? formatUGX(stats.completedValue) : "None yet"}
        />
        <StatCard
          label="Failed or cancelled"
          value={<span data-testid="stat-failed">{stats.failedOrCancelled}</span>}
          sub={`${stats.counts.PAYMENT_FAILED} failed · ${stats.counts.CANCELLED} cancelled`}
        />
      </section>

      <ListCard
        header={
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-[17px]">Recent transactions</h2>
            <div className="flex w-full min-w-0 sm:w-[380px]">
              <SearchForm action="/dashboard/transactions" placeholder="Search item, buyer or reference" />
            </div>
          </div>
        }
      >
        <TransactionList rows={rows} partyLabel="Buyer" caption="Your six most recently updated transactions" />
        {stats.total > rows.length ? (
          <div className="border-t border-line-soft px-4 py-3 text-[13.5px]">
            <Link href="/dashboard/transactions" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
              See all {stats.total} transactions
            </Link>
          </div>
        ) : null}
      </ListCard>

      <Card className="grid gap-4 p-4">
        <h2 className="text-[17px]">Recent activity</h2>
        <ul className="grid gap-x-6 gap-y-3.5 md:grid-cols-2" data-testid="recent-activity">
          {events.map((e) => {
            const { Icon, cls } = eventIcon(e.type);
            return (
              <li key={e.id} className="grid grid-cols-[28px_1fr] gap-2.5 text-[13.5px]">
                <span className={`grid h-7 w-7 place-items-center rounded-sm ${cls}`} aria-hidden>
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <div>{e.message}</div>
                  <div className="text-[12px] text-ink-3">
                    <Link href={`/dashboard/transactions/${e.transaction.id}`} className="ref !text-[12px] underline-offset-2 hover:underline">
                      {e.transaction.reference}
                    </Link>{" "}
                    · {timeAgo(e.createdAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
