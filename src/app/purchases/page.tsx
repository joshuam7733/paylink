import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { ListCard, TransactionList } from "@/components/transactions/list";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";
import { listBuyerPurchases } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "My purchases" };

export default async function PurchasesPage() {
  const user = await requireUser(["BUYER"], "/purchases");
  // Only transactions this buyer paid for while signed in.
  const purchases = await listBuyerPurchases(user.id);
  const rows = purchases.map((t) => ({
    id: t.id,
    href: `/t/${t.reference}`,
    reference: t.reference,
    itemName: t.itemName,
    party: t.seller.sellerProfile?.businessName ?? t.seller.name,
    amount: t.amount,
    status: t.status,
    updatedAt: t.updatedAt,
  }));
  return (
    <div className="grid gap-6">
      <PageHeader title="My purchases">
        <p className="max-w-[60ch] text-[14px] text-ink-2">Orders you've paid for through a Paylink while signed in.</p>
      </PageHeader>
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<ShoppingBag className="h-7 w-7" strokeWidth={1.75} aria-hidden />} title="No purchases yet">
            When a seller sends you a Paylink, open it while you're signed in and pay. The order will appear here with every step recorded.
          </EmptyState>
        </Card>
      ) : (
        <ListCard>
          <TransactionList rows={rows} partyLabel="Seller" caption="Your purchases" />
        </ListCard>
      )}
    </div>
  );
}
