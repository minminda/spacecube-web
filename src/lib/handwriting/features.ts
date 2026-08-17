/**
 * EXPERIMENTAL ONLY — 손글씨→디지털 필체 변환 PoC 전용 플래그.
 * 기존 src/lib/pilotFlags.ts와 동일한 패턴(env 기반, 기본 false) — 개발/프로덕션 구분 없이
 * ENABLE_HANDWRITING_POC=true를 명시적으로 설정하지 않는 한 항상 꺼진다(파일럿 기간 동안
 * 관리자 메뉴/페이지/API 어디에서도 노출되지 않음 — 재활성화는 이 값만 true로 바꾸면 됨).
 */
export const ENABLE_HANDWRITING_POC = process.env.ENABLE_HANDWRITING_POC === "true";

/** Python 추론 서비스 주소 — 로컬 기본값 localhost:8000, 배포 시 Cloud Run 등의 URL로 교체.
 *  서버 컴포넌트/라우트 핸들러에서만 참조(클라이언트 번들에 안 실림). */
export const HANDWRITING_SERVICE_URL = process.env.HANDWRITING_SERVICE_URL ?? "http://localhost:8000";

/** Python 서비스와 공유하는 비밀값 — 브라우저에는 절대 노출되지 않고, 서버(API 라우트)가
 *  Python 서비스를 호출할 때만 헤더로 붙인다. 로컬 개발(미설정)에서는 양쪽 다 검증을 건너뛴다. */
export const HANDWRITING_SERVICE_SECRET = process.env.HANDWRITING_SERVICE_SECRET;
