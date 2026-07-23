import { signIn } from "@/auth";

interface Props {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  // 오픈 리다이렉트 방지 — 같은 오리진의 절대 경로만 허용
  const redirectTo = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">
          공간 경험을 기록하고,{"\n"}취향을 발견해봐
        </h1>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {error === "kakao_email_required" && (
        <p className="text-xs leading-relaxed" style={{ color: "#e0a030" }}>
          카카오 계정에 이메일 제공 동의가 필요합니다. 카카오톡 설정에서 이메일 제공에 동의한 뒤 다시 시도해주세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <form action={async () => { "use server"; await signIn("google", { redirectTo }); }}>
          <button
            type="submit"
            className="w-full text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
          >
            Google로 시작하기
          </button>
        </form>

        <form action={async () => { "use server"; await signIn("kakao", { redirectTo }); }}>
          <button
            type="submit"
            className="w-full text-sm font-medium py-3 border transition-opacity hover:opacity-90"
            style={{ borderColor: "#FEE500", background: "#FEE500", color: "#191919" }}
          >
            카카오로 시작하기
          </button>
        </form>
      </div>
    </main>
  );
}
