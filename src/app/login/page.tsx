import { auth, signIn } from "@/auth";
import { cookies } from "next/headers";
import { GuestbookFunnelStep } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";
import {
  isGuestbookFunnelCallback,
  extractSpaceSlugFromGuestbookCallback,
  recordGuestbookFunnelStep,
} from "@/lib/guestbookFunnel";
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

  // 방명록/기록 흐름에서 온 로그인 요구인지 판정 — 기존 callbackUrl 구조만으로 구분한다
  // (새 인증 시스템·파라미터 없음). 비로그인 방문자가 실제로 이 화면을 보는 시점에만
  // ENTRY_ATTEMPT(방명록 방향으로 이동 시도)와 LOGIN_REQUIRED를 함께 1회 기록한다 —
  // 이미 로그인된 채로 이 URL에 접근한 경우(드묾)는 "로그인 요구를 실제로 겪은 것"이
  // 아니므로 기록하지 않는다.
  const isGuestbookFlow = isGuestbookFunnelCallback(redirectTo);
  if (isGuestbookFlow) {
    const session = await auth();
    if (!session?.user?.id) {
      const slug = extractSpaceSlugFromGuestbookCallback(redirectTo);
      const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;
      if (slug && anonId) {
        const space = await prisma.space.findUnique({ where: { slug }, select: { id: true } });
        if (space) {
          await recordGuestbookFunnelStep({ spaceId: space.id, step: GuestbookFunnelStep.ENTRY_ATTEMPT, anonId });
          await recordGuestbookFunnelStep({ spaceId: space.id, step: GuestbookFunnelStep.LOGIN_REQUIRED, anonId });
        }
      }
    }
  }

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">
          {isGuestbookFlow ? <>방명록을 남기려면{"\n"}로그인이 필요해요</> : <>기록을 이어가려면{"\n"}로그인이 필요해요</>}
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          {isGuestbookFlow ? "간단한 로그인 후 바로 남길 수 있어요" : "로그인하면 취향 점수와 방문 기록을 내 아카이브에 저장할 수 있습니다"}
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
