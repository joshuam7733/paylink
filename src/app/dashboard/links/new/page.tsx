import type { Metadata } from "next";
import Link from "next/link";
import { NewLinkForm } from "@/components/seller/new-link-form";
import { PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";

export const metadata: Metadata = { title: "New payment link" };

export default async function NewLinkPage() {
  const user = await requireUser(["SELLER"], "/dashboard/links/new");
  return (
    <div className="grid gap-6">
      <PageHeader
        title="New payment link"
        eyebrow={
          <Link href="/dashboard/links" className="underline-offset-2 hover:underline">
            Payment links
          </Link>
        }
      />
      <NewLinkForm businessName={user.sellerProfile?.businessName ?? user.name} />
    </div>
  );
}
