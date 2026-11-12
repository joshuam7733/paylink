import type { Metadata } from "next";
import { FilterChips, ListCard, Pagination, SearchForm, TransactionList } from "@/components/transactions/list";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";
import { getAdminOverview, listAllTransactions, parseStatusFilter } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "All transactions" };

export default async function AdminTransactions({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireUser(["ADMIN"], "/admin/transactions");
  const sp = await searchParams;
  const status = parseStatusFilter(sp.status);
  const q = sp.q?.trim() || undefined;
  const [overview, list] = await Promise.all([getAdminOverview(), listAllTransactions({ q, status, page: Number(sp.page) || 1 })]);
  const rows = list.rows.map((t) => ({
    id: t.id,
    href: `/admin/transactions/${t.id}`,
    reference: t.reference,
    itemName: t.itemName,
    party: t.seller.sellerProfile?.businessName ?? t.seller.email,
    amount: t.amount,
    status: t.status,
    updatedAt: t.updatedAt,
  }));
  return (
    <div className="grid gap-6">
      <PageHeader title="All transactions" />
      <ListCard
        header={
          <>
            <SearchForm action="/admin/transactions" q={q} placeholder="Search reference, item, buyer or seller" hidden={{ status: status === "ALL" ? undefined : status }} />
            <FilterChips basePath="/admin/transactions" active={status} counts={overview.counts} total={overview.transactionTotal} q={q} />
          </>
        }
      >
        {rows.length === 0 ? (
          <EmptyState title={overview.transactionTotal === 0 ? "No transactions yet" : "Nothing matches"}>
            {overview.transactionTotal === 0 ? "Transactions appear here as soon as a seller creates a payment link." : "Try a different search, or clear the status filter."}
          </EmptyState>
        ) : (
          <>
            <TransactionList rows={rows} partyLabel="Seller" caption="All transactions on the platform" />
            <Pagination basePath="/admin/transactions" page={list.page} pageSize={list.pageSize} total={list.total} params={{ q, status: status === "ALL" ? undefined : status }} />
          </>
        )}
      </ListCard>
    </div>
  );
}
