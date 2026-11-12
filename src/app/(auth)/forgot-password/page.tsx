import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Reset your password" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-[30px] leading-tight">Reset your password</h1>
        <p className="text-ink-2">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
      </div>
      <ForgotPasswordForm outboxEnabled={config.devOutboxEnabled} />
      <p className="text-[14px] text-ink-2">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
