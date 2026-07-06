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
 * 디지털 방명록 UX 실험 (더미 데이터, 백엔드 미연동).
 * 공간 상세에서 운영자 이야기를 읽은 뒤 "방문자들의 이야기"를
 * 발견하는 포스트잇 벽. 켜져 있는 동안 기존 방문자 기록 리스트는 숨김.
 */
export const ENABLE_GUESTBOOK_WALL = true;
