import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import GuestbookSettingsForm from "./GuestbookSettingsForm";

interface Props { params: Promise<{ id: string }> }

// 설정하지 않은 공간이 사용할 앱 기본값
const DEFAULTS = {
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

export default async function GuestbookSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true } });
  if (!space) notFound();

  const settings = await prisma.guestbookSettings.findUnique({ where: { spaceId } });

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
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>방명록 설정</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {!settings && (
        <p className="text-xs" style={{ color: "var(--border)" }}>
          아직 별도 설정이 없어 기본값(검정 배경 · 노란 포스트잇 · 자유 배치)을 사용 중입니다.
        </p>
      )}

      <GuestbookSettingsForm
        spaceId={space.id}
        initial={settings ? {
          backgroundType: settings.backgroundType as "color" | "image",
          backgroundColor: settings.backgroundColor ?? DEFAULTS.backgroundColor,
          backgroundImageUrl: settings.backgroundImageUrl ?? "",
          backgroundOpacity: settings.backgroundOpacity,
          layoutType: settings.layoutType as "scatter" | "grid" | "radial",
          defaultPostitColor: settings.defaultPostitColor,
          initialZoom: settings.initialZoom,
          initialX: settings.initialX,
          initialY: settings.initialY,
          allowRotation: settings.allowRotation,
          allowImage: settings.allowImage,
          showNickname: settings.showNickname,
        } : DEFAULTS}
      />
    </main>
  );
}
