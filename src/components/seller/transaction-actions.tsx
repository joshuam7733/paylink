"use client";

import { PackageCheck } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { cancelTransactionAction, markDeliveredAction } from "@/actions/seller";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

export function MarkDeliveredForm({ transactionId }: { transactionId: string }) {
  const [state, action] = useActionState(markDeliveredAction, initial);
  return (
    <form action={action} className="grid gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="transactionId" value={transactionId} />
      <SubmitButton pendingText="Saving…">
        <PackageCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        Mark as delivered
      </SubmitButton>
    </form>
  );
}

export function CancelTransaction({ transactionId, reference, itemName }: { transactionId: string; reference: string; itemName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(cancelTransactionAction, initial);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Cancel transaction…
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Cancel ${reference}?`}
        description={`The payment link for "${itemName}" will stop working and the buyer won't be able to pay. This can't be undone, but you can create a new link at any time.`}
      >
        <form action={action} className="grid gap-3">
          <FormError message={state.error} />
          <input type="hidden" name="transactionId" value={transactionId} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
              Keep transaction
            </Button>
            <SubmitButton variant="danger" pendingText="Cancelling…">
              Cancel transaction
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
