/* ── 상세 글 읽기 진행률(순수 함수) ───────────────────────────────────────
   페이지 전체 길이가 아니라 "글 영역"(제목 ~ 마지막 본문 블록) 기준이다.
   - 0: 글 영역 위쪽이 상단 바(Navbar) 바로 아래에 있을 때(= 상세 진입 직후)
   - 1: 글 영역 아래쪽이 화면 아래쪽에 닿았을 때(= 마지막 본문 블록까지 읽음)
   그 아래(관련 공간 · 다른 이야기 · 푸터)로 더 내려가도 1에 머문다.
   글이 화면보다 짧아 더 스크롤할 것이 없으면 1. NaN · Infinity는 나오지 않는다. ── */

export interface ReadingMeasure {
  /** 현재 스크롤 위치(window.scrollY) */
  scrollY: number;
  /** 화면 높이(window.innerHeight) */
  viewportHeight: number;
  /** 글 영역 위쪽의 문서 기준 위치(px) */
  articleTop: number;
  /** 글 영역 아래쪽의 문서 기준 위치(px) */
  articleBottom: number;
  /** 화면 위를 가리는 고정 머리(Navbar) 높이 */
  topOffset: number;
}

export function readingProgress(m: ReadingMeasure): number {
  const values = [m.scrollY, m.viewportHeight, m.articleTop, m.articleBottom, m.topOffset];
  if (!values.every(Number.isFinite)) return 0;
  const start = Math.max(0, m.articleTop - m.topOffset);
  const end = m.articleBottom - m.viewportHeight;
  if (end <= start) return 1;
  const p = (m.scrollY - start) / (end - start);
  return Math.min(1, Math.max(0, p));
}
