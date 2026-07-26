import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import OperatorBackLink from "../OperatorBackLink";
import OperatorSettingsForm from "./OperatorSettingsForm";

export const metadata: Metadata = {
  title: "운영자 설정 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function OperatorSettingsPage({ params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) redirect("/operator");

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      operatorContactName: true,
      operatorContactEmail: true,
      operatorReportEmail: true,
      operatorReportEmailEnabled: true,
    },
  });
  if (!space) notFound();

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <OperatorBackLink spaceId={spaceId} />

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자 설정</p>
        <h1 className="text-xl font-bold">비밀번호와 연락처를 관리합니다</h1>
      </div>

      <OperatorSettingsForm spaceId={spaceId} initial={space} />
    </main>
  );
}
