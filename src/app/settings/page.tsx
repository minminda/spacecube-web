import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import SettingsForm from "@/components/SettingsForm";
import ThemeSetting from "@/components/settings/ThemeSetting";
import SettingsSection from "@/components/settings/SettingsSection";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getEditorialViewer } from "@/lib/editorial/viewer";

export const metadata: Metadata = { title: "설정 — 공간큐브", robots: { index: false } };

/**
 * 설정 — 메뉴의 "설정"으로 들어온다(화면마다 톱니바퀴를 두지 않는다). SettingsForm:
 * 닉네임 · 공개 프로필(공개 여부 · 주소 · 소개) · 화면 테마 · 계정(로그아웃).
 * 로그인하지 않은 사람도 열 수 있다 — 화면 테마는 이 기기에 저장되므로 계정이 없어도 바꿀 수 있고, 나머지는 로그인 안내로 대신한다.
 */
export default async function SettingsPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.userId) {
    return (
      <div className="editorial-bleed">
        <main className="pb-20 md:pb-28">
          <PageHeader title="설정" />
          <section className="ed-container">
            <div className="max-w-[560px]">
              <ThemeSetting />
              <SettingsSection title="계정" description="로그인하면 닉네임과 공개 프로필을 설정할 수 있어요.">
                <Link href="/login?callbackUrl=%2Fsettings" className="ed-btn ed-btn-primary w-full sm:w-auto sm:min-w-40">로그인</Link>
              </SettingsSection>
            </div>
          </section>
        </main>
        <SiteFooter admin={false} />
      </div>
    );
  }
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
          <div className="max-w-[560px]">
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
