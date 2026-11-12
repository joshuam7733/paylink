import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

type StepState = "done" | "now" | "todo" | "failed" | "cancelled";
type Step = { key: string; title: string; note?: string; state: StepState };

type TimelineTx = {
  status: string;
  createdAt: Date;
  securedAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  deliveryTimeframe: string | null;
};

/** The single progress timeline both parties share. Built only from recorded timestamps. */
export function buildSteps(tx: TimelineTx, firstOpenedAt: Date | null, viewer: "SELLER" | "BUYER" | "ADMIN"): Step[] {
  const steps: Step[] = [
    { key: "created", title: "Link created", note: formatDateTime(tx.createdAt), state: "done" },
    {
      key: "opened",
      title: viewer === "BUYER" ? "You reviewed the deal" : "Buyer opened the link",
      note: firstOpenedAt ? formatDateTime(firstOpenedAt) : viewer === "SELLER" ? "Waiting for the buyer to open it" : undefined,
      state: firstOpenedAt || tx.securedAt ? "done" : "todo",
    },
    {
      key: "paid",
      title: tx.status === "PAYMENT_FAILED" ? "Payment failed" : "Payment secured",
      note: tx.securedAt
        ? formatDateTime(tx.securedAt)
        : tx.status === "PAYMENT_FAILED"
          ? viewer === "BUYER"
            ? "You can try again from the payment link"
            : "The buyer can try again from the same link"
          : "Waiting for payment",
      state: tx.securedAt ? "done" : tx.status === "PAYMENT_FAILED" ? "failed" : "todo",
    },
    {
      key: "delivered",
      title: "Delivered",
      note: tx.deliveredAt ? formatDateTime(tx.deliveredAt) : (tx.deliveryTimeframe ?? undefined),
      state: tx.deliveredAt ? "done" : "todo",
    },
    {
      key: "completed",
      title: "Completed",
      note: tx.completedAt ? formatDateTime(tx.completedAt) : viewer === "BUYER" ? "When you confirm delivery" : "When the buyer confirms delivery",
      state: tx.completedAt ? "done" : "todo",
    },
  ];

  if (tx.status === "CANCELLED") {
    const kept = steps.filter((s) => s.state === "done");
    kept.push({ key: "cancelled", title: "Cancelled", note: tx.cancelledAt ? formatDateTime(tx.cancelledAt) : undefined, state: "cancelled" });
    return kept;
  }
  // The first unfinished step is the current one.
  const next = steps.find((s) => s.state === "todo");
  if (next && tx.status !== "PAYMENT_FAILED") next.state = "now";
  return steps;
}

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid" data-testid="timeline">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.key} data-state={s.state} className="relative grid grid-cols-[24px_1fr] gap-3 pb-4 last:pb-0">
            {!last ? (
              <span aria-hidden className={cn("absolute bottom-0 left-[11px] top-6 w-0.5", s.state === "done" ? "bg-emerald" : "bg-line")} />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border-2 bg-card",
                s.state === "done" && "border-emerald bg-emerald text-navy",
                s.state === "now" && "border-emerald shadow-[0_0_0_4px_rgba(16,168,138,0.18)]",
                s.state === "todo" && "border-line",
                s.state === "failed" && "border-danger bg-danger-bg text-danger",
                s.state === "cancelled" && "border-slate-300 bg-sunken text-ink-2",
              )}
            >
              {s.state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
              {s.state === "now" ? <span className="h-2 w-2 rounded-full bg-emerald" /> : null}
              {s.state === "failed" || s.state === "cancelled" ? <X className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
            </span>
            <div className="min-w-0 pt-px">
              <div className={cn("text-[14px]", s.state === "todo" ? "font-medium text-ink-3" : "font-semibold text-ink", s.state === "failed" && "text-danger")}>
                {s.title}
                <span className="sr-only">
                  {s.state === "done" ? " (done)" : s.state === "now" ? " (current step)" : s.state === "todo" ? " (not yet)" : ""}
                </span>
              </div>
              {s.note ? <div className="text-[12px] text-ink-3">{s.note}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const actorLabel: Record<string, string> = { SELLER: "Seller", BUYER: "Buyer", ADMIN: "Admin", SYSTEM: "Paylink" };

export function EventLog({ events }: { events: { id: string; message: string; actorType: string; createdAt: Date; toStatus: string | null }[] }) {
  if (events.length === 0) return <p className="text-[14px] text-ink-3">Nothing has happened on this transaction yet.</p>;
  return (
    <ul className="grid gap-3" data-testid="event-log">
      {events.map((e) => (
        <li key={e.id} className="grid grid-cols-[72px_1fr] gap-3 text-[13.5px]">
          <span className="eyebrow pt-0.5 !text-[10.5px]">{actorLabel[e.actorType] ?? e.actorType}</span>
          <div className="min-w-0">
            <div className="text-ink">{e.message}</div>
            <div className="text-[12px] text-ink-3">{formatDateTime(e.createdAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
