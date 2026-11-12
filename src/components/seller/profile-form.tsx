"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/seller";
import { SubmitButton } from "@/components/ui/client";
import { describedBy, Field, FormError, Input } from "@/components/ui/field";
import type { FormState } from "@/lib/validation";

export function ProfileForm({ defaults }: { defaults: { name: string; businessName: string; location: string; phone: string } }) {
  const [state, action] = useActionState(updateProfileAction, {} as FormState);
  const fe = state.fieldErrors ?? {};
  const val = (k: keyof typeof defaults) => state.values?.[k] ?? defaults[k];
  return (
    <form action={action} className="grid max-w-[560px] gap-4" noValidate>
      <FormError message={state.error} />
      {state.ok ? (
        <div role="status" className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[14px] font-medium text-emerald-700">
          Profile saved. Buyers will see the new details on your links.
        </div>
      ) : null}
      <Field id="businessName" label="Business or shop name" hint="Shown to buyers on every payment link." error={fe.businessName}>
        <Input id="businessName" name="businessName" defaultValue={val("businessName")} invalid={!!fe.businessName} aria-describedby={describedBy("businessName", fe.businessName, true)} required />
      </Field>
      <Field id="name" label="Your name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={val("name")} invalid={!!fe.name} aria-describedby={describedBy("name", fe.name)} required />
      </Field>
      <Field id="location" label="Location" optional hint="For example: Ntinda, Kampala" error={fe.location}>
        <Input id="location" name="location" defaultValue={val("location")} invalid={!!fe.location} aria-describedby={describedBy("location", fe.location, true)} />
      </Field>
      <Field id="phone" label="Mobile number" optional hint="Format: 0772 123 456" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={val("phone")} invalid={!!fe.phone} aria-describedby={describedBy("phone", fe.phone, true)} />
      </Field>
      <SubmitButton className="justify-self-start" pendingText="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
