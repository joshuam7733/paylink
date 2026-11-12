import { Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { FilterChips, ListCard, Pagination, SearchForm, TransactionList } from "@/components/transactions/list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";
import { getSellerStats, listSellerTransactions, parseStatusFilter } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Transactions" };

export default async function SellerTransactions({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requireUser(["SELLER"], "/dashboard/transactions");
  const sp = await searchParams;
  const status = parseStatusFilter(sp.status);
  const q = sp.q?.trim() || undefined;
  const page = Number(sp.page) || 1;
  const [stats, list] = await Promise.all([getSellerStats(user.id), listSellerTransactions(user.id, { q, status, page })]);

  const rows = list.rows.map((t) => ({
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
        title="Transactions"
        actions={
          <ButtonLink href="/dashboard/links/new" className="max-lg:hidden">
            <Plus className="h-5 w-5" aria-hidden />
            New payment link
          </ButtonLink>
        }
      />
      <ListCard
        header={
          <>
            <SearchForm action="/dashboard/transactions" q={q} placeholder="Search item, buyer or reference" hidden={{ status: status === "ALL" ? undefined : status }} />
            <FilterChips basePath="/dashboard/transactions" active={status} counts={stats.counts} total={stats.total} q={q} />
          </>
        }
      >
        {rows.length > 0 ? (
          <>
            <TransactionList rows={rows} partyLabel="Buyer" caption="Your transactions" />
            <Pagination basePath="/dashboard/transactions" page={list.page} pageSize={list.pageSize} total={list.total} params={{ q, status: status === "ALL" ? undefined : status }} />
          </>
        ) : stats.total === 0 ? (
          <EmptyState
            title="No transactions yet"
            actions={
              <ButtonLink href="/dashboard/links/new">
                <Plus className="h-5 w-5" aria-hidden />
                Create a payment link
              </ButtonLink>
            }
          >
            Each payment link you create becomes a transaction you can follow here.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<SearchX className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
            title="Nothing matches"
            actions={
              <ButtonLink href="/dashboard/transactions" variant="secondary">
                Clear search and filters
              </ButtonLink>
            }
          >
            {q ? `No transactions match "${q}"${status !== "ALL" ? " with this status" : ""}.` : "No transactions have this status."} Try a reference like PL-7QK2M9, an item name or a buyer's name.
          </EmptyState>
        )}
      </ListCard>
    </div>
  );
}
