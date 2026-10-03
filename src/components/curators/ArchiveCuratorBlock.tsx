import Link from "next/link";
import { FINDER_FEELS, FINDER_PURPOSES } from "@/lib/curators/finder";
import { attrKey } from "@/lib/discoveryRecommend";
import { AFFINITY_LABEL } from "@/lib/curators/affinity";
import type { ViewerCuratorContext } from "@/lib/curators/viewerTaste";

const AREAS = ["연남", "망원", "서촌"];

/** 내 취향 → 빠른 찾기 조건(찾기 화면의 어휘에 있는 것만, 느낌 1 · 목적 1). */
function finderParams(topTaste: string[]): string {
  const keys = topTaste.map(attrKey);
  const feel = FINDER_FEELS.find((f) => keys.includes(attrKey(f)));
  const purpose = FINDER_PURPOSES.find((p) => keys.some((k) => p.match.some((m) => k.includes(m))));
  return [feel ? `feel=${encodeURIComponent(feel)}` : "", purpose ? `for=${encodeURIComponent(purpose.key)}` : ""].filter(Boolean).join("&");
}

/**
 * 아카이브의 큐레이터 미리보기(프로토타입) — 아카이브는 여전히 "내가 경험하고 저장한 공간"이 중심이고,
 * 이 블록은 다음 공간을 찾기 위한 보조 입구일 뿐이다(SNS 프로필처럼 보이지 않게 한 줄 단위로만).
 */
export default function ArchiveCuratorBlock({ ctx }: { ctx: ViewerCuratorContext }) {
  if (ctx.empty) return null;
  const matched = ctx.affinities.filter((a) => a.level !== "new").slice(0, 2);
  const params = finderParams(ctx.topTaste);
  return (
    <section className="ed-container pb-10">
      <div className="py-5 space-y-4" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)" }}>
        <p className="ed-label" style={{ color: "#8a5a00" }}>Prototype · 나의 공간 취향</p>
        <p className="text-base font-semibold">{ctx.topTaste.join(" · ")}</p>
        {matched.length > 0 && (
          <p className="text-sm">
            <span style={{ color: "var(--ed-dim)" }}>취향이 잘 맞는 큐레이터 · </span>
            {matched.map((a, i) => (
              <span key={a.curator.slug}>
                {i > 0 && ", "}
                <Link href={`/curators/${a.curator.slug}`} className="font-semibold underline underline-offset-4">{a.curator.name}</Link>
                <span className="text-xs" style={{ color: "var(--ed-dim)" }}> ({AFFINITY_LABEL[a.level]})</span>
              </span>
            ))}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: "var(--ed-dim)" }}>이 취향으로 다른 지역 찾기</span>
          {AREAS.map((a) => (
            <Link key={a} href={`/find?area=${encodeURIComponent(a)}${params ? `&${params}` : ""}`} className="inline-flex items-center h-8 px-3 text-xs font-semibold" style={{ border: "1px solid var(--ed-fg)" }}>
              {a}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
