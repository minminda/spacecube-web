import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import GuestbookSessionManager from "./GuestbookSessionManager";

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

export default async function GuestbookSessionsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

  const [active, draft, archived] = await Promise.all([
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
  ]);

  const activePostitCount = active ? await prisma.guestbookNote.count({ where: { guestbookSessionId: active.id } }) : 0;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / GUESTBOOK SESSIONS</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 세션 관리</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          질문·군집 위치·글자 크기·색상은 이 페이지에서만 관리합니다(운영자 페이지에서는 제거됨).
        </p>
      </div>

      <GuestbookSessionManager
        spaceId={space.id}
        spaceSlug={space.slug}
        active={
          active
            ? {
                id: active.id,
                startsAt: active.startsAt?.toISOString() ?? null,
                fields: toEditableFields(active),
              }
            : null
        }
        activePostitCount={activePostitCount}
        draft={
          draft
            ? {
                id: draft.id,
                fields: toEditableFields(draft),
              }
            : null
        }
        archived={archived.map((s) => ({
          id: s.id,
          startsAt: s.startsAt?.toISOString() ?? null,
          endsAt: s.endsAt?.toISOString() ?? null,
          question1: s.question1,
          question2: s.question2,
          noteCount: s._count.notes,
        }))}
      />
    </main>
  );
}
