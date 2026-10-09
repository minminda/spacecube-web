import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import SettingsForm from "@/components/SettingsForm";
import { prisma } from "@/lib/prisma";
import { getEditorialViewer } from "@/lib/editorial/viewer";

export const metadata: Metadata = { title: "설정 — 공간큐브", robots: { index: false } };

/**
 * 설정 — 메뉴의 "설정"으로 들어온다(화면마다 톱니바퀴를 두지 않는다). 내용은 예전 설정 패널과 같은 SettingsForm:
 * 닉네임 · 공개 프로필(공개 여부 · 주소 · 소개) · 로그아웃. 로그인한 사람만 — 아니면 로그인 후 여기로 돌아온다.
 */
export default async function SettingsPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.userId) redirect("/login?callbackUrl=%2Fsettings");
  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { nickname: true, nicknameUpdatedAt: true, profilePublic: true, profileHandle: true, profileBio: true },
  });
  if (!user) redirect("/login?callbackUrl=%2Fsettings");

  return (
    <div className="editorial-bleed" style={{ "--dim": "var(--ed-dim)", "--border": "var(--ed-line)", "--tag-bg": "var(--ed-soft)" } as CSSProperties}>
      <main className="pb-20 md:pb-28">
        <div className="max-w-[720px] mx-auto">
          <PageHeader title="설정" description="내 프로필과 아카이브 공개 범위를 관리해요." />
          <section className="ed-container">
            <div className="pt-6 md:pt-8" style={{ borderTop: "1px solid var(--ed-line)" }}>
              <div className="pb-8 md:pb-10 space-y-2">
                <p className="text-sm" style={{ color: "var(--ed-dim)" }}>내 계정</p>
                <p className="text-xl md:text-2xl font-semibold break-words">{user.nickname || "공간큐브 회원"}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>로그인되어 있어요.</p>
              </div>
              <SettingsForm
                nickname={user.nickname}
                nicknameUpdatedAt={user.nicknameUpdatedAt?.toISOString() ?? null}
                profile={viewer.editorial ? { public: user.profilePublic, handle: user.profileHandle, bio: user.profileBio } : undefined}
              />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
