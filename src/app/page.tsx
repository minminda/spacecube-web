import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLang } from "@/lib/i18n";
import DiscoverEntry from "./DiscoverEntry";

export default async function Home() {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);
  const lang = await getLang();

  const title    = lang === "ko" ? "□ 공간큐브"   : lang === "ja" ? "□ SPACECUBE"  : "□ SPACECUBE";
  const version  = lang === "ko" ? "공간큐브 v1.0" : "SPACECUBE v1.0";
  const subtitle = lang === "ko"
    ? <>&gt; 공간 경험을 기록하고<br />&nbsp;&nbsp;취향을 발견해봐.</>
    : lang === "ja"
    ? <>&gt; 空間の体験を記録して<br />&nbsp;&nbsp;好みを発見しよう。</>
    : <>&gt; Record your space experiences<br />&nbsp;&nbsp;and discover your taste.</>;

  const archiveLabel  = lang === "ko" ? "[[ 내 아카이브 ]]"   : lang === "ja" ? "[[ マイアーカイブ ]]" : "[[ My Archive ]]";
  const scanHint      = lang === "ko" ? "> 공간 안의 큐브를 스캔해서 시작해봐." : lang === "ja" ? "> 空間内のキューブをスキャンして始めよう。" : "> Scan the cube inside a space to begin.";
  const adminLabel    = lang === "ko" ? "[[ 관리자 ]]"         : lang === "ja" ? "[[ 管理者 ]]"          : "[[ Admin ]]";
  const startLabel    = lang === "ko" ? "[[ 시작하기 ]]"        : lang === "ja" ? "[[ 始める ]]"          : "[[ Get Started ]]";

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">{version}</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-3">
        <p className="text-2xl tracking-widest">{title}</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>{subtitle}</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <div className="space-y-4">
        <p className="text-xs" style={{ color: "var(--dim)" }}>// WHERE DO YOU WANT TO GO</p>
        <DiscoverEntry lang={lang} />
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {session ? (
        <div className="space-y-3">
          <Link
            href="/archive"
            className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {archiveLabel}
          </Link>
          <p className="text-xs" style={{ color: "var(--dim)" }}>{scanHint}</p>
          {admin && (
            <Link
              href="/owner"
              className="block text-xs py-1 px-2 border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              {adminLabel}
            </Link>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          {startLabel}
        </Link>
      )}
    </main>
  );
}
