import Link from "next/link";
import { PickCard, CuratorAvatar } from "./CuratorBits";
import { normalizeArea } from "@/lib/editorial/area";
import { AFFINITY_LABEL, affinityReason, curatorPickRecommendations, pickReason } from "@/lib/curators/affinity";
import { curatorDisplayName } from "@/lib/curators/finder";
import type { ViewerCuratorContext } from "@/lib/curators/viewerTaste";

const AREAS = ["연남", "망원", "서촌"];

/**
 * 추천 페이지의 큐레이터 블록(프로토타입) — 기존 추천 목록은 그대로 두고 그 위에 얹는다.
 * 1) 내 취향 요약(실제 방문·저장 + 그 공간을 담은 컬렉션 키워드) 2) 취향이 맞는 큐레이터(단계 표현만, % 없음)
 * 3) 그 큐레이터들이 고른 공간 중 아직 안 간·안 저장한 곳을 지역별로. 문장은 실제 겹침으로만.
 */
export default function CuratorTasteBlock({
  ctx,
  area,
  baseHref,
  savedIds,
  nickname,
}: {
  ctx: ViewerCuratorContext;
  area: string | null;
  /** 지역 칩 링크의 기준 URL(쿼리 pa로 지역을 붙인다) */
  baseHref: string;
  savedIds: Set<string>;
  nickname: string | null;
}) {
  const matched = ctx.affinities.filter((a) => a.level !== "new").slice(0, 2);
  const discover = matched.length === 0 ? ctx.affinities.slice(0, 2) : [];
  const recs = curatorPickRecommendations(ctx.affinities, ctx.picks, ctx.spaces, ctx.profile, {
    exclude: ctx.mySpaceIds,
    area: area ? (s) => normalizeArea(s.area) === area : undefined,
    limit: 4,
  });
  const sep = baseHref.includes("?") ? "&" : "?";

  return (
    <section className="ed-container pt-10" aria-label="큐레이터와 함께 찾기(프로토타입)">
      <div className="p-5 md:p-8 space-y-8" style={{ border: "1px solid var(--ed-fg)" }}>
        <div className="space-y-2">
          <p className="ed-label" style={{ color: "#8a5a00" }}>Prototype · 큐레이터와 함께 찾기</p>
          <p className="text-xl md:text-2xl font-bold tracking-[-0.02em] break-keep">{nickname ? `${nickname}님에게 맞는 공간` : "나에게 맞는 공간"}</p>
          {ctx.topTaste.length > 0 ? (
            <p className="text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              최근 저장하고 다녀온 공간에서는 <strong style={{ color: "var(--ed-fg)" }}>{ctx.topTaste.join(" · ")}</strong> 취향이 자주 나타나요.
            </p>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>아직 쌓인 취향이 없어요. 마음에 드는 공간을 몇 곳 저장하면 취향이 맞는 큐레이터를 찾아드려요.</p>
          )}
        </div>

        {(matched.length > 0 || discover.length > 0) && (
          <div>
            <p className="ed-label pb-3" style={{ color: "var(--ed-dim)" }}>{matched.length > 0 ? "취향이 잘 맞는 큐레이터" : "새로운 취향을 발견할 수 있는 큐레이터"}</p>
            <ul className="grid gap-3 md:grid-cols-2">
              {[...matched, ...discover].map((a) => {
                const name = curatorDisplayName(a.curator);
                const summary = ctx.curators.find((c) => c.slug === a.curator.slug);
                return (
                  <li key={a.curator.slug} className="flex gap-4 py-3" style={{ borderTop: "1px solid var(--ed-line)" }}>
                    <CuratorAvatar name={a.curator.name} imageUrl={summary?.imageUrl ?? null} size={44} />
                    <div className="min-w-0 space-y-1">
                      <p className="text-base font-bold">{a.curator.name} <span className="ml-1 text-xs font-semibold" style={{ color: "var(--ed-dim)" }}>{AFFINITY_LABEL[a.level]}</span></p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--ed-dim)" }}>{affinityReason(a, name)}</p>
                      <Link href={`/curators/${a.curator.slug}`} className="inline-block pt-1 text-xs font-semibold hover:underline underline-offset-4">{a.curator.name}의 공간 보기 →</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {matched.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{area ? `${area}에서 추천` : "이 큐레이터들이 고른 다른 공간"}</p>
              <div className="flex gap-2">
                {AREAS.map((a) => (
                  <Link
                    key={a}
                    href={area === a ? baseHref : `${baseHref}${sep}pa=${encodeURIComponent(a)}`}
                    scroll={false}
                    className="inline-flex items-center h-8 px-3 text-xs"
                    style={area === a ? { background: "var(--ed-fg)", color: "var(--ed-bg)" } : { border: "1px solid var(--ed-line)" }}
                  >
                    {a}
                  </Link>
                ))}
              </div>
            </div>
            {recs.length === 0 ? (
              <p className="py-4 text-sm" style={{ color: "var(--ed-dim)" }}>
                {area ? `${area}에서는 이 큐레이터들이 고른 새 공간이 아직 없어요.` : "이미 다 저장하거나 다녀왔어요."}{" "}
                <Link href={area ? `/find?area=${encodeURIComponent(area)}` : "/find"} className="underline underline-offset-4">조건으로 찾아보기</Link>
              </p>
            ) : (
              recs.map((r) => (
                <PickCard
                  key={r.space.id}
                  space={r.space}
                  comment={r.comment ? { text: r.comment, by: `${curatorDisplayName(r.curator)} · ${r.collectionTitle}` } : null}
                  reason={pickReason(curatorDisplayName(r.curator), r.overlap, r.collectionTitle)}
                  save={{ saved: savedIds.has(r.space.id), loggedIn: true }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
