import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/forms";
import { ButtonLink } from "@/components/ui/button";
import { getValidResetToken } from "@/lib/services/users";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = token.length >= 20 && token.length <= 200 ? await getValidResetToken(token) : null;
  if (!valid) {
    return (
      <div className="grid gap-4">
        <h1 className="text-[30px] leading-tight">This link has expired</h1>
        <p className="text-ink-2">Reset links work once and expire after 30 minutes. Request a new one and use it straight away.</p>
        <ButtonLink href="/forgot-password" className="justify-self-start">
          Request a new link
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-[30px] leading-tight">Choose a new password</h1>
        <p className="text-ink-2">You'll be signed out on every device and can sign in again with the new password.</p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
