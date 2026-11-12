import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-gutter mx-auto grid min-h-dvh w-full max-w-[480px] content-center justify-items-start gap-4 py-12">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-4 text-[28px] leading-tight">We couldn't find that page</h1>
      <p className="text-ink-2">The link may be mistyped, or the payment link may no longer exist. Check it with the person who sent it to you.</p>
      <ButtonLink href="/">Go to Paylink home</ButtonLink>
    </div>
  );
}
