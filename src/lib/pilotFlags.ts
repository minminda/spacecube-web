/* ── 파일럿 기능 축소 플래그 ──────────────────────────────────────────
   실사용 파일럿(공간 설치 + 운영자 위탁) 기간 동안 부가 기능을 "코드·데이터는
   보존한 채 UI 노출과 불필요한 API/Cron/외부호출만" 끄기 위한 단일 플래그 묶음.

   - 값은 전부 환경변수로 제어하고, 값이 없으면(미설정) 전부 비활성(false)이 기본이다.
   - 다시 켜려면 해당 환경변수를 "true"로 설정하고 재배포하면 된다(코드 수정 불필요).
   - 이 모듈은 **서버 전용**으로만 import 한다(server component / route handler).
     비-NEXT_PUBLIC 환경변수는 클라이언트 번들에서 값이 실리지 않으므로, 클라이언트
     컴포넌트에는 서버 컴포넌트가 이 플래그 값을 prop으로 내려준다(예: GuestbookCanvas).
   - 기존 하드코딩 플래그(src/lib/features.ts)와 별개다. features.ts는 상수, 여기는 env 기반.
──────────────────────────────────────────────────────────────────── */

function pilotFlag(name: string): boolean {
  return process.env[name] === "true";
}

/** 월간 리포트 자동 이메일 발송(및 그것을 위한 cron 자동 생성/발송 파이프라인). */
export const ENABLE_REPORT_EMAIL = pilotFlag("ENABLE_REPORT_EMAIL");

/** 방명록 포스트잇 사진 첨부(업로드·표시). off면 Cloudinary 업로드 호출도 하지 않는다. */
export const ENABLE_GUESTBOOK_IMAGE = pilotFlag("ENABLE_GUESTBOOK_IMAGE");

/** 방명록 포스트잇 댓글(작성·표시). */
export const ENABLE_GUESTBOOK_COMMENTS = pilotFlag("ENABLE_GUESTBOOK_COMMENTS");

/** 공감/댓글 알림(알림 벨·목록·알림 생성). 공감 기능 자체는 이 플래그와 무관하게 유지된다. */
export const ENABLE_NOTIFICATIONS = pilotFlag("ENABLE_NOTIFICATIONS");

/** 월간 리포트의 자동 생성 해설/제안 문구(headline·이번 달 변화·공간 경험 요약·다음 달 제안).
    off면 리포트의 원자료(KPI 수치·공감 TOP3·질문별 참여·운영 메모)만 보여준다. */
export const ENABLE_REPORT_AI_ANALYSIS = pilotFlag("ENABLE_REPORT_AI_ANALYSIS");

/** 공간/에피소드 다국어(번역 조회·언어 전환기·번역 생성 OpenAI 호출·관리자 번역 화면). */
export const ENABLE_MULTILINGUAL = pilotFlag("ENABLE_MULTILINGUAL");
