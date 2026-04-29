import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLang } from "@/lib/i18n";
import DiscoverEntry from "./DiscoverEntry";

export default async function Home() {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);
  const lang = await getLang();

  const eyebrow = "공간큐브";
  const heading =
    lang === "ko" ? "공간 경험을 기록하고,\n취향을 발견해봐" :
    lang === "ja" ? "空間の体験を記録して、\n好みを発見しよう" :
    lang === "zh" ? "记录空间体验，\n发现自己的品味" :
                   "Record your spaces,\ndiscover your taste";
  const discoverLabel =
    lang === "ko" ? "어디로 갈까" :
    lang === "ja" ? "どこへ行く" :
    lang === "zh" ? "去哪里" : "Where to";
  const archiveLabel =
    lang === "ko" ? "내 아카이브" :
    lang === "ja" ? "マイアーカイブ" :
    lang === "zh" ? "我的档案" : "My Archive";
  const scanHint =
    lang === "ko" ? "공간 안의 큐브를 스캔해서 시작해봐." :
    lang === "ja" ? "空間内のキューブをスキャンして始めよう。" :
    lang === "zh" ? "扫描空间内的方块开始体验。" :
                   "Scan the cube inside a space to begin.";
  const adminLabel =
    lang === "ko" ? "관리자" : lang === "ja" ? "管理者" :
    lang === "zh" ? "管理员" : "Admin";
  const startLabel =
    lang === "ko" ? "시작하기" : lang === "ja" ? "始める" :
    lang === "zh" ? "开始" : "Get Started";

  return (
    <main className="flex flex-col min-h-screen px-6 pt-16 pb-12 gap-10">
      {/* Hero */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{eyebrow}</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">{heading}</h1>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Discover */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{discoverLabel}</p>
        <DiscoverEntry lang={lang} />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* CTA */}
      {session ? (
        <div className="space-y-4">
          <Link
            href="/archive"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {archiveLabel}
          </Link>
          <p className="text-xs text-center" style={{ color: "var(--dim)" }}>{scanHint}</p>
          {admin && (
            <Link
              href="/owner"
              className="block text-xs text-center py-2"
              style={{ color: "var(--dim)" }}
            >
              {adminLabel}
            </Link>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          {startLabel}
        </Link>
      )}
    </main>
  );
}
