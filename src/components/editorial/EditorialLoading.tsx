/**
 * 사용자 화면 공용 로딩 — 추천 · 내 아카이브 · STORY · CURATION · LATEST가 같은 모양을 쓴다.
 * 실제 화면과 같은 자리(헤더 · 탭 줄 · 사진 그리드)에 회색 면만 놓아 내용이 들어올 때 레이아웃이 튀지 않게 한다.
 * 움직임 없음.
 */
export default function EditorialLoading({ grid = "space" }: { grid?: "space" | "index" }) {
  const cells = grid === "space" ? 8 : 3;
  return (
    <div className="editorial-bleed" aria-busy="true" aria-label="불러오는 중">
      <main className="pb-20">
        <div className="ed-container pt-8 pb-6 md:pt-14 md:pb-8 space-y-3">
          <div className="h-3 w-20" style={{ background: "var(--ed-soft)" }} />
          <div className="h-9 md:h-14 w-40 md:w-64" style={{ background: "var(--ed-soft)" }} />
        </div>
        <div className="ed-container">
          <div className="h-11" style={{ borderBottom: "1px solid var(--ed-line)" }} />
          <div className={`pt-8 ${grid === "space" ? "grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4" : "grid gap-y-10 md:grid-cols-2 md:gap-x-8 lg:grid-cols-3"}`}>
            {Array.from({ length: cells }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className={grid === "space" ? "aspect-[4/5]" : "aspect-[3/2] md:aspect-[4/5]"} style={{ background: "var(--ed-soft)" }} />
                <div className="h-3 w-2/3" style={{ background: "var(--ed-soft)" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
