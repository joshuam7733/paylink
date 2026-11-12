import type { Metadata } from "next";
import { TrackingView } from "@/components/transactions/tracking-view";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default async function TrackingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <TrackingView reference={reference} />;
}
