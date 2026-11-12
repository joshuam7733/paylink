"use client";

import { useActionState, useEffect, useState } from "react";
import { confirmReceivedAction } from "@/actions/buyer";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import type { FormState } from "@/lib/validation";

export function ConfirmReceived({ reference, itemName, sellerName, accessKey }: { reference: string; itemName: string; sellerName: string; accessKey?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(confirmReceivedAction, {} as FormState);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  return (
    <>
      <Button size="lg" block onClick={() => setOpen(true)}>
        I've received my order
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirm you've received it?"
        description={`Only confirm once you have "${itemName}" and you're happy with it. This completes the deal with ${sellerName} and can't be undone.`}
      >
        <form action={action} className="grid gap-3">
          <FormError message={state.error} />
          <input type="hidden" name="reference" value={reference} />
          {accessKey ? <input type="hidden" name="key" value={accessKey} /> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <SubmitButton pendingText="Confirming…">Confirm received</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
