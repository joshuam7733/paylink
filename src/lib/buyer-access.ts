/** Name of the httpOnly cookie holding a guest buyer's tracking key for one transaction. */
export function buyerCookieName(reference: string): string {
  return `pl_bk_${reference.replace(/[^A-Z0-9]/g, "")}`;
}
