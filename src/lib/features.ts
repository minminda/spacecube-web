/**
 * MVP 기간 기능 플래그.
 * QR 스캔 → 공간 이야기 → 기록 핵심 경험에 집중하기 위해
 * 지역/취향 이야기(ContentStory) 관련 UI를 화면에서만 숨긴다.
 *
 * true로 바꾸면 즉시 원상복구 — 컴포넌트, API, 데이터 구조는 삭제하지 않고 그대로 유지.
 */
export const ENABLE_REGION_STORIES = false;
export const ENABLE_TASTE_STORIES = false;

/**
 * 기록·추천 UX 전환 플래그.
 * - RECORD_TAG_SELECTION: 기존 태그 2개 선택 방식 (보존용, 현재 꺼짐)
 * - TASTE_SCORE_RECOMMENDATION: 취향 적합도 1~5점 기반 가중치 추천 (현재 기본)
 * - RECOMMENDATION_PLAYLIST_UI: 추천 카드를 좌우 스와이프 플레이리스트로 표시
 */
export const ENABLE_RECORD_TAG_SELECTION = false;
export const ENABLE_TASTE_SCORE_RECOMMENDATION = true;
export const ENABLE_RECOMMENDATION_PLAYLIST_UI = true;

/**
 * 디지털 방명록 — 공간별 /space/[slug]/guestbook 캔버스 페이지.
 * 공간 상세의 "방문자들의 이야기 열어보기" 입구와
 * 기존 방문자 기록 리스트 숨김을 함께 제어.
 * 실제 흔적은 GuestbookNote 테이블에 저장, 더미 60개가 분위기를 채움.
 */
export const ENABLE_GUESTBOOK_WALL = true;

/**
 * 방명록 공감 정책 상수. MVP에서는 자신의 포스트잇에 공감하는 것을 차단한다.
 * true로 바꾸면 자기 글 공감도 허용.
 */
export const ALLOW_SELF_GUESTBOOK_REACTION = false;

/**
 * 다크모드 토글 노출 여부. 현재 서비스는 실제 공간 설치 테스트를 위해
 * OS/브라우저 테마와 무관하게 항상 라이트 모드로 고정한다.
 * 구현(ThemeToggle, [data-theme="dark"] CSS 변수)은 삭제하지 않고 그대로 두되
 * 렌더링에는 영향을 주지 않도록 분리 — true로 바꾸면 즉시 복구.
 */
export const ENABLE_DARK_MODE_TOGGLE = false;

/**
 * 최초 진입 시 표시되는 인트로(OnboardingOverlay) 노출 여부.
 * 지금은 홈/요청 페이지를 지연 없이 바로 보여주기 위해 끈다.
 * 컴포넌트, localStorage 로직은 삭제하지 않고 그대로 두되 마운트만 막음 — true로 바꾸면 즉시 복구.
 */
export const ENABLE_INITIAL_ONBOARDING = false;
