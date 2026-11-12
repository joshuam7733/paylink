"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { DomainError } from "@/lib/errors";
import { cancelBySeller, createPaymentLink, markDelivered } from "@/lib/services/transactions";
import { updateSellerProfile } from "@/lib/services/users";
import { createLinkSchema, firstErrors, formValues, profileSchema, type FormState } from "@/lib/validation";

export async function createLinkAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SELLER"]);
  const values = formValues(fd);
  const parsed = createLinkSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values, error: "Check the highlighted fields and try again." };
  const tx = await createPaymentLink(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/transactions/${tx.id}?created=1`);
}

export async function cancelTransactionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SELLER"]);
  const id = fd.get("transactionId")?.toString() ?? "";
  try {
    await cancelBySeller(user.id, id);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markDeliveredAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SELLER"]);
  const id = fd.get("transactionId")?.toString() ?? "";
  try {
    await markDelivered(user.id, id);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SELLER"]);
  const values = formValues(fd);
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  await updateSellerProfile(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true, values };
}
