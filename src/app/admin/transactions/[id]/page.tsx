import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSteps, EventLog, Timeline } from "@/components/transactions/timeline";
import { Card, PageHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { requireUser } from "@/lib/auth/current";
import { paymentLinkUrl } from "@/lib/config";
import { deliverySummary } from "@/lib/delivery";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/domain/constants";
import { formatDate, formatDateTime, formatUGX } from "@/lib/format";
import { getAdminTransaction, linkState } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Transaction (admin)" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-2 text-[14px]">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function AdminTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"], "/admin/transactions");
  const { id } = await params;
  const tx = await getAdminTransaction(id);
  if (!tx) notFound();
  const link = tx.paymentLink;
  const steps = buildSteps(tx, link?.firstOpenedAt ?? null, "ADMIN");

  return (
    <div className="grid gap-6">
      <PageHeader
        title={tx.itemName}
        eyebrow={
          <Link href="/admin/transactions" className="underline-offset-2 hover:underline">
            All transactions
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="ref" data-testid="reference">
            {tx.reference}
          </span>
          <StatusPill status={tx.status} />
          <span className="ref !text-[11.5px] text-ink-3" data-testid="raw-status">
            {tx.status}
          </span>
        </div>
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Card className="p-5">
            <h2 className="mb-2 text-[17px]">Details</h2>
            <dl className="divide-y divide-line-soft">
              <Row label="Amount">
                <b className="tnum">{formatUGX(tx.amount)}</b> {tx.isDemo ? <span className="text-ink-3">(simulated)</span> : null}
              </Row>
              <Row label="Seller">
                {tx.seller.sellerProfile?.businessName ?? tx.seller.name}
                <span className="block text-ink-3">{tx.seller.email}</span>
              </Row>
              <Row label="Buyer">
                {tx.buyerName ? (
                  <>
                    {tx.buyerName} {tx.buyer ? <span className="text-ink-3">(registered: {tx.buyer.email})</span> : <span className="text-ink-3">(guest)</span>}
                    <span className="block text-ink-3">
                      {tx.buyerPhone}
                      {tx.buyerEmail ? ` · ${tx.buyerEmail}` : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-ink-3">No buyer yet</span>
                )}
              </Row>
              <Row label="Description">
                <span className="whitespace-pre-line text-ink-2">{tx.description}</span>
              </Row>
              <Row label="Quantity">{tx.quantity}</Row>
              <Row label="Delivery">
                {deliverySummary(tx.deliveryMethod, tx.deliveryArea, tx.deliveryTimeframe)}
                {tx.deliveryNotes ? <span className="block text-ink-3">{tx.deliveryNotes}</span> : null}
              </Row>
              {link ? (
                <Row label="Payment link">
                  <span className="ref break-all">{paymentLinkUrl(link.slug)}</span>
                  <span className="block text-ink-3">
                    {linkState(link, tx.status)} · opened {link.openCount} {link.openCount === 1 ? "time" : "times"} · {link.expiresAt ? `expiry ${formatDate(link.expiresAt)}` : "no expiry"}
                  </span>
                </Row>
              ) : null}
              <Row label="Created">{formatDateTime(tx.createdAt)}</Row>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-[17px]">Payment attempts</h2>
            {tx.paymentAttempts.length === 0 ? (
              <p className="text-[14px] text-ink-3">No payment has been attempted.</p>
            ) : (
              <ul className="grid gap-3" data-testid="attempts">
                {tx.paymentAttempts.map((a) => (
                  <li key={a.id} className="grid gap-0.5 text-[14px]">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span>
                        <b>{a.status}</b> · {a.provider} · {PAYMENT_METHOD_LABELS[a.method as PaymentMethod] ?? a.method} · {a.payerName} ({a.payerPhone})
                      </span>
                      <span className="text-[12.5px] text-ink-3">{formatDateTime(a.createdAt)}</span>
                    </div>
                    <span className="text-[13px] text-ink-3">
                      {formatUGX(a.amount)} · simulated outcome {a.simulatedOutcome ?? "n/a"}
                      {a.providerReference ? ` · ref ${a.providerReference}` : ""}
                      {a.failureReason ? ` · ${a.failureReason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-[17px]">Event history</h2>
            <EventLog events={tx.events} />
          </Card>
        </div>
        <Card className="p-5">
          <h2 className="mb-4 text-[17px]">Progress</h2>
          <Timeline steps={steps} />
        </Card>
      </div>
    </div>
  );
}
