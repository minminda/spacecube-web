import type { Metadata } from "next";
import { resolveOperatorSpaceOrRedirect } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import { normalizeCanvasSettingsRow } from "@/lib/guestbookSettingsInput";
import { ENABLE_GUESTBOOK_IMAGE } from "@/lib/pilotFlags";
import OperatorBackLink from "../OperatorBackLink";
import GuestbookEditor from "@/components/guestbook/GuestbookEditor";

export const metadata: Metadata = {
  title: "방명록 관리 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * 운영자 방명록 관리 — 공용 GuestbookEditor(role="operator")를 렌더링한다. 관리자 페이지
 * (/admin/[id]/guestbook)와 완전히 같은 컴포넌트/저장 로직을 쓰고, 접근 범위(자기 공간만)와
 * API 엔드포인트만 다르다. 예전에 "방명록 관리"/"방명록 화면 설정" 두 메뉴로 나뉘어 있던
 * 것을 여기 하나로 합쳤다(역할이 겹쳐서 통합).
 */
export default async function OperatorGuestbookPage({ params }: Props) {
  const { slug: slugParam } = await params;
  const { id: spaceId, slug } = await resolveOperatorSpaceOrRedirect(slugParam, "/guestbook");

  const [active, settingsRow, notes] = await Promise.all([
    prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.ACTIVE } }),
    prisma.guestbookSettings.findUnique({ where: { spaceId } }),
    prisma.guestbookNote.findMany({
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
        session: { select: { status: true } },
      },
    }),
  ]);

  const activePostitCount = active ? await prisma.guestbookNote.count({ where: { guestbookSessionId: active.id } }) : 0;

  const settings = normalizeCanvasSettingsRow(settingsRow);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <OperatorBackLink slug={slug} />

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 관리</p>
        <h1 className="text-xl font-bold">방명록 화면을 설정하고 방문자의 기록을 관리합니다.</h1>
      </div>

      <GuestbookEditor
        role="operator"
        spaceSlug={slug}
        endpoints={{
          activeSession: `/api/operator/spaces/${spaceId}/guestbook-session`,
          canvasSettings: `/api/operator/spaces/${spaceId}/guestbook-settings`,
          notesBase: `/api/operator/spaces/${spaceId}`,
        }}
        active={
          active
            ? {
                id: active.id,
                startsAt: active.startsAt?.toISOString() ?? null,
                fields: {
                  question1: active.question1,
                  question2: active.question2,
                  freeLabelVisible: active.freeLabelVisible,
                  question1Visible: active.question1Visible,
                  question2Visible: active.question2Visible,
                  freeClusterX: active.freeClusterX,
                  freeClusterY: active.freeClusterY,
                  question1ClusterX: active.question1ClusterX,
                  question1ClusterY: active.question1ClusterY,
                  question2ClusterX: active.question2ClusterX,
                  question2ClusterY: active.question2ClusterY,
                  freeLabelFontSize: active.freeLabelFontSize,
                  question1FontSize: active.question1FontSize,
                  question2FontSize: active.question2FontSize,
                  freeLabelColor: active.freeLabelColor,
                  question1Color: active.question1Color,
                  question2Color: active.question2Color,
                },
              }
            : null
        }
        activePostitCount={activePostitCount}
        settings={settings}
        hasCustomSettings={!!settingsRow}
        enableImage={ENABLE_GUESTBOOK_IMAGE}
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
