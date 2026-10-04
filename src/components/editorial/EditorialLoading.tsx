import { SPACE_GRID_CLASS } from "./SpaceTile";
import { INDEX_GRID_CLASS } from "./StoryCard";

const soft = { background: "var(--ed-soft)" } as const;

/**
 * 사용자 화면 공용 로딩 — 실제 화면과 같은 자리에 회색 면만 놓아 내용이 들어올 때 레이아웃이 튀지 않게 한다. 움직임 없음.
 * space: 공간 그리드(추천 · 내 아카이브 · 공개 프로필) / index: STORY · CURATION 목록 /
 * detail: STORY · CURATION · 공간 상세(라벨 · 제목 · 대표 이미지 · 본문 몇 줄).
 */
export default function EditorialLoading({ grid = "space" }: { grid?: "space" | "index" | "detail" }) {
  if (grid === "detail") {
    return (
      <div className="editorial-bleed" aria-busy="true" aria-label="불러오는 중">
        <main className="pb-20">
          <div className="ed-container pt-10 md:pt-16 space-y-3">
            <div className="h-3 w-24" style={soft} />
            <div className="h-8 md:h-12 w-4/5 md:w-3/5" style={soft} />
            <div className="h-8 md:h-12 w-1/2 md:w-2/5" style={soft} />
          </div>
          <div className="ed-container pt-10 md:pt-14">
            <div className="aspect-[16/9]" style={soft} />
          </div>
          <div className="ed-container pt-12 space-y-3 max-w-[720px]">
            {[100, 92, 96, 70].map((w, i) => <div key={i} className="h-3" style={{ ...soft, width: `${w}%` }} />)}
          </div>
        </main>
      </div>
    );
  }
  const cells = grid === "space" ? 12 : 6;
  return (
    <div className="editorial-bleed" aria-busy="true" aria-label="불러오는 중">
      <main className="pb-20">
        <div className="ed-container pt-8 pb-6 md:pt-14 md:pb-8 space-y-3">
          <div className="h-3 w-20" style={soft} />
          <div className="h-9 md:h-14 w-40 md:w-64" style={soft} />
        </div>
        <div className="ed-container">
          <div className="h-11" style={{ borderBottom: "1px solid var(--ed-line)" }} />
          <div className={`pt-8 ${grid === "space" ? SPACE_GRID_CLASS : INDEX_GRID_CLASS}`}>
            {Array.from({ length: cells }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="aspect-[4/5]" style={soft} />
                <div className="h-2.5 w-2/3" style={soft} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
