import { ArrowRight, Eye, ListChecks, Lock, Truck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageFade } from "@/components/ui/client";
import { getCurrentUser, homePathFor } from "@/lib/auth/current";

const steps = [
  { title: "Seller creates a link", text: "Item, price and delivery terms in about a minute. Share it in any chat." },
  { title: "Buyer reviews and pays", text: "They see the seller, the item and the delivery plan before paying." },
  { title: "Both track it to the door", text: "Each step is logged, and the deal completes when the buyer confirms." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? homePathFor(user.role) : "/register";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="page-gutter mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6">
        <Link href="/" aria-label="Paylink home">
          <Logo />
        </Link>
        <nav aria-label="Site" className="hidden gap-5 text-[14px] font-medium text-ink-2 md:flex">
          <a href="#how-it-works" className="hover:text-ink">
            How it works
          </a>
          <a href="#sellers" className="hover:text-ink">
            For sellers
          </a>
          <a href="#buyers" className="hover:text-ink">
            For buyers
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <ButtonLink href={primaryHref} size="sm">
              Open your account
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="quiet" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm" className="max-sm:hidden">
                Create a payment link
              </ButtonLink>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <PageFade>
          <section className="page-gutter mx-auto grid w-full max-w-[1200px] items-center gap-10 pb-14 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-14">
            <div>
              <span className="inline-flex min-h-[30px] items-center gap-2 rounded-full border border-line bg-card py-1 pl-1.5 pr-3 text-[13px] font-medium text-ink-2">
                <span aria-hidden className="h-5 w-5 flex-none rounded-full bg-emerald-50" />
                Built for people who sell on WhatsApp, Instagram and TikTok
              </span>
              <h1 className="mt-4 text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px] lg:text-[60px]">Buy and sell with people you've never met.</h1>
              <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.55] text-ink-2">
                Create a Paylink for anything you sell. Your buyer sees who you are, what they're paying for and how it will be delivered, and you both follow the deal until it's done.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <ButtonLink href={primaryHref} size="lg">
                  {user ? "Open your account" : "Create a payment link"}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </ButtonLink>
                <ButtonLink href="#how-it-works" variant="secondary" size="lg">
                  See how it works
                </ButtonLink>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-ink-2">
                <li className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Buyers see the full deal first
                </li>
                <li className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Every step is recorded
                </li>
              </ul>
              <p className="mt-6 max-w-[52ch] rounded-md border border-warn-line bg-warn-bg px-3 py-2 text-[13px] font-medium text-warn">
                Paylink is in its demo phase. You can try the whole flow today with simulated payments; no real money moves yet.
              </p>
            </div>

            {/* Illustrative product preview with sample content, not live data. */}
            <div aria-hidden className="relative mx-auto h-[440px] w-full max-w-[520px] overflow-hidden rounded-[24px] bg-navy">
              <span className="absolute -right-[180px] -top-[200px] h-[520px] w-[520px] rounded-full border-[56px] border-[rgba(16,168,138,0.16)]" />
              <span className="absolute -bottom-[150px] -left-[120px] h-[300px] w-[300px] rounded-full border-[40px] border-[rgba(247,249,252,0.05)]" />
              <div className="absolute left-5 top-6 grid w-[min(290px,calc(100%-40px))] gap-3 rounded-xl bg-card p-4 shadow-lg sm:left-9 sm:top-8">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-[13px] font-semibold text-cloud">NC</span>
                  <div>
                    <b className="block text-[14px]">Nakato Crafts</b>
                    <span className="text-[12px] text-ink-3">Seller on Paylink</span>
                  </div>
                </div>
                <span className="h-px bg-line-soft" />
                <b className="text-[15px]">Handwoven raffia basket set (3)</b>
                <div className="tnum font-display text-[28px] font-[650] leading-none tracking-[-0.03em]">
                  <small className="mr-1 font-sans text-[13px] font-semibold tracking-normal text-ink-2">UGX</small>185,000
                </div>
                <div className="flex items-start gap-2 text-[13.5px] text-ink-2">
                  <Truck className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} />
                  Delivered to Ntinda, Kampala in 2–3 days
                </div>
                <span className="grid h-11 place-items-center rounded-md bg-navy text-[15px] font-semibold text-emerald">Pay UGX 185,000</span>
              </div>
              <div className="absolute bottom-6 right-5 grid w-[240px] gap-2.5 rounded-[16px] bg-card p-3.5 shadow-lg sm:right-7">
                <span className="inline-flex h-6 items-center gap-1.5 justify-self-start rounded-full bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-700">
                  <Lock className="h-3 w-3" />
                  Payment secured
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-sunken">
                  <span className="block h-full w-[60%] rounded-full bg-emerald" />
                </span>
                <span className="text-[12.5px] text-ink-2">Next: seller delivers · then buyer confirms</span>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="page-gutter mx-auto w-full max-w-[1200px] scroll-mt-6 pb-16">
            <h2 className="text-[28px] leading-tight sm:text-[34px]">How it works</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <Card className="grid h-full content-start gap-2.5 p-5">
                    <span className="grid h-7 w-7 place-items-center rounded-sm bg-navy text-[13px] font-semibold text-cloud">{i + 1}</span>
                    <b className="text-[16px]">{s.title}</b>
                    <span className="text-[14px] text-ink-2">{s.text}</span>
                  </Card>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-navy text-cloud">
            <div className="page-gutter mx-auto grid w-full max-w-[1200px] gap-8 py-14 md:grid-cols-2 md:gap-12">
              <div id="sellers" className="grid scroll-mt-6 content-start gap-3">
                <span className="eyebrow !text-[#3CC9AA]">For sellers</span>
                <h2 className="text-[26px] leading-tight">Look as trustworthy as you are</h2>
                <p className="text-slate-300">
                  One link shows your shop name, the item, the price and your delivery promise. You see when the buyer opens it and when they pay, and you keep a full record of every deal.
                </p>
                <ButtonLink href={user ? primaryHref : "/register"} variant="inverse" className="mt-1 justify-self-start">
                  Start selling with Paylink
                </ButtonLink>
              </div>
              <div id="buyers" className="grid scroll-mt-6 content-start gap-3">
                <span className="eyebrow !text-[#3CC9AA]">For buyers</span>
                <h2 className="text-[26px] leading-tight">Know the deal before you pay</h2>
                <p className="text-slate-300">
                  Open the link a seller sends you. No account needed: check who you're paying, what you'll get and when it arrives, then follow your order step by step until you confirm it's in your hands.
                </p>
                <ButtonLink href={user ? primaryHref : "/register?role=buyer"} variant="inverse" className="mt-1 justify-self-start">
                  Create a buyer account
                </ButtonLink>
              </div>
            </div>
          </section>
        </PageFade>
      </main>

      <footer className="page-gutter mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 py-8 text-[13px] text-ink-3">
        <Logo size="sm" />
        <span>Demo phase: all payments are simulated. Paylink does not hold or move real money.</span>
      </footer>
    </div>
  );
}
