import type { Metadata } from "next";
import { TrackingView } from "@/components/transactions/tracking-view";

export const metadata: Metadata = { title: "Track your order", robots: { index: false }, referrer: "no-referrer" };

/** Tracking link that carries the buyer key, for opening an order on another device. */
export default async function TrackingKeyPage({ params }: { params: Promise<{ reference: string; key: string }> }) {
  const { reference, key } = await params;
  return <TrackingView reference={reference} pathKey={key} />;
}
