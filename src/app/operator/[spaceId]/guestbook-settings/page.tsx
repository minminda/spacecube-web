import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import OperatorBackLink from "../OperatorBackLink";
import GuestbookStyleForm from "./GuestbookStyleForm";

export const metadata: Metadata = {
  title: "방명록 화면 설정 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function OperatorGuestbookSettingsPage({ params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) redirect("/operator");

  const active = await prisma.guestbookSession.findFirst({
    where: { spaceId, status: GuestbookSessionStatus.ACTIVE },
    select: {
      question1: true,
      question2: true,
      question1FontSize: true,
      question2FontSize: true,
      question1Color: true,
      question2Color: true,
    },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <OperatorBackLink spaceId={spaceId} />

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 화면 설정</p>
        <h1 className="text-xl font-bold">질문 글자 크기 · 색상</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          현재 진행 중인 방명록에 표시되는 질문 1·질문 2의 글자 크기와 색상을 바꿀 수 있습니다.
        </p>
      </div>

      {!active ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          현재 진행 중인 방명록이 없어 설정할 수 없습니다.
        </p>
      ) : (
        <GuestbookStyleForm spaceId={spaceId} initial={active} />
      )}
    </main>
  );
}
