"use client";

import { useActionState, useEffect, useState } from "react";
import { setUserStatusAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import type { FormState } from "@/lib/validation";

export function UserStatusButton({ userId, email, status }: { userId: string; email: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(setUserStatusAction, {} as FormState);
  const suspend = status === "ACTIVE";
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  return (
    <>
      <Button size="sm" variant={suspend ? "danger" : "secondary"} onClick={() => setOpen(true)}>
        {suspend ? "Suspend" : "Reactivate"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={suspend ? `Suspend ${email}?` : `Reactivate ${email}?`}
        description={
          suspend
            ? "They'll be signed out everywhere and won't be able to sign in until you reactivate the account. Their transactions stay on record."
            : "They'll be able to sign in again straight away."
        }
      >
        <form action={action} className="grid gap-3">
          <FormError message={state.error} />
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={suspend ? "SUSPENDED" : "ACTIVE"} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
              Keep as is
            </Button>
            <SubmitButton variant={suspend ? "danger" : "primary"} pendingText="Saving…">
              {suspend ? "Suspend account" : "Reactivate account"}
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
