import { signIn } from "@/auth";
import { sanitizeRedirectPath } from "@/lib/safeRedirect";
import SocialLoginButton from "./SocialLoginButton";

interface Props {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "이미 다른 방법으로 가입된 이메일이에요. 처음 가입했던 방법으로 로그인해주세요",
};
const DEFAULT_ERROR_MESSAGE = "카카오 로그인을 완료하지 못했습니다. 다시 시도해주세요";

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = sanitizeRedirectPath(callbackUrl);
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? DEFAULT_ERROR_MESSAGE) : null;

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">
          기록을 이어가려면{"\n"}로그인이 필요해요
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          로그인하면 취향 점수와 방문 기록을 내 아카이브에 저장할 수 있습니다
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {errorMessage && (
        <p className="text-xs leading-relaxed" style={{ color: "#e0a030" }}>{errorMessage}</p>
      )}

      <div className="flex flex-col gap-3">
        <form action={async () => { "use server"; await signIn("kakao", { redirectTo }); }}>
          <SocialLoginButton style={{ borderColor: "#FEE500", background: "#FEE500", color: "#191919" }}>
            <span className="inline-flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <ellipse cx="12" cy="11" rx="9" ry="7.5" fill="#191919" />
                <path d="M8 16.5 L6.2 20 L10.5 17.2 Z" fill="#191919" />
              </svg>
              카카오로 계속하기
            </span>
          </SocialLoginButton>
        </form>

        <form action={async () => { "use server"; await signIn("google", { redirectTo }); }}>
          <SocialLoginButton style={{ borderColor: "var(--fg)", color: "var(--fg)" }}>
            Google로 계속하기
          </SocialLoginButton>
        </form>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--dim)" }}>
        공간과 이야기는 로그인하지 않아도 볼 수 있습니다
      </p>
    </main>
  );
}
