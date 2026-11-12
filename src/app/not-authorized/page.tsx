import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser, homePathFor } from "@/lib/auth/current";

export const metadata: Metadata = { title: "No access" };

export default async function NotAuthorizedPage() {
  const user = await getCurrentUser();
  return (
    <div className="page-gutter mx-auto grid min-h-dvh w-full max-w-[480px] content-center justify-items-start gap-4 py-12">
      <Link href="/">
        <Logo />
      </Link>
      <span className="mt-4 grid h-12 w-12 place-items-center rounded-[14px] bg-sunken text-ink-2">
        <ShieldAlert className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="text-[28px] leading-tight" data-testid="not-authorized">
        This page isn't part of your account
      </h1>
      <p className="text-ink-2">You're signed in, but your account type doesn't have access to that page.</p>
      <ButtonLink href={user ? homePathFor(user.role) : "/login"}>{user ? "Go to your account" : "Sign in"}</ButtonLink>
    </div>
  );
}
