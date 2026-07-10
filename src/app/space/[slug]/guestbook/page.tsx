import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import GuestbookCanvas from "./GuestbookCanvas";
import type { GuestbookNoteData } from "./dummyNotes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { name: true },
  });
  if (!space) return {};
  return {
    title: `${space.name}에 남겨진 흔적 — 공간큐브`,
    description: "이 공간을 다녀간 사람들이 남긴 작은 기록들입니다.",
  };
}

function formatDate(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// 관리자 설정이 없는 공간이 쓰는 기본값
const DEFAULT_SETTINGS = {
  backgroundType: "color" as const,
  backgroundColor: "#000000",
  backgroundImageUrl: null as string | null,
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

export default async function GuestbookPage({ params }: Props) {
  const { slug } = await params;

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (!space) notFound();

  const session = await auth();
  let myNoteId: string | null = null;
  let hasRecord = false;
  let nickname: string | null = null;

  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, nickname: true } })
    : null;

  if (user) {
    nickname = user.nickname;
    const recordCount = await prisma.record.count({ where: { userId: user.id, spaceId: space.id } });
    hasRecord = recordCount > 0;
  }

  // 기록을 완료해야 방명록을 볼 수 있음 — 로그인 전이거나 기록이 없으면 여기서 막는다
  if (!hasRecord) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {"이 공간에 대한 기록을 남기면\n다른 방문자들의 이야기를 볼 수 있어요."}
        </p>
        <Link
          href={session ? `/space/${slug}/record` : `/login?callbackUrl=${encodeURIComponent(`/space/${slug}/record`)}`}
          className="inline-block text-sm py-3 px-6 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          기록하고 흔적 열기
        </Link>
        <Link href={`/space/${slug}`} className="text-xs" style={{ color: "var(--border)" }}>← 공간으로</Link>
      </main>
    );
  }

  const [dbNotes, settingsRow] = await Promise.all([
    prisma.guestbookNote.findMany({
      where: { spaceId: space.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, userId: true, content: true, nickname: true, imageUrl: true,
        x: true, y: true, rotation: true, color: true, createdAt: true,
      },
    }),
    prisma.guestbookSettings.findUnique({ where: { spaceId: space.id } }),
  ]);

  if (user) {
    myNoteId = dbNotes.find((n) => n.userId === user.id)?.id ?? null;
  }

  const initialNotes: GuestbookNoteData[] = dbNotes.map((n) => ({
    id: n.id,
    userId: n.userId,
    content: n.content,
    nickname: n.nickname,
    imageUrl: n.imageUrl,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    color: n.color,
    createdAt: formatDate(n.createdAt),
  }));

  const settings = settingsRow
    ? {
        backgroundType: settingsRow.backgroundType as "color" | "image",
        backgroundColor: settingsRow.backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
        backgroundImageUrl: settingsRow.backgroundImageUrl,
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
    : DEFAULT_SETTINGS;

  return (
    <main>
      <Suspense fallback={null}>
        <GuestbookCanvas
          space={space}
          initialNotes={initialNotes}
          isLoggedIn={!!session?.user?.email}
          initialMyNoteId={myNoteId}
          nickname={nickname}
          settings={settings}
        />
      </Suspense>
    </main>
  );
}
