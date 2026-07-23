import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// 카카오는 이메일 동의 여부와 무관하게 로그인이 항상 성공해야 한다 — Auth.js/PrismaAdapter는
// 이미 이를 안전하게 처리한다: 재로그인은 Account.provider+providerAccountId로만 식별되고
// (이메일 무관), 최초 로그인에 이메일이 없으면 그냥 email=null인 User를 새로 만든다. 이메일이
// 같은 기존 계정이 있을 때만 자동 병합하지 않고 OAuthAccountNotLinked로 막는다(기본 동작,
// allowDangerousEmailAccountLinking을 켜지 않았으므로). 그래서 이 provider 설정에는 이메일을
// 강제로 요구하는 커스텀 로직을 두지 않는다 — 실제 동의항목은 카카오 디벨로퍼스 콘솔에서 정한다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // next-auth 내장 Kakao provider의 기본 authorization URL은
    // "https://kauth.kakao.com/oauth/authorize?scope"로 끝에 값 없는 scope 파라미터가
    // 붙어있다 — 그대로 두면 실제 요청에 "scope=" (빈 문자열)가 포함되어 카카오 인증 서버가
    // 계정 선택 이후 단계(동의 화면 구성)에서 KOE101 오류를 낸다. scope 파라미터 자체를
    // 아예 안 보내도록 URL을 명시적으로 덮어쓴다 — 콘솔에 설정된 동의항목대로 동작하게 된다.
    Kakao({ authorization: "https://kauth.kakao.com/oauth/authorize" }),
    Google,
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 기본 session 콜백은 name/email/image만 남기고 user.id를 잘라낸다. 이메일이 없을 수 있는
    // 카카오 사용자까지 포함해 앱 전체가 내부 User.id로 본인 데이터를 식별할 수 있어야 하므로
    // 여기서 명시적으로 채워준다(src/types/next-auth.d.ts에 타입 보강 있음).
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

// 참고: signOut()은 공간큐브 서비스 세션만 종료한다. 카카오 계정 자체의 로그인 상태나
// 앱 연결(연동) 해제와는 다른 개념이다 — 카카오 연동 해제는 계정 탈퇴 기능을 만들 때 별도로
// 카카오 REST API(연결 끊기)를 호출해야 하며, 이번 작업 범위에는 포함하지 않는다.
