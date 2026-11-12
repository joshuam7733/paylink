"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";
import { buyerCookieName } from "@/lib/buyer-access";
import { config } from "@/lib/config";
import { DomainError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { confirmReceived, simulateDemoPayment } from "@/lib/services/transactions";
import { demoPaymentSchema, firstErrors, type FormState } from "@/lib/validation";

export type PayState = FormState & { reference?: string; status?: string };

export async function payAction(_prev: PayState, fd: FormData): Promise<PayState> {
  const slug = fd.get("slug")?.toString() ?? "";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`pay:${ip}:${slug}`, 12, 10 * 60 * 1000).ok) {
    return { error: "Too many payment attempts on this link. Wait a few minutes and try again." };
  }
  const parsed = demoPaymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), error: "Check the highlighted fields and try again." };

  const user = await getCurrentUser();
  let result;
  try {
    result = await simulateDemoPayment({
      slug,
      input: parsed.data,
      payer: user ? { id: user.id, role: user.role } : null,
    });
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  // The buyer key lets a guest come back to the tracking page from this browser.
  const jar = await cookies();
  jar.set(buyerCookieName(result.reference), result.buyerKey, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 60 * 60,
  });
  revalidatePath(`/pay/${slug}`);
  if (result.status === "PAYMENT_FAILED") {
    // Stay on checkout so the buyer can try again.
    return { ok: true, reference: result.reference, status: result.status };
  }
  // Secured or cancelled: go straight to the shared tracking page.
  redirect(`/t/${result.reference}`);
}

export async function confirmReceivedAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const reference = fd.get("reference")?.toString() ?? "";
  const pathKey = fd.get("key")?.toString() || null;
  const user = await getCurrentUser();
  const jar = await cookies();
  try {
    await confirmReceived(reference, {
      user: user ? { id: user.id, role: user.role } : null,
      keys: [jar.get(buyerCookieName(reference))?.value, pathKey],
    });
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/t/${reference}`, "layout");
  return { ok: true };
}
