"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { DomainError } from "@/lib/errors";
import { setUserStatus } from "@/lib/services/users";
import type { FormState } from "@/lib/validation";

export async function setUserStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  // Authorisation is enforced here, on the server, not by hiding the button.
  const admin = await requireUser(["ADMIN"]);
  const userId = fd.get("userId")?.toString() ?? "";
  const status = fd.get("status")?.toString();
  if (status !== "ACTIVE" && status !== "SUSPENDED") return { error: "Unknown status." };
  try {
    await setUserStatus(admin.id, userId, status);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/users");
  return { ok: true };
}
