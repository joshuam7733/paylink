import type { Metadata } from "next";
import { logoutAction } from "@/actions/auth";
import { ProfileForm } from "@/components/seller/profile-form";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser(["SELLER"], "/dashboard/settings");
  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" />
      <Card className="grid gap-4 p-5">
        <h2 className="text-[17px]">Seller profile</h2>
        <ProfileForm
          defaults={{
            name: user.name,
            businessName: user.sellerProfile?.businessName ?? user.name,
            location: user.sellerProfile?.location ?? "",
            phone: user.phone ?? user.sellerProfile?.phone ?? "",
          }}
        />
      </Card>
      <Card className="grid gap-3 p-5">
        <h2 className="text-[17px]">Account</h2>
        <dl className="grid gap-1 text-[14px]">
          <div className="flex gap-2">
            <dt className="text-ink-3">Email</dt>
            <dd className="break-all">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-3">Account type</dt>
            <dd>{user.isDemo ? "Demo seller account" : "Seller account"}</dd>
          </div>
        </dl>
        <p className="text-[13.5px] text-ink-3">To change your password, sign out and use "Forgot your password?" on the sign-in page.</p>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
