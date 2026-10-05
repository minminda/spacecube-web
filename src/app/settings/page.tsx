import { redirect } from "next/navigation";
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
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader title="설정" />
        <section className="ed-container">
          <div className="max-w-[480px] pt-6" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <SettingsForm
              nickname={user.nickname}
              nicknameUpdatedAt={user.nicknameUpdatedAt?.toISOString() ?? null}
              profile={viewer.editorial ? { public: user.profilePublic, handle: user.profileHandle, bio: user.profileBio } : undefined}
            />
          </div>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
