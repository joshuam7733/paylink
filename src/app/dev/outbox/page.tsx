import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Development outbox", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Shows emails the app would have sent. Only available in development (or with ENABLE_DEV_OUTBOX=true). */
export default async function DevOutboxPage() {
  if (!config.devOutboxEnabled) notFound();
  const emails = await db.devEmail.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return (
    <div className="page-gutter mx-auto grid w-full max-w-[720px] gap-5 py-8">
      <Link href="/" className="justify-self-start">
        <Logo />
      </Link>
      <div className="grid gap-1.5">
        <h1 className="text-[28px] leading-tight">Development outbox</h1>
        <p className="text-ink-2">Paylink doesn't send real email yet. Messages are stored here so flows like password reset can be tested.</p>
      </div>
      {emails.length === 0 ? (
        <Card className="p-5 text-ink-2">No emails yet. Request a password reset to see one here.</Card>
      ) : (
        <ul className="grid gap-3" data-testid="outbox">
          {emails.map((e) => (
            <li key={e.id}>
              <Card className="grid gap-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <b>{e.subject}</b>
                  <span className="text-[12.5px] text-ink-3">{formatDateTime(e.createdAt)}</span>
                </div>
                <div className="text-[13px] text-ink-3">To: {e.to}</div>
                <div className="whitespace-pre-wrap break-words text-[14px] text-ink-2">
                  {e.body.split(/(https?:\/\/\S+)/g).map((part, i) =>
                    /^https?:\/\//.test(part) ? (
                      <a key={i} href={part} className="font-semibold text-emerald-700 underline underline-offset-2">
                        {part}
                      </a>
                    ) : (
                      part
                    ),
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
