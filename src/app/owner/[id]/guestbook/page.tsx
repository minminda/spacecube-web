import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import { ENABLE_GUESTBOOK_IMAGE } from "@/lib/pilotFlags";
import GuestbookAdminPage from "./GuestbookAdminPage";

interface Props {
  params: Promise<{ id: string }>;
}

const SETTINGS_DEFAULTS = {
  backgroundType: "color" as const,
  backgroundColor: "#000000",
  backgroundImageUrl: "",
  backgroundOpacity: 1,
  layoutType: "scatter" as const,
  defaultPostitColor: "#F6E7A8",
  initialZoom: 1,
  initialX: 0,
  initialY: 0,
  allowRotation: true,
  allowImage: true,
  showNickname: true,
};

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
 * 관리자 방명록 통합 관리 페이지 — 예전 /owner/[id]/guestbook-settings(배경·레이아웃)와
 * /owner/[id]/guestbook-sessions(질문·군집·스타일)를 여기 하나로 합쳤다. 두 데이터를
 * 한 번의 서버 컴포넌트 요청에서 같이 조회해, 페이지를 오가며 같은 공간을 두 번
 * 조회하던 중복 호출이 없다.
 */
export default async function GuestbookAdminRoutePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

  const [active, draft, archived, settingsRow] = await Promise.all([
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
  ]);

  const activePostitCount = active ? await prisma.guestbookNote.count({ where: { guestbookSessionId: active.id } }) : 0;

  const settings = settingsRow
    ? {
        backgroundType: settingsRow.backgroundType as "color" | "image",
        backgroundColor: settingsRow.backgroundColor ?? SETTINGS_DEFAULTS.backgroundColor,
        backgroundImageUrl: settingsRow.backgroundImageUrl ?? "",
        backgroundOpacity: settingsRow.backgroundOpacity,
        layoutType: settingsRow.layoutType as "scatter" | "grid" | "radial",
        defaultPostitColor: settingsRow.defaultPostitColor,
        initialZoom: settingsRow.initialZoom,
        initialX: settingsRow.initialX,
        initialY: settingsRow.initialY,
        allowRotation: settingsRow.allowRotation,
        allowImage: settingsRow.allowImage,
        showNickname: settingsRow.showNickname,
      }
    : SETTINGS_DEFAULTS;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / GUESTBOOK</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 관리</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <GuestbookAdminPage
        spaceId={space.id}
        spaceSlug={space.slug}
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
      />
    </main>
  );
}
