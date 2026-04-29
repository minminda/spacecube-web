import { signIn } from "@/auth";
import { getLang } from "@/lib/i18n";

export default async function LoginPage() {
  const lang = await getLang();

  const heading =
    lang === "ko" ? "공간 경험을 기록하고,\n취향을 발견해봐" :
    lang === "ja" ? "空間の体験を記録して、\n好みを発見しよう" :
    lang === "zh" ? "记录空间体验，\n发现自己的品味" :
                   "Record your spaces,\ndiscover your taste";
  const googleLabel =
    lang === "ko" ? "Google로 시작하기" : lang === "ja" ? "Googleで始める" :
    lang === "zh" ? "使用 Google 登录" : "Continue with Google";

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">{heading}</h1>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
        <button
          type="submit"
          className="w-full text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          {googleLabel}
        </button>
      </form>
    </main>
  );
}
