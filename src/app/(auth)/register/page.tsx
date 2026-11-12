import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser, homePathFor } from "@/lib/auth/current";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next) ?? undefined;
  const user = await getCurrentUser();
  if (user) redirect(next ?? homePathFor(user.role));
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-[30px] leading-tight">Create your account</h1>
        <p className="text-ink-2">Paylink is in its demo phase: explore the full flow with simulated payments.</p>
      </div>
      <RegisterForm next={next} defaultRole={sp.role === "buyer" ? "BUYER" : "SELLER"} />
      <p className="text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
