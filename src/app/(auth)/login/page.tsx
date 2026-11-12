import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser, homePathFor } from "@/lib/auth/current";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next) ?? undefined;
  const user = await getCurrentUser();
  if (user) redirect(next ?? homePathFor(user.role));
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-[30px] leading-tight">Sign in</h1>
        <p className="text-ink-2">Welcome back. Pick up where your deals left off.</p>
      </div>
      <LoginForm next={next} notice={sp.reset ? "Password updated. Sign in with your new password." : undefined} />
      <p className="text-[14px] text-ink-2">
        New to Paylink?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
