/* ── Scene별 Reading Progress 계산 ──────────────────────────────────
   Episode 상세 페이지 상단의 5분할(=Scene 개수만큼) progress bar를 위한 순수 함수.
   "현재 읽는 위치"(readLine, 문서 기준 절대 좌표)가 각 Scene의 실제 DOM 영역(top~bottom,
   문서 기준 절대 좌표) 중 어디까지 지났는지를 0~1 사이 비율로 계산한다. 전체 페이지
   스크롤 비율을 Scene 개수로 균등 분할하지 않고 실제 Scene 경계를 그대로 쓰기 때문에
   Scene별 콘텐츠 길이(사진 유무, 텍스트 길이)가 달라도 정확하다. DOM 측정(getBoundingClientRect)은
   호출부(컴포넌트)의 책임이고, 여기서는 좌표만 받아 순수하게 계산한다 — 유닛 테스트로
   모든 스크롤 위치 조합을 검증할 수 있다(sceneImageLayout.ts와 동일한 패턴).
──────────────────────────────────────────────────────────────────── */

export interface SceneBounds {
  top: number;
  bottom: number;
}

export function computeSceneProgress(readLine: number, scenes: SceneBounds[]): number[] {
  return scenes.map(({ top, bottom }) => {
    const height = bottom - top;
    if (height <= 0) return readLine >= bottom ? 1 : 0;
    const ratio = (readLine - top) / height;
    return Math.min(1, Math.max(0, ratio));
  });
}
