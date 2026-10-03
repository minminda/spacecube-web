import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { getArchiveDetail } from "@/lib/archive/detail";
import { getArchiveTagOptions } from "@/lib/archive/entries";
import { SOURCE_KIND_LABEL } from "@/lib/archive/source";
import { formatDotDate } from "@/lib/time";
import { curatorAccess } from "@/lib/curators/access";
import { getPicksForSpace } from "@/lib/curators/queries";
import { curatorDisplayName } from "@/lib/curators/finder";
import EntryActions, { PhotoGrid } from "@/components/archive/EntryActions";

export const metadata: Metadata = { title: "내 아카이브 — 공간큐브", robots: { index: false } };

interface Props {
  params: Promise<{ key: string }>;
}

/**
 * 아카이브 공간 상세 — 본인만. 대표 사진 · 이름 · 지역 · 상태 · 나의 한 줄 · 태그 · 방문 기록(내 방문 + Cube 방문) · 사진 · 출처 링크.
 * 사진은 다른 사용자나 공개 화면에 나가지 않는다. 공간큐브 공간이면 공개 상세와 "이 공간을 추천한 사람"으로 이어진다.
 */
export default async function ArchiveDetailPage({ params }: Props) {
  const [{ key: rawKey }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/archive/p/${rawKey}`)}`);
  const key = decodeURIComponent(rawKey);
  const admin = isAdmin(session.user.email);
  const editorialViewer = ENABLE_EDITORIAL_HOME || admin;
  const includeDemo = admin || process.env.NODE_ENV === "development";

  const result = await getArchiveDetail(session.user.id, key, { includeDemo });
  if (result.kind === "redirect") redirect(`/archive/p/${encodeURIComponent(result.key)}`);
  if (result.kind === "notFound") notFound();
  const d = result.data;

  const access = curatorAccess({ admin, editorial: editorialViewer });
  const [tagOptions, picks] = await Promise.all([
    getArchiveTagOptions(),
    d.editorial && access.enabled ? getPicksForSpace(d.editorial.id, access) : Promise.resolve([]),
  ]);
  const curators = [...new Map(picks.map((p) => [p.curator.slug, p])).values()];
  const visitCount = d.timeline.length;
  const personal = !d.editorial;

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <div className="ed-container pt-8 md:pt-12">
          <Link href="/archive" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← 내 아카이브</Link>
        </div>

        <div className="ed-container pt-6 grid gap-8 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-6">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 5", background: "var(--ed-soft)" }}>
              {d.cover ? (
                <Image src={d.cover} alt={d.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority />
              ) : (
                <span className="absolute inset-0 flex items-end p-5 text-2xl font-bold">{d.name}</span>
              )}
            </div>
            {d.cover && !d.coverIsMine && <p className="pt-1.5 text-[11px]" style={{ color: "var(--ed-dim)" }}>공간큐브의 공간 사진 · 내 사진을 더하면 그 사진이 대표가 돼요</p>}
          </div>

          <div className="md:col-span-6 space-y-6">
            <div className="space-y-2">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>
                {[d.area, d.category].filter(Boolean).join(" · ") || "지역 미입력"}
                {personal && " · 개인 기록"}
                {d.editorial?.isDemo && " · 가상 공간"}
              </p>
              <h1 className="text-[36px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.04em] break-keep">{d.name}</h1>
              <p className="text-sm tabular-nums">
                {d.visited ? <strong>다녀왔어요{visitCount > 1 ? ` · ${visitCount}번` : ""}</strong> : <strong>가보고 싶어요</strong>}
                {d.cubeVisits > 0 && <span style={{ color: "var(--ed-dim)" }}> · Cube로 {d.cubeVisits}번</span>}
                {d.entry?.wantAgain === true && <span style={{ color: "var(--ed-dim)" }}> · 또 가고 싶어요</span>}
              </p>
            </div>

            {(d.entry?.memo || (d.entry?.tags.length ?? 0) > 0) && (
              <div className="space-y-2 py-4" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)" }}>
                {d.entry?.memo && <p className="text-lg leading-relaxed break-keep">“{d.entry.memo}”</p>}
                {d.entry && d.entry.tags.length > 0 && <p className="text-sm" style={{ color: "var(--ed-dim)" }}>{d.entry.tags.map((t) => `#${t}`).join("  ")}</p>}
              </div>
            )}

            <EntryActions
              entryId={d.entry?.id ?? null}
              spaceId={d.editorial?.id ?? null}
              visited={d.visited}
              cubeVisited={d.cubeVisits > 0}
              personal={personal}
              initial={{ placeName: d.name, placeArea: d.entry?.placeArea ?? "", memo: d.entry?.memo ?? "", tags: d.entry?.tags ?? [], wantAgain: d.entry?.wantAgain ?? null }}
              tagOptions={tagOptions}
            />

            <div className="space-y-1.5 text-sm">
              {d.editorial && editorialViewer && (
                <p><Link href={`/spaces/${d.editorial.slug}`} className="font-semibold underline underline-offset-4">공간큐브에서 이 공간 보기 →</Link></p>
              )}
              {d.operational && d.cubeVisits > 0 && (
                <p><Link href={`/archive/space/${d.operational.id}`} className="underline underline-offset-4">Cube 방문의 감정 태그·방명록 보기 →</Link></p>
              )}
              {d.entry?.sourceUrl && (
                <p style={{ color: "var(--ed-dim)" }}>
                  처음 본 곳 · <a href={d.entry.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">{SOURCE_KIND_LABEL[d.entry.sourceKind as keyof typeof SOURCE_KIND_LABEL] ?? "링크"} ↗</a>
                </p>
              )}
              {personal && <p className="text-xs leading-relaxed" style={{ color: "var(--ed-dim)" }}>공간큐브에 아직 없는 공간이라 나만 볼 수 있는 기록으로 남겼어요.</p>}
            </div>
          </div>
        </div>

        {d.timeline.length > 0 && (
          <section className="ed-container pt-14">
            <p className="ed-label pb-2" style={{ color: "var(--ed-dim)" }}>방문 기록</p>
            <ol>
              {d.timeline.map((t) => (
                <li key={t.key} className="py-4 space-y-2" style={{ borderTop: "1px solid var(--ed-line)" }}>
                  <p className="text-sm tabular-nums">
                    <strong>{formatDotDate(t.at)}</strong>
                    <span style={{ color: "var(--ed-dim)" }}> · {t.kind === "cube" ? "Cube로 방문" : t.dated ? "다녀왔어요" : "기록한 날"}</span>
                  </p>
                  {t.memo && <p className="text-[15px] leading-relaxed break-keep">{t.memo}</p>}
                  {t.photos.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto ed-scroll-x">
                      {t.photos.map((p, i) => (
                        // eslint-disable-next-line @next/next/no-img-element -- 사용자 개인 사진 썸네일
                        <img key={p.id} src={p.url.replace("/image/upload/", "/image/upload/c_fill,w_240,h_240,q_auto,f_auto/")} alt={`방문 사진 ${i + 1}`} className="shrink-0 w-24 h-24 object-cover" loading="lazy" />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {d.entry && d.photos.length > 0 && (
          <section className="ed-container pt-12">
            <p className="ed-label pb-3" style={{ color: "var(--ed-dim)" }}>내 사진 · {d.photos.length} · 나만 볼 수 있어요</p>
            <PhotoGrid entryId={d.entry.id} photos={d.photos} />
          </section>
        )}

        {curators.length > 0 && (
          <section className="ed-container pt-12">
            <p className="ed-label pb-3" style={{ color: "var(--ed-dim)" }}>이 공간을 추천한 사람 · Prototype</p>
            <ul className="space-y-3">
              {curators.map((p) => (
                <li key={p.curator.slug} className="text-sm">
                  <Link href={`/curators/${p.curator.slug}`} className="font-semibold underline underline-offset-4">{curatorDisplayName(p.curator)}</Link>
                  <span style={{ color: "var(--ed-dim)" }}> · {p.collection.title}</span>
                  {p.comment && <span className="block pt-0.5 break-keep">“{p.comment}”</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
