import { CircleCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelTransaction, MarkDeliveredForm } from "@/components/seller/transaction-actions";
import { buildSteps, EventLog, Timeline } from "@/components/transactions/timeline";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { CopyButton, ShareButton } from "@/components/ui/client";
import { StatusPill } from "@/components/ui/status-pill";
import { requireUser } from "@/lib/auth/current";
import { paymentLinkUrl } from "@/lib/config";
import { deliverySummary } from "@/lib/delivery";
import { PAYMENT_METHOD_LABELS, SELLER_CANCELLABLE_STATUSES, type PaymentMethod, type TransactionStatus } from "@/lib/domain/constants";
import { formatDate, formatDateTime, formatUGX } from "@/lib/format";
import { getSellerTransaction, linkState } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Transaction" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2 text-[14px]">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

const ATTEMPT_LABEL: Record<string, string> = { INITIATED: "Started", SUCCEEDED: "Succeeded", FAILED: "Failed", CANCELLED: "Cancelled by buyer" };

export default async function SellerTransactionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser(["SELLER"], "/dashboard/transactions");
  const { id } = await params;
  const { created } = await searchParams;
  // Scoped to this seller: another seller's ID returns "not found", never their data.
  const tx = await getSellerTransaction(user.id, id);
  if (!tx || !tx.paymentLink) notFound();

  const link = tx.paymentLink;
  const state = linkState(link, tx.status);
  const url = paymentLinkUrl(link.slug);
  const steps = buildSteps(tx, link.firstOpenedAt, "SELLER");
  const canCancel = SELLER_CANCELLABLE_STATUSES.includes(tx.status as TransactionStatus);
  const canDeliver = tx.status === "FUNDS_SECURED_DEMO" && !tx.deliveredAt;
  const shareText = `Pay for ${tx.itemName} (${formatUGX(tx.amount)}) with Paylink:`;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={tx.itemName}
        eyebrow={
          <Link href="/dashboard/transactions" className="underline-offset-2 hover:underline">
            Transactions
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="ref" data-testid="reference">
            {tx.reference}
          </span>
          <StatusPill status={tx.status} />
        </div>
      </PageHeader>

      {state === "OPEN" ? (
        <Card className={`grid gap-3 p-4 ${created ? "border-emerald" : ""}`} data-testid="share-card">
          <div className="flex items-center gap-2">
            {created ? <CircleCheck className="h-5 w-5 text-emerald-700" strokeWidth={1.75} aria-hidden /> : null}
            <h2 className="text-[17px]">{created ? "Link ready to share" : "Payment link"}</h2>
          </div>
          <p className="text-[14px] text-ink-2">
            Send this to your buyer. {link.expiresAt ? `It can be paid until ${formatDate(link.expiresAt)}.` : "It doesn't expire."}
          </p>
          <div className="flex gap-2">
            <div className="ref flex h-11 min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-md bg-sunken px-3 !text-[14px] text-ink" data-testid="pay-url">
              {url}
            </div>
            <CopyButton text={url} iconOnly label="Copy payment link" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareButton url={url} text={shareText} size="sm" />
            <ButtonLink href={`/pay/${link.slug}`} variant="quiet" size="sm" target="_blank">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open as buyer
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Card className="p-5">
            <h2 className="mb-2 text-[17px]">Details</h2>
            <dl className="divide-y divide-line-soft">
              <Row label="Amount">
                <b className="tnum">{formatUGX(tx.amount)}</b>
              </Row>
              <Row label="Quantity">{tx.quantity}</Row>
              <Row label="Description">
                <span className="whitespace-pre-line text-ink-2">{tx.description}</span>
              </Row>
              <Row label="Delivery">
                {deliverySummary(tx.deliveryMethod, tx.deliveryArea, tx.deliveryTimeframe)}
                {tx.deliveryNotes ? <span className="block text-ink-3">{tx.deliveryNotes}</span> : null}
              </Row>
              <Row label="Buyer">
                {tx.buyerName ? (
                  <>
                    {tx.buyerName}
                    <span className="block text-ink-3">
                      {tx.buyerPhone}
                      {tx.buyerEmail ? ` · ${tx.buyerEmail}` : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-ink-3">{link.firstOpenedAt ? "Opened the link, hasn't paid yet" : "Hasn't opened the link yet"}</span>
                )}
              </Row>
              <Row label="Link">
                {state === "OPEN" ? "Open for payment" : state === "EXPIRED" ? "Expired" : state === "PAID" || state === "COMPLETED" ? "Used" : "Disabled"} · opened {link.openCount}{" "}
                {link.openCount === 1 ? "time" : "times"}
                {link.expiresAt && state !== "OPEN" ? <span className="block text-ink-3">Expiry was {formatDate(link.expiresAt)}</span> : null}
              </Row>
            </dl>
          </Card>

          {tx.paymentAttempts.length > 0 ? (
            <Card className="p-5">
              <h2 className="mb-3 text-[17px]">Payment attempts</h2>
              <ul className="grid gap-3" data-testid="attempts">
                {tx.paymentAttempts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[14px]">
                    <span>
                      <b>{ATTEMPT_LABEL[a.status] ?? a.status}</b> · {PAYMENT_METHOD_LABELS[a.method as PaymentMethod] ?? a.method} · {a.payerPhone}
                      {a.failureReason ? <span className="block text-[13px] text-ink-3">{a.failureReason}</span> : null}
                    </span>
                    <span className="text-[12.5px] text-ink-3">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="mb-3 text-[17px]">History</h2>
            <EventLog events={tx.events} />
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="p-5">
            <h2 className="mb-4 text-[17px]">Progress</h2>
            <Timeline steps={steps} />
          </Card>
          {canDeliver || canCancel ? (
            <Card className="grid gap-3 p-5">
              <h2 className="text-[17px]">Actions</h2>
              {canDeliver ? (
                <>
                  <p className="text-[14px] text-ink-2">Once you've handed over the order, mark it as delivered. The buyer then confirms and the deal completes.</p>
                  <MarkDeliveredForm transactionId={tx.id} />
                </>
              ) : null}
              {canCancel ? (
                <>
                  <p className="text-[14px] text-ink-2">Cancel if the sale is off. The link stops working straight away.</p>
                  <div>
                    <CancelTransaction transactionId={tx.id} reference={tx.reference} itemName={tx.itemName} />
                  </div>
                </>
              ) : null}
            </Card>
          ) : tx.status === "FUNDS_SECURED_DEMO" ? (
            <Card className="p-5 text-[14px] text-ink-2">Marked as delivered. Waiting for the buyer to confirm they've received the order.</Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
