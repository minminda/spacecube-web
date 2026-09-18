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

export interface ComputeSceneProgressOptions {
  /**
   * 사용자가 실제로 페이지 최하단(더 이상 스크롤할 곳이 없는 지점)에 도달했는지.
   * 마지막 Scene 아래에 남는 여백(다음 이야기 안내, CTA 버튼 등)이 뷰포트 높이보다 짧으면
   * readLine이 documentHeight - innerHeight를 넘을 수 없어 마지막 Scene의 bottom을 영영
   * 지나지 못하는 구조적 한계가 있다 — 그래서 "진짜 페이지 끝에 도달했다"는 별도 신호를
   * 받으면 마지막 Scene만 100%로 강제한다(임의 보정이 아니라, "더 스크롤할 곳이 없다"는
   * 사실 자체가 "마지막 Scene을 끝까지 읽었다"는 뜻이기 때문). 계산은 호출부(컴포넌트)의
   * window.scrollY + window.innerHeight vs document.documentElement.scrollHeight 비교로 넘어온다.
   */
  isAtPageBottom?: boolean;
}

export function computeSceneProgress(
  readLine: number,
  scenes: SceneBounds[],
  options?: ComputeSceneProgressOptions,
): number[] {
  const result = scenes.map(({ top, bottom }) => {
    const height = bottom - top;
    if (height <= 0) return readLine >= bottom ? 1 : 0;
    const ratio = (readLine - top) / height;
    return Math.min(1, Math.max(0, ratio));
  });

  if (options?.isAtPageBottom && result.length > 0) {
    result[result.length - 1] = 1;
  }

  return result;
}
