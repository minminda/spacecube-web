import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import { ENABLE_GUESTBOOK_IMAGE } from "@/lib/pilotFlags";
import { normalizeCanvasSettingsRow } from "@/lib/guestbookSettingsInput";
import GuestbookEditor from "@/components/guestbook/GuestbookEditor";

interface Props {
  params: Promise<{ id: string }>;
}

function toEditableFields(s: {
  question1: string | null;
  question2: string | null;
  freeLabelVisible: boolean;
  question1Visible: boolean;
  question2Visible: boolean;
  freeClusterX: number;
  freeClusterY: number;
  question1ClusterX: number;
  question1ClusterY: number;
  question2ClusterX: number;
  question2ClusterY: number;
  freeLabelFontSize: number;
  question1FontSize: number;
  question2FontSize: number;
  freeLabelColor: string;
  question1Color: string;
  question2Color: string;
}) {
  return {
    question1: s.question1,
    question2: s.question2,
    freeLabelVisible: s.freeLabelVisible,
    question1Visible: s.question1Visible,
    question2Visible: s.question2Visible,
    freeClusterX: s.freeClusterX,
    freeClusterY: s.freeClusterY,
    question1ClusterX: s.question1ClusterX,
    question1ClusterY: s.question1ClusterY,
    question2ClusterX: s.question2ClusterX,
    question2ClusterY: s.question2ClusterY,
    freeLabelFontSize: s.freeLabelFontSize,
    question1FontSize: s.question1FontSize,
    question2FontSize: s.question2FontSize,
    freeLabelColor: s.freeLabelColor,
    question1Color: s.question1Color,
    question2Color: s.question2Color,
  };
}

/**
 * 관리자 방명록 통합 관리 페이지 — 공용 GuestbookEditor(role="admin")를 렌더링한다.
 * 운영자 페이지(/operator/[slug]/guestbook)도 같은 컴포넌트를 role="operator"로 쓴다.
 */
export default async function GuestbookAdminRoutePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

  const [active, draft, archived, settingsRow, notes] = await Promise.all([
    prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.ACTIVE } }),
    prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.DRAFT } }),
    prisma.guestbookSession.findMany({
      where: { spaceId, status: GuestbookSessionStatus.ARCHIVED },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        question1: true,
        question2: true,
        _count: { select: { notes: true } },
      },
    }),
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
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / GUESTBOOK</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 관리</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <GuestbookEditor
        role="admin"
        spaceSlug={space.slug}
        endpoints={{
          activeSession: `/api/spaces/${space.id}/guestbook-sessions/active`,
          draftSession: `/api/spaces/${space.id}/guestbook-sessions/draft`,
          activateDraft: `/api/spaces/${space.id}/guestbook-sessions/activate`,
          canvasSettings: `/api/spaces/${space.id}/guestbook-settings`,
          notesBase: `/api/spaces/${space.id}`,
        }}
        active={
          active
            ? { id: active.id, startsAt: active.startsAt?.toISOString() ?? null, fields: toEditableFields(active) }
            : null
        }
        activePostitCount={activePostitCount}
        draft={draft ? { id: draft.id, fields: toEditableFields(draft) } : null}
        archived={archived.map((s) => ({
          id: s.id,
          startsAt: s.startsAt?.toISOString() ?? null,
          endsAt: s.endsAt?.toISOString() ?? null,
          question1: s.question1,
          question2: s.question2,
          noteCount: s._count.notes,
        }))}
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
