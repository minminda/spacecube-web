import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import OperatorBackLink from "../OperatorBackLink";
import GuestbookManageList from "./GuestbookManageList";

export const metadata: Metadata = {
  title: "방명록 관리 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function OperatorGuestbookPage({ params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) redirect("/operator");

  const notes = await prisma.guestbookNote.findMany({
    where: { spaceId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      nickname: true,
      clusterType: true,
      createdAt: true,
      isHidden: true,
      _count: { select: { reactions: true } },
      session: { select: { status: true, startsAt: true, endsAt: true } },
    },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <OperatorBackLink spaceId={spaceId} />

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 관리</p>
        <h1 className="text-xl font-bold">{notes.length}개의 기록</h1>
      </div>

      <GuestbookManageList
        spaceId={spaceId}
        notes={notes.map((n) => ({
          id: n.id,
          content: n.content,
          nickname: n.nickname,
          clusterType: n.clusterType,
          createdAt: n.createdAt.toISOString(),
          reactionCount: n._count.reactions,
          isHidden: n.isHidden,
          isActive: n.session.status === GuestbookSessionStatus.ACTIVE,
        }))}
      />
    </main>
  );
}
