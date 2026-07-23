import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Kakao({ authorization: { params: { scope: "account_email" } } }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 카카오는 이메일 동의를 안 받으면 email이 아예 없거나 미검증 상태로 내려온다. 이 앱의 거의
    // 모든 쓰기 경로(기록/방명록/취향저장 등)가 session.user.email을 사용자 식별 키로 쓰므로,
    // 이메일이 확실하지 않은 카카오 로그인은 여기서 막아 나머지 코드를 건드리지 않고도 안전하게 만든다.
    async signIn({ account, profile }) {
      if (account?.provider === "kakao") {
        const kakaoAccount = (profile as { kakao_account?: { email?: string; is_email_valid?: boolean; is_email_verified?: boolean } } | undefined)?.kakao_account;
        if (!kakaoAccount?.email || !kakaoAccount.is_email_valid || !kakaoAccount.is_email_verified) {
          return "/login?error=kakao_email_required";
        }
      }
      return true;
    },
  },
});
