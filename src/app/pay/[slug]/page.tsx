import { CircleAlert, Clock3, Eye, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { PaySheet } from "@/components/checkout/pay-sheet";
import { Avatar } from "@/components/layout/app-shell";
import { DemoBar } from "@/components/layout/demo-notice";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageFade } from "@/components/ui/client";
import { getCurrentUser } from "@/lib/auth/current";
import { deliverySummary } from "@/lib/delivery";
import { formatAmount, formatDate, formatUGX } from "@/lib/format";
import { getCheckout, recordLinkOpen } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

function Notice({ tone, title, children }: { tone: "info" | "danger" | "neutral"; title: string; children: React.ReactNode }) {
  const cls = tone === "danger" ? "border-[#EBC3C0] bg-danger-bg text-danger" : tone === "info" ? "border-[#CFE0F0] bg-info-bg text-info" : "border-line bg-sunken text-ink-2";
  return (
    <div role="status" className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[14px] ${cls}`}>
      {tone === "info" ? <Eye className="mt-0.5 h-4 w-4 flex-none" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden />}
      <div>
        <b className="block font-semibold">{title}</b>
        <span className={tone === "neutral" ? "" : "opacity-90"}>{children}</span>
      </div>
    </div>
  );
}

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const checkout = await getCheckout(slug);
  if (!checkout) notFound();
  const tx = checkout.transaction;
  const user = await getCurrentUser();
  const isSeller = user?.id === tx.sellerId;
  const isAdmin = user?.role === "ADMIN";
  if (checkout.state === "OPEN") await recordLinkOpen(slug, user?.id ?? null);

  const sellerName = tx.seller.sellerProfile?.businessName ?? tx.seller.name;
  const joined = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(tx.seller.createdAt);
  const amountLabel = formatUGX(tx.amount);
  const canPay = checkout.state === "OPEN" && !isSeller && !isAdmin;

  return (
    <div className="flex min-h-dvh flex-col">
      {tx.isDemo ? <DemoBar audience="checkout" /> : null}
      <header className="border-b border-line bg-card">
        <div className="page-gutter mx-auto flex h-[52px] w-full max-w-[560px] items-center justify-between">
          <Link href="/" aria-label="Paylink home">
            <Logo size="sm" />
          </Link>
          <span className="ref" data-testid="reference">
            {tx.reference}
          </span>
        </div>
      </header>

      <main className="page-gutter mx-auto w-full max-w-[560px] flex-1 pb-36 pt-4 sm:pb-10 sm:pt-6">
        <PageFade>
          <div className="grid gap-3">
            {isSeller ? (
              <Notice tone="info" title="This is your own payment link">
                Buyers see this page when they open your link. You can't pay it yourself.
              </Notice>
            ) : null}
            {checkout.state === "EXPIRED" ? (
              <Notice tone="neutral" title="This payment link has expired">
                Ask {sellerName} to send you a new link.
              </Notice>
            ) : null}
            {checkout.state === "DISABLED" || checkout.state === "CANCELLED" ? (
              <Notice tone="neutral" title="This payment link was cancelled">
                It can no longer be paid. If you still want the item, ask {sellerName} for a new link.
              </Notice>
            ) : null}
            {checkout.state === "PAID" || checkout.state === "COMPLETED" ? (
              <Notice tone="neutral" title="This payment link has already been paid">
                Each link is for one sale. If you paid it, follow your order below.
              </Notice>
            ) : null}
            {checkout.state === "OPEN" && tx.status === "PAYMENT_FAILED" && !isSeller ? (
              <Notice tone="danger" title="The last payment didn't go through">
                Nothing was taken. Check your mobile money number and try again.
              </Notice>
            ) : null}

            <Card className="flex items-center gap-3 p-3.5">
              <Avatar name={sellerName} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[15px]" data-testid="seller-name">
                  {sellerName}
                </b>
                <span className="text-[12px] text-ink-3">
                  {checkout.completedDeals > 0 ? `${checkout.completedDeals} completed ${checkout.completedDeals === 1 ? "deal" : "deals"} · ` : ""}
                  on Paylink since {joined}
                  {tx.seller.sellerProfile?.location ? ` · ${tx.seller.sellerProfile.location}` : ""}
                </span>
              </div>
            </Card>

            <Card className="grid gap-2 p-4">
              <h1 className="font-sans text-[17px] font-semibold leading-snug tracking-normal" data-testid="item-name">
                {tx.itemName}
              </h1>
              <p className="whitespace-pre-line break-words text-[14px] text-ink-2">{tx.description}</p>
              {tx.quantity > 1 ? <p className="text-[13px] text-ink-3">Quantity: {tx.quantity}</p> : null}
              <div className="tnum mt-1.5 font-display text-[34px] font-[650] leading-none tracking-[-0.03em]" data-testid="amount">
                <small className="mr-1 font-sans text-[14px] font-semibold tracking-normal text-ink-2">UGX</small>
                {formatAmount(tx.amount)}
              </div>
            </Card>

            <Card className="grid gap-2.5 p-3.5 text-[13.5px] text-ink-2">
              <div className="flex items-start gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} aria-hidden />
                <div>
                  <b className="block font-semibold text-ink">{deliverySummary(tx.deliveryMethod, tx.deliveryArea, tx.deliveryTimeframe)}</b>
                  {tx.deliveryNotes}
                </div>
              </div>
              {checkout.state === "OPEN" ? (
                <div className="flex items-start gap-2.5">
                  <Clock3 className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} aria-hidden />
                  <b className="font-semibold text-ink">{checkout.expiresAt ? `Link expires ${formatDate(checkout.expiresAt)}` : "This link doesn't expire"}</b>
                </div>
              ) : null}
            </Card>

            <section className="grid gap-2.5 rounded-lg bg-sunken px-4 py-3.5" aria-labelledby="how">
              <h2 id="how" className="font-sans text-[13.5px] font-semibold tracking-normal">
                How Paylink works
              </h2>
              <ol className="grid gap-2 text-[13px] text-ink-2">
                {["You pay through this link.", "The seller delivers your order.", "You confirm it arrived, and the deal completes."].map((s, i) => (
                  <li key={s} className="grid grid-cols-[22px_1fr] gap-2.5">
                    <span aria-hidden className="grid h-[22px] w-[22px] place-items-center rounded-full border border-line bg-card text-[11px] font-semibold text-ink">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <p className="text-[12.5px] text-ink-3">Every step is recorded, so you and the seller always see the same history.</p>
            </section>

            {checkout.state === "PAID" || checkout.state === "COMPLETED" || checkout.state === "CANCELLED" ? (
              <ButtonLink href={`/t/${tx.reference}`} variant="secondary" block>
                Track this order
              </ButtonLink>
            ) : null}
            {isSeller ? (
              <ButtonLink href={`/dashboard/transactions/${tx.id}`} variant="secondary" block>
                Back to this transaction
              </ButtonLink>
            ) : null}
          </div>
        </PageFade>
      </main>

      {canPay ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card sm:static sm:border-0 sm:bg-transparent">
          <div className="page-gutter mx-auto grid w-full max-w-[560px] gap-2 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 sm:pb-12 sm:pt-0">
            <PaySheet
              slug={slug}
              amountLabel={amountLabel}
              isDemo={tx.isDemo}
              retry={tx.status === "PAYMENT_FAILED"}
              defaults={user ? { name: user.name, phone: user.phone ?? undefined, email: user.email } : undefined}
            />
            <p className="text-center text-[12px] text-ink-3">{user ? `Paying as ${user.name}` : "No account needed to pay"}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
