import { Check, Clock3, Lock, SearchX, X } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ConfirmReceived } from "@/components/buyer/confirm-received";
import { DemoBar } from "@/components/layout/demo-notice";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton, PageFade } from "@/components/ui/client";
import { getCurrentUser, homePathFor } from "@/lib/auth/current";
import { buyerCookieName } from "@/lib/buyer-access";
import { trackingUrl } from "@/lib/config";
import { deliverySummary } from "@/lib/delivery";
import { formatUGX } from "@/lib/format";
import { linkState, resolveTrackingAccess, type Viewer } from "@/lib/services/transactions";
import { buildSteps, EventLog, Timeline } from "./timeline";

function hero(status: string, viewer: Viewer, sellerName: string, delivered: boolean) {
  const buyer = viewer === "BUYER";
  switch (status) {
    case "FUNDS_SECURED_DEMO":
      return {
        Icon: Lock,
        tone: "bg-emerald-50 text-emerald-700 ring-emerald",
        title: "Payment secured",
        text: buyer
          ? delivered
            ? `${sellerName} has marked your order as delivered. Confirm once you have it.`
            : `${sellerName} has been told to deliver your order.`
          : delivered
            ? "You've marked this as delivered. Waiting for the buyer to confirm."
            : "The buyer has paid. Deliver the order, then mark it as delivered.",
      };
    case "COMPLETED":
      return {
        Icon: Check,
        tone: "bg-emerald text-navy ring-emerald",
        title: "Deal completed",
        text: buyer ? "You confirmed the order arrived. Thanks for using Paylink." : "The buyer confirmed the order arrived.",
      };
    case "PAYMENT_FAILED":
      return {
        Icon: X,
        tone: "bg-danger-bg text-danger ring-danger",
        title: "Payment failed",
        text: buyer ? "Nothing was taken. You can try again from the payment link." : "The buyer's payment didn't go through. They can try again from the same link.",
      };
    case "CANCELLED":
      return { Icon: X, tone: "bg-sunken text-ink-2 ring-slate-300", title: "Transaction cancelled", text: "This deal was called off. Nothing was charged." };
    default:
      return { Icon: Clock3, tone: "bg-info-bg text-info ring-info", title: "Awaiting payment", text: buyer ? "This order hasn't been paid yet." : "Waiting for the buyer to pay." };
  }
}

function Shell({ reference, demo, children }: { reference?: string; demo?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {demo ? <DemoBar audience="tracking" /> : null}
      <header className="border-b border-line bg-card">
        <div className="page-gutter mx-auto flex h-[52px] w-full max-w-[560px] items-center justify-between">
          <Link href="/" aria-label="Paylink home">
            <Logo size="sm" />
          </Link>
          {reference ? (
            <span className="ref" data-testid="reference">
              {reference}
            </span>
          ) : null}
        </div>
      </header>
      <main className="page-gutter mx-auto w-full max-w-[560px] flex-1 pb-12 pt-4 sm:pt-6">
        <PageFade>{children}</PageFade>
      </main>
    </div>
  );
}

/** Shared by /t/[reference] and /t/[reference]/[key]. Access is decided on the server for every request. */
export async function TrackingView({ reference, pathKey }: { reference: string; pathKey?: string }) {
  const user = await getCurrentUser();
  const jar = await cookies();
  const cookieKey = jar.get(buyerCookieName(reference.toUpperCase()))?.value;
  const found = await resolveTrackingAccess(reference.toUpperCase(), {
    user: user ? { id: user.id, role: user.role } : null,
    keys: [cookieKey, pathKey],
  });

  if (!found) {
    // Same answer for "doesn't exist" and "not yours", so references can't be probed.
    return (
      <Shell>
        <Card className="grid justify-items-center gap-2.5 px-6 py-12 text-center">
          <span className="mb-1.5 grid h-16 w-16 place-items-center rounded-[18px] bg-sunken text-ink-2">
            <SearchX className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="text-[22px]">We can't show this transaction</h1>
          <p className="max-w-[40ch] text-[14px] text-ink-2">
            It may not exist, or this browser isn't the one that paid for it. Open the tracking link you were given, or sign in to the account you used.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {user ? <ButtonLink href={homePathFor(user.role)}>Go to your account</ButtonLink> : <ButtonLink href={`/login?next=${encodeURIComponent(`/t/${reference}`)}`}>Sign in</ButtonLink>}
          </div>
        </Card>
      </Shell>
    );
  }

  const { tx, viewer } = found;
  const sellerName = tx.seller.sellerProfile?.businessName ?? tx.seller.name;
  const h = hero(tx.status, viewer, sellerName, Boolean(tx.deliveredAt));
  const firstOpened = tx.events.find((e) => e.type === "LINK_OPENED")?.createdAt ?? null;
  const steps = buildSteps(tx, firstOpened, viewer);
  const link = tx.paymentLink;
  const canRetry = viewer === "BUYER" && tx.status === "PAYMENT_FAILED" && link && linkState(link, tx.status) === "OPEN";

  return (
    <Shell reference={tx.reference} demo={tx.isDemo}>
      <div className="grid gap-3">
        <Card className="overflow-hidden">
          <div className="grid justify-items-center gap-2 px-4 pb-2 pt-6 text-center">
            <span className={`pl-pop grid h-14 w-14 place-items-center rounded-full ring-2 ring-offset-4 ring-offset-card ${h.tone}`} aria-hidden>
              <h.Icon className="h-6 w-6" strokeWidth={1.9} />
            </span>
            <h1 className="mt-2 text-[23px]" data-testid="status-title" data-status={tx.status}>
              {h.title}
            </h1>
            <p className="max-w-[34ch] text-[13.5px] text-ink-2">{h.text}</p>
          </div>
          <div className="px-4 pb-4 pt-4">
            <Timeline steps={steps} />
          </div>
        </Card>

        <Card className="grid gap-1.5 p-4 text-[14px]">
          <div className="flex items-baseline justify-between gap-3">
            <b className="min-w-0 break-words">{tx.itemName}</b>
            <b className="tnum flex-none">{formatUGX(tx.amount)}</b>
          </div>
          <div className="text-[13px] text-ink-3">
            {viewer === "BUYER" ? `Sold by ${sellerName}` : tx.buyerName ? `Buyer: ${tx.buyerName}` : "No buyer yet"} · {deliverySummary(tx.deliveryMethod, tx.deliveryArea, tx.deliveryTimeframe)}
          </div>
        </Card>

        {viewer === "BUYER" && tx.status === "FUNDS_SECURED_DEMO" ? (
          <div className="grid gap-2">
            <ConfirmReceived reference={tx.reference} itemName={tx.itemName} sellerName={sellerName} accessKey={pathKey} />
            <p className="text-center text-[12.5px] text-ink-3">Something wrong with the order? Don't confirm. Contact {sellerName} first; dispute handling arrives in a later phase.</p>
          </div>
        ) : null}
        {canRetry && link ? (
          <ButtonLink href={`/pay/${link.slug}`} size="lg" block>
            Try the payment again
          </ButtonLink>
        ) : null}
        {viewer === "SELLER" ? (
          <ButtonLink href={`/dashboard/transactions/${tx.id}`} variant="secondary" block>
            Manage this transaction
          </ButtonLink>
        ) : null}
        {viewer === "ADMIN" ? (
          <ButtonLink href={`/admin/transactions/${tx.id}`} variant="secondary" block>
            Open in admin
          </ButtonLink>
        ) : null}

        <Card className="p-4">
          <h2 className="mb-3 text-[16px]">History</h2>
          <EventLog events={tx.events} />
        </Card>

        {viewer === "BUYER" && !user && (pathKey ?? cookieKey) ? (
          <Card className="grid gap-2 p-4">
            <h2 className="text-[16px]">Come back to this order</h2>
            <p className="text-[13.5px] text-ink-2">This browser remembers your order. To open it on another phone or computer, copy your private tracking link. Anyone with the link can see this order, so keep it to yourself.</p>
            <CopyButton text={trackingUrl(tx.reference, pathKey ?? cookieKey)} label="Copy tracking link" size="sm" className="justify-self-start" />
          </Card>
        ) : null}

        {viewer === "BUYER" && !user ? (
          <p className="text-center text-[12.5px] text-ink-3">
            <Link href={`/register?role=buyer&next=${encodeURIComponent(`/t/${tx.reference}`)}`} className="font-semibold text-emerald-700 underline underline-offset-2">
              Create an account
            </Link>{" "}
            to follow future orders in one place.
          </p>
        ) : null}
      </div>
    </Shell>
  );
}
