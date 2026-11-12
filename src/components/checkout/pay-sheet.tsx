"use client";

import { FlaskConical } from "lucide-react";
import { useActionState, useState } from "react";
import { payAction, type PayState } from "@/actions/buyer";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { Dialog } from "@/components/ui/dialog";
import { describedBy, Field, FormError, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type DemoOutcome, type PaymentMethod } from "@/lib/domain/constants";

const OUTCOMES: { value: DemoOutcome; label: string }[] = [
  { value: "SUCCESS", label: "Succeeds" },
  { value: "FAILURE", label: "Fails" },
  { value: "CANCEL", label: "Cancelled" },
];

export function PaySheet({
  slug,
  amountLabel,
  isDemo,
  defaults,
  retry,
}: {
  slug: string;
  amountLabel: string;
  isDemo: boolean;
  defaults?: { name?: string; phone?: string; email?: string };
  retry?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<PayState, FormData>(payAction, {});
  const [method, setMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [outcome, setOutcome] = useState<DemoOutcome>("SUCCESS");
  const [form, setForm] = useState({ payerName: defaults?.name ?? "", payerPhone: defaults?.phone ?? "", payerEmail: defaults?.email ?? "" });
  const fe = state.fieldErrors ?? {};
  const failed = state.ok && state.status === "PAYMENT_FAILED";


  return (
    <>
      <Button size="lg" block onClick={() => setOpen(true)} data-testid="open-pay">
        {retry ? `Try again · ${amountLabel}` : `Pay ${amountLabel}`}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={`Pay ${amountLabel}`} description="Pay with mobile money. You'll approve the payment on your phone.">
        <form action={action} className="grid gap-3.5" noValidate>
          <input type="hidden" name="slug" value={slug} />
          {failed ? (
            <FormError message="The payment didn't go through and nothing was taken. Check your number and try again." />
          ) : (
            <FormError message={state.error} />
          )}

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[13px] font-semibold">Mobile money network</legend>
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-3 text-[14px] transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
                  method === m ? "border-emerald bg-[#FBFEFD] shadow-[0_0_0_1px_var(--pl-emerald)]" : "border-line hover:border-slate-300",
                )}
              >
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                <span aria-hidden className={cn("grid h-[18px] w-[18px] flex-none place-items-center rounded-full border-[1.5px]", method === m ? "border-emerald" : "border-slate-300")}>
                  {method === m ? <span className="h-2 w-2 rounded-full bg-emerald" /> : null}
                </span>
                <b className="font-semibold">{PAYMENT_METHOD_LABELS[m]}</b>
              </label>
            ))}
          </fieldset>

          <Field id="payerPhone" label="Mobile money number" error={fe.payerPhone} hint="Format: 0772 123 456">
            <Input
              id="payerPhone"
              name="payerPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.payerPhone}
              onChange={(e) => setForm((p) => ({ ...p, payerPhone: e.target.value }))}
              invalid={!!fe.payerPhone}
              aria-describedby={describedBy("payerPhone", fe.payerPhone, true)}
              required
            />
          </Field>
          <Field id="payerName" label="Your name" error={fe.payerName} hint="So the seller knows who paid.">
            <Input
              id="payerName"
              name="payerName"
              autoComplete="name"
              value={form.payerName}
              onChange={(e) => setForm((p) => ({ ...p, payerName: e.target.value }))}
              invalid={!!fe.payerName}
              aria-describedby={describedBy("payerName", fe.payerName, true)}
              required
            />
          </Field>
          <Field id="payerEmail" label="Email for updates" optional error={fe.payerEmail}>
            <Input
              id="payerEmail"
              name="payerEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.payerEmail}
              onChange={(e) => setForm((p) => ({ ...p, payerEmail: e.target.value }))}
              invalid={!!fe.payerEmail}
              aria-describedby={describedBy("payerEmail", fe.payerEmail)}
            />
          </Field>

          {isDemo ? (
            <fieldset className="grid gap-2 rounded-[12px] border border-warn-line bg-warn-bg p-2.5" data-testid="demo-outcome">
              <legend className="sr-only">Demo outcome</legend>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-warn">
                <FlaskConical className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Demo outcome · nothing is sent to a mobile money provider
              </span>
              <div className="flex gap-0.5 rounded-md bg-[rgba(255,255,255,0.6)] p-[3px]">
                {OUTCOMES.map((o) => (
                  <label
                    key={o.value}
                    className={cn(
                      "grid h-9 flex-1 cursor-pointer place-items-center rounded-sm text-[13.5px] transition-colors duration-[var(--dur-fast)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald",
                      outcome === o.value ? "bg-card font-semibold text-ink shadow-xs" : "font-medium text-ink-2",
                    )}
                  >
                    <input type="radio" name="outcome" value={o.value} checked={outcome === o.value} onChange={() => setOutcome(o.value)} className="sr-only" />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <input type="hidden" name="outcome" value="SUCCESS" />
          )}

          <SubmitButton size="lg" block pendingText="Processing payment…">
            {outcome === "CANCEL" && isDemo ? "Cancel this payment" : `Pay ${amountLabel}`}
          </SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
