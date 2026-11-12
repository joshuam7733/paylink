import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/client";
import { StatusPill } from "@/components/ui/status-pill";
import { requireUser } from "@/lib/auth/current";
import { paymentLinkUrl } from "@/lib/config";
import { formatDate, formatUGX } from "@/lib/format";
import { linkState, listSellerLinks, type LinkState } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Payment links" };

const LINK_STATE_TEXT: Record<LinkState, string> = {
  OPEN: "Open for payment",
  EXPIRED: "Expired",
  DISABLED: "Disabled",
  PAID: "Paid",
  COMPLETED: "Paid and completed",
  CANCELLED: "Cancelled",
};

export default async function LinksPage() {
  const user = await requireUser(["SELLER"], "/dashboard/links");
  const txs = await listSellerLinks(user.id);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payment links"
        actions={
          <ButtonLink href="/dashboard/links/new" className="max-lg:hidden">
            <Plus className="h-5 w-5" aria-hidden />
            New payment link
          </ButtonLink>
        }
      >
        <p className="max-w-[60ch] text-[14px] text-ink-2">Each link is for one sale. Share it with your buyer in any chat; it stops working once it's paid, cancelled or expired.</p>
      </PageHeader>

      {txs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LogoMark className="h-9 w-9" />}
            title="No payment links yet"
            actions={
              <ButtonLink href="/dashboard/links/new">
                <Plus className="h-5 w-5" aria-hidden />
                Create your first payment link
              </ButtonLink>
            }
          >
            A payment link shows your buyer who you are, what they're paying for and how it will be delivered.
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3" data-testid="links-list">
          {txs.map((t) => {
            const link = t.paymentLink;
            if (!link) return null;
            const state = linkState(link, t.status);
            const url = paymentLinkUrl(link.slug);
            return (
              <li key={t.id}>
                <Card className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={`/dashboard/transactions/${t.id}`} className="truncate text-[15px] font-semibold underline-offset-2 hover:underline">
                        {t.itemName}
                      </Link>
                      <StatusPill status={t.status} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-ink-3">
                      <span className="ref">{t.reference}</span>
                      <span className="tnum font-semibold text-ink-2">{formatUGX(t.amount)}</span>
                      <span>{LINK_STATE_TEXT[state]}</span>
                      <span>
                        {link.openCount} {link.openCount === 1 ? "open" : "opens"}
                      </span>
                      {state === "OPEN" ? <span>{link.expiresAt ? `Expires ${formatDate(link.expiresAt)}` : "No expiry"}</span> : null}
                    </div>
                    {state === "OPEN" ? <div className="ref truncate rounded-sm bg-sunken px-2.5 py-1.5">{url}</div> : null}
                  </div>
                  <div className="flex gap-2">
                    {state === "OPEN" ? <CopyButton text={url} size="sm" /> : null}
                    <ButtonLink href={`/dashboard/transactions/${t.id}`} variant="secondary" size="sm">
                      View
                    </ButtonLink>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
