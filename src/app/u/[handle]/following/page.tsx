import type { Metadata } from "next";
import RelationListPage from "@/components/profile/RelationListPage";

export const metadata: Metadata = { title: "따라가는 취향 — 공간큐브", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <RelationListPage rawHandle={handle} kind="following" />;
}
