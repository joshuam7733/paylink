import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PageFade } from "@/components/ui/client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-gutter mx-auto grid min-h-dvh w-full max-w-[440px] content-start gap-7 py-8 sm:py-14">
      <Link href="/" className="justify-self-start">
        <Logo />
      </Link>
      <PageFade>{children}</PageFade>
    </div>
  );
}
