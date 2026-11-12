"use client";

import { Clock3, Truck } from "lucide-react";
import { useActionState, useState } from "react";
import { createLinkAction } from "@/actions/seller";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/client";
import { describedBy, Field, FormError, Input, inputClass, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { deliverySummary } from "@/lib/delivery";
import { DELIVERY_LABELS, DELIVERY_METHODS, DELIVERY_TIMEFRAMES, LINK_EXPIRY_OPTIONS, type DeliveryMethod } from "@/lib/domain/constants";
import { formatAmount, initials, parseAmount } from "@/lib/format";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

const SELLER_VIEW_LABELS: Record<DeliveryMethod, string> = {
  SELLER_DELIVERS: "I deliver",
  BUYER_COLLECTS: "Buyer collects",
  COURIER: "Courier",
};

export function NewLinkForm({ businessName }: { businessName: string }) {
  const [state, action] = useActionState(createLinkAction, initial);
  const [v, setV] = useState({
    itemName: "",
    description: "",
    amount: "",
    quantity: "1",
    deliveryMethod: "SELLER_DELIVERS" as DeliveryMethod,
    deliveryArea: "",
    deliveryTimeframe: "2–3 days after payment",
    deliveryNotes: "",
    expiry: "7",
  });
  const fe = state.fieldErrors ?? {};
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const amountNum = parseAmount(v.amount);
  const amountText = Number.isFinite(amountNum) && amountNum > 0 ? formatAmount(amountNum) : "0";

  return (
    <form action={action} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4">
        <FormError message={state.error} />
        <Card className="grid gap-4 p-5">
          <h2 className="font-sans text-[16px] font-semibold tracking-normal">What are you selling?</h2>
          <Field id="itemName" label="Item or service" error={fe.itemName} hint="Buyers see this as the title of the payment.">
            <Input id="itemName" name="itemName" value={v.itemName} onChange={set("itemName")} maxLength={120} invalid={!!fe.itemName} aria-describedby={describedBy("itemName", fe.itemName, true)} required />
          </Field>
          <Field id="description" label="Description" error={fe.description} hint="Be specific: size, colour, condition. It protects you if there's a disagreement later.">
            <Textarea id="description" name="description" value={v.description} onChange={set("description")} maxLength={1000} invalid={!!fe.description} aria-describedby={describedBy("description", fe.description, true)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Field id="amount" label="Amount" error={fe.amount} hint="The total the buyer pays, in Uganda shillings.">
              <div
                className={cn(
                  "flex overflow-hidden rounded-md border bg-card transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(16,168,138,0.28)]",
                  fe.amount ? "border-danger" : "border-line",
                )}
              >
                <span className="grid place-items-center border-r border-line bg-sunken px-3 text-[13px] font-semibold text-ink-2">UGX</span>
                <input
                  id="amount"
                  name="amount"
                  inputMode="numeric"
                  autoComplete="off"
                  value={v.amount}
                  onChange={(e) => setV((p) => ({ ...p, amount: e.target.value.replace(/[^\d,\s]/g, "") }))}
                  onBlur={() => {
                    const n = parseAmount(v.amount);
                    if (Number.isFinite(n)) setV((p) => ({ ...p, amount: formatAmount(n) }));
                  }}
                  aria-invalid={!!fe.amount || undefined}
                  aria-describedby={describedBy("amount", fe.amount, true)}
                  className="tnum h-11 min-w-0 flex-1 bg-transparent px-3 text-[17px] font-semibold focus:outline-none"
                  required
                />
              </div>
            </Field>
            <Field id="quantity" label="Quantity" error={fe.quantity}>
              <Input id="quantity" name="quantity" type="number" min={1} max={999} inputMode="numeric" value={v.quantity} onChange={set("quantity")} invalid={!!fe.quantity} aria-describedby={describedBy("quantity", fe.quantity)} />
            </Field>
          </div>
        </Card>

        <Card className="grid gap-4 p-5">
          <h2 className="font-sans text-[16px] font-semibold tracking-normal">Delivery</h2>
          <fieldset>
            <legend className="sr-only">How will the order reach the buyer?</legend>
            <div className="flex gap-0.5 rounded-md bg-sunken p-[3px]">
              {DELIVERY_METHODS.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "grid h-10 flex-1 cursor-pointer place-items-center whitespace-nowrap rounded-sm px-2 text-[13.5px] transition-colors duration-[var(--dur-fast)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald",
                    v.deliveryMethod === m ? "bg-card font-semibold text-ink shadow-xs" : "font-medium text-ink-2",
                  )}
                >
                  <input type="radio" name="deliveryMethod" value={m} checked={v.deliveryMethod === m} onChange={() => setV((p) => ({ ...p, deliveryMethod: m }))} className="sr-only" />
                  {SELLER_VIEW_LABELS[m]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="deliveryArea"
              label={v.deliveryMethod === "BUYER_COLLECTS" ? "Collection point" : "Delivery area"}
              error={fe.deliveryArea}
              hint={v.deliveryMethod === "BUYER_COLLECTS" ? "For example: Ntinda, Kampala" : "For example: Kampala and Wakiso"}
            >
              <Input id="deliveryArea" name="deliveryArea" value={v.deliveryArea} onChange={set("deliveryArea")} maxLength={120} invalid={!!fe.deliveryArea} aria-describedby={describedBy("deliveryArea", fe.deliveryArea, true)} />
            </Field>
            <Field id="deliveryTimeframe" label={v.deliveryMethod === "BUYER_COLLECTS" ? "Ready within" : "Delivered within"} error={fe.deliveryTimeframe}>
              <Select id="deliveryTimeframe" name="deliveryTimeframe" value={v.deliveryTimeframe} onChange={set("deliveryTimeframe")} invalid={!!fe.deliveryTimeframe}>
                {DELIVERY_TIMEFRAMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field id="deliveryNotes" label="Delivery notes" optional error={fe.deliveryNotes} hint="Anything the buyer should know, like delivery fees or landmarks.">
            <Input id="deliveryNotes" name="deliveryNotes" value={v.deliveryNotes} onChange={set("deliveryNotes")} maxLength={300} invalid={!!fe.deliveryNotes} aria-describedby={describedBy("deliveryNotes", fe.deliveryNotes, true)} />
          </Field>
        </Card>

        <Card className="grid gap-4 p-5">
          <h2 className="font-sans text-[16px] font-semibold tracking-normal">Link settings</h2>
          <Field id="expiry" label="Link expires" error={fe.expiry} hint="After this, the link can no longer be paid. You can always create a new one.">
            <Select id="expiry" name="expiry" value={v.expiry} onChange={set("expiry")} className="sm:max-w-[260px]">
              {LINK_EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <a href="/dashboard/links" className={buttonClass("quiet", "lg")}>
            Cancel
          </a>
          <SubmitButton size="lg" pendingText="Creating link…">
            Create payment link
          </SubmitButton>
        </div>
      </div>

      <aside className="grid gap-3 lg:sticky lg:top-6" aria-label="Buyer preview">
        <span className="eyebrow">What your buyer will see</span>
        <Card className="grid gap-3 rounded-xl p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-navy text-[13px] font-semibold text-cloud" aria-hidden>
              {initials(businessName)}
            </span>
            <b className="text-[14px]">{businessName}</b>
          </div>
          <b className={cn("break-words text-[15px]", !v.itemName && "text-ink-3")}>{v.itemName || "Your item or service"}</b>
          {v.description ? <p className="line-clamp-3 break-words text-[13.5px] text-ink-2">{v.description}</p> : null}
          <div className="tnum font-display text-[28px] font-[650] leading-none tracking-[-0.03em]">
            <small className="mr-1 font-sans text-[13px] font-semibold tracking-normal text-ink-2">UGX</small>
            {amountText}
          </div>
          <div className="flex items-start gap-2 text-[13.5px] text-ink-2">
            <Truck className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} aria-hidden />
            <span>{deliverySummary(v.deliveryMethod, v.deliveryArea, v.deliveryTimeframe)}</span>
          </div>
          <div className="flex items-start gap-2 text-[13.5px] text-ink-2">
            <Clock3 className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} aria-hidden />
            <span>{v.expiry === "never" ? "Link doesn't expire" : `Link expires ${LINK_EXPIRY_OPTIONS.find((o) => o.value === v.expiry)?.label.toLowerCase()}`}</span>
          </div>
          <span className={inputClass(false, "grid h-11 place-items-center !bg-navy text-[15px] font-semibold !text-emerald opacity-60")} aria-hidden>
            Pay UGX {amountText}
          </span>
        </Card>
        <p className="text-[12.5px] text-ink-3">{DELIVERY_LABELS[v.deliveryMethod]} · preview only. The link is created when you press "Create payment link".</p>
      </aside>
    </form>
  );
}
