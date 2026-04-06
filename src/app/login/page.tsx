import { signIn } from "@/auth";
import { getLang } from "@/lib/i18n";

export default async function LoginPage() {
  const lang = await getLang();
  const ko = lang === "ko";

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE / LOGIN</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-2">
        <p className="text-xl tracking-widest">{ko ? "□ 공간큐브" : "□ SPACECUBE"}</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          {ko ? (
            <>&gt; 공간 경험을 기록하고<br />&nbsp;&nbsp;취향을 발견해봐.</>
          ) : (
            <>&gt; Record your space experiences<br />&nbsp;&nbsp;and discover your taste.</>
          )}
        </p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          {ko ? "// 로그인 방법 선택" : "// Choose login method"}
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full text-sm py-2 px-4 border text-left hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
          >
            {ko ? "> Google로 시작하기_" : "> Start with Google_"}
          </button>
        </form>
      </div>
    </main>
  );
}
