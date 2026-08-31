/* ── QR 진입 대기 화면(최소) ──────────────────────────────────
   /c/[code]가 목적지(cube 상태 → SpaceScan 기록 → Episode 결정)를 확인하는 동안 흰 화면
   대신 보여주는 화면이다. 이전엔 Cube Unlock 큐브 비주얼을 여기서도 보여줬는데, 목적지
   Episode 페이지의 SpaceUnlockScreen이 곧이어 같은 큐브 애니메이션을 다시 재생해 "큐브가
   두 번 등장"하는 것처럼 보였다 — 그래서 이 화면은 의도적으로 텍스트 하나만 보여주고,
   실제 Cube Unlock 리츄얼은 목적지 페이지에서만 정확히 한 번 재생되게 한다. ── */

export default function EntryLoadingScreen() {
  return (
    <div
      role="status"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "#FFFFFF" }}
    >
      <p className="text-sm" style={{ color: "#9a9a9a", letterSpacing: "0.02em" }}>
        Loading...
      </p>
    </div>
  );
}
