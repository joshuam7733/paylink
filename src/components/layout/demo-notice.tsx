"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dismissDemoWelcomeAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * Account-level demo signal (approved design v0.2): a bar that can't be dismissed, plus a welcome
 * dialog shown once on first sign-in. Individual statuses and amounts carry no demo tags.
 */
export function DemoBar({ firstVisit, audience = "account" }: { firstVisit?: boolean; audience?: "account" | "checkout" | "tracking" }) {
  const [open, setOpen] = useState(Boolean(firstVisit));
  const recorded = useRef(false);

  // Record "seen" as soon as the welcome is on screen, so a quick reload can't bring it back.
  useEffect(() => {
    if (firstVisit && !recorded.current) {
      recorded.current = true;
      void dismissDemoWelcomeAction();
    }
  }, [firstVisit]);

  const close = setOpen;

  const lead = audience === "checkout" ? "Demo payment link" : "Demo account";
  const text =
    audience === "checkout"
      ? "You won't be charged."
      : audience === "tracking"
        ? "No real money has moved."
        : "Payments are simulated. No real money moves";

  return (
    <>
      <div
        role="status"
        data-testid="demo-bar"
        className="flex items-center gap-2 border-b border-warn-line bg-warn-bg px-4 py-2 text-[12.5px] font-medium leading-snug text-warn"
      >
        <FlaskConical className="h-4 w-4 flex-none" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0">
          <b className="font-bold">{lead}</b> · {text}
          {audience === "account" ? (
            <>
              <span className="max-sm:hidden"> through Paylink yet</span>.
            </>
          ) : null}
        </span>
        <button type="button" onClick={() => setOpen(true)} className="ml-auto flex-none whitespace-nowrap font-semibold underline underline-offset-2">
          What this means
        </button>
      </div>
      <Dialog
        open={open}
        onOpenChange={close}
        title={audience === "account" ? "You're in a demo account" : "This is a demo payment"}
        description={
          audience === "account"
            ? "Everything works like the real Paylink, but payments are simulated. No money is charged, held or paid out, and buyers who open your links see the same notice."
            : "Paylink is in its demo phase. This page works like the real thing, but the payment is simulated: no money is charged, held or paid out."
        }
      >
        <ul className="grid gap-2 text-[14px] text-ink-2">
          <li className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald" />
            Statuses such as "Payment secured" describe the demo flow, not real funds.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald" />
            At the payment step you choose whether the simulated payment succeeds, fails or is cancelled.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald" />
            Real mobile money will only be switched on with a licensed payment partner.
          </li>
        </ul>
        <Button onClick={() => close(false)} className="mt-1 justify-self-start">
          {firstVisit ? "Start exploring" : "Got it"}
        </Button>
      </Dialog>
    </>
  );
}
