"use client";

import { MailCheck, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/actions/auth";
import { Reveal, SubmitButton } from "@/components/ui/client";
import { describedBy, Field, FormError, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      {notice ? (
        <div role="status" className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[14px] font-medium text-emerald-700">
          {notice}
        </div>
      ) : null}
      <FormError message={state.error} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field id="email" label="Email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} invalid={!!fe.email} aria-describedby={describedBy("email", fe.email)} required />
      </Field>
      <Field id="password" label="Password" error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" invalid={!!fe.password} aria-describedby={describedBy("password", fe.password)} required />
      </Field>
      <div className="-mt-1 text-right text-[13.5px]">
        <Link href="/forgot-password" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton size="lg" block pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next, defaultRole = "SELLER" }: { next?: string; defaultRole?: "SELLER" | "BUYER" }) {
  const [state, action] = useActionState(registerAction, initial);
  const [role, setRole] = useState<"SELLER" | "BUYER">((state.values?.role as "SELLER" | "BUYER") ?? defaultRole);
  const fe = state.fieldErrors ?? {};
  const roles = [
    { value: "SELLER" as const, title: "I'm selling", text: "Create payment links and track deals", Icon: Store },
    { value: "BUYER" as const, title: "I'm buying", text: "Pay through links and follow my orders", Icon: ShoppingBag },
  ];
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError message={state.error} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold">What brings you to Paylink?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {roles.map(({ value, title, text, Icon }) => (
            <label
              key={value}
              className={cn(
                "grid cursor-pointer gap-1 rounded-lg border bg-card p-3 transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
                role === value ? "border-emerald shadow-[0_0_0_1px_var(--pl-emerald)]" : "border-line hover:border-slate-300",
              )}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              <Icon className={cn("h-5 w-5", role === value ? "text-emerald-700" : "text-ink-2")} strokeWidth={1.75} aria-hidden />
              <span className="text-[14px] font-semibold">{title}</span>
              <span className="text-[12.5px] leading-snug text-ink-3">{text}</span>
            </label>
          ))}
        </div>
        {fe.role ? <p className="text-[12.5px] font-medium text-danger">{fe.role}</p> : null}
      </fieldset>
      <Field id="name" label="Full name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={state.values?.name} invalid={!!fe.name} aria-describedby={describedBy("name", fe.name)} required />
      </Field>
      <Reveal show={role === "SELLER"}>
        <Field id="businessName" label="Business or shop name" hint="Buyers see this on your payment links." error={fe.businessName} className="pb-0.5">
          <Input
            id="businessName"
            name="businessName"
            autoComplete="organization"
            defaultValue={state.values?.businessName}
            invalid={!!fe.businessName}
            aria-describedby={describedBy("businessName", fe.businessName, true)}
          />
        </Field>
      </Reveal>
      <Field id="email" label="Email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} invalid={!!fe.email} aria-describedby={describedBy("email", fe.email)} required />
      </Field>
      <Field id="phone" label="Mobile number" optional error={fe.phone} hint="Format: 0772 123 456">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={state.values?.phone} invalid={!!fe.phone} aria-describedby={describedBy("phone", fe.phone, true)} />
      </Field>
      <Field id="password" label="Password" error={fe.password} hint="At least 10 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" invalid={!!fe.password} aria-describedby={describedBy("password", fe.password, true)} required />
      </Field>
      <SubmitButton size="lg" block pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm({ outboxEnabled }: { outboxEnabled: boolean }) {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  const fe = state.fieldErrors ?? {};
  if (state.ok) {
    return (
      <div className="grid gap-3 rounded-lg border border-line bg-card p-5" role="status">
        <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-emerald-50 text-emerald-700">
          <MailCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <h2 className="text-[19px]">Check your email</h2>
        <p className="text-[14px] text-ink-2">
          If an account exists for <b className="text-ink">{state.values?.email}</b>, we've sent a link to choose a new password. It expires in 30 minutes.
        </p>
        {outboxEnabled ? (
          <p className="rounded-md bg-sunken px-3 py-2 text-[13px] text-ink-2">
            Development build: emails aren't sent yet. Open the{" "}
            <Link href="/dev/outbox" className="font-semibold text-emerald-700 underline underline-offset-2">
              development outbox
            </Link>{" "}
            to find the link.
          </p>
        ) : null}
        <Link href="/login" className="text-[14px] font-semibold text-emerald-700 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError message={state.error} />
      <Field id="email" label="Email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} invalid={!!fe.email} aria-describedby={describedBy("email", fe.email)} required />
      </Field>
      <SubmitButton size="lg" block pendingText="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="New password" error={fe.password} hint="At least 10 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" invalid={!!fe.password} aria-describedby={describedBy("password", fe.password, true)} required />
      </Field>
      <Field id="confirm" label="Repeat new password" error={fe.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" invalid={!!fe.confirm} aria-describedby={describedBy("confirm", fe.confirm)} required />
      </Field>
      <SubmitButton size="lg" block pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
