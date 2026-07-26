import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOperatorSession } from "@/lib/operatorSession";
import OperatorAccessGate from "./OperatorAccessGate";

export const metadata: Metadata = {
  title: "운영자 — 공간큐브",
  description: "공간을 검색하고 운영 비밀번호를 입력해 운영 관리 화면으로 이동합니다.",
};

export default async function OperatorPage() {
  const session = await getOperatorSession();
  if (session) redirect(`/operator/${session.spaceId}`);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8">
      <OperatorAccessGate />
    </main>
  );
}
