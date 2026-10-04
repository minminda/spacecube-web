import type { Metadata } from "next";
import RelationListPage from "@/components/profile/RelationListPage";

export const metadata: Metadata = { title: "나를 따라가는 사람 — 공간큐브", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <RelationListPage rawHandle={handle} kind="followers" />;
}
