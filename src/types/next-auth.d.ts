import type { DefaultSession } from "next-auth";

// src/auth.ts의 session 콜백이 session.user.id를 채워주므로, 타입에도 반영한다.
// 이메일이 없을 수 있는 사용자(카카오)도 있으므로 email은 기존 DefaultSession 그대로
// optional/nullable을 유지하고 id만 필수로 추가한다.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
