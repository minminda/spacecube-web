import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import SaveButton from "@/components/editorial/SaveButton";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { prisma } from "@/lib/prisma";
import { getPublicRecord } from "@/lib/profile/profileData";
import { normalizeHandle, profilePath } from "@/lib/profile/publicProfile";
import { hasBatchim } from "@/lib/curators/finder";

interface Props {
  params: Promise<{ handle: string; slug: string }>;
}

export const metadata: Metadata = { title: "공개 기록 — 공간큐브", robots: { index: false } };

/**
 * 공개 기록 — 한 사람이 고른 공간 하나. 공간과 사진 중심, 나의 한 줄·방문 시기는 그 사람이 각각 허용했을 때만.
 * 저장은 기존 공간 저장(같은 canonical 공간 id → 내 아카이브), 공간 정보는 공개 공간 상세로.
 */
export default async function PublicRecordPage({ params }: Props) {
  const [{ handle: raw, slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) notFound();
  const handle = normalizeHandle(decodeURIComponent(raw));
  const r = await getPublicRecord(handle, decodeURIComponent(slug), viewer.userId);
  if (!r) notFound();
  const saved = viewer.userId
    ? !!(await prisma.savedEditorialSpace.findUnique({ where: { userId_spaceId: { userId: viewer.userId, spaceId: r.space.id } }, select: { id: true } }))
    : false;
  const own = r.photos.length > 0;

  return (
    <div className="editorial-bleed">
      <main className="pb-24 md:pb-32">
        <div className="ed-container pt-8 md:pt-12">
          <Link href={profilePath(r.profile.handle)} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {r.profile.name}의 아카이브</Link>
        </div>

        <div className="ed-container pt-8 grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-7 space-y-3">
            {own ? (
              r.photos.map((url, i) => (
                <EdImage key={url} image={{ src: url, alt: `${r.space.name} — ${r.profile.name}의 사진 ${i + 1}` }} ratio={i === 0 ? "4 / 5" : "3 / 2"} sizes="(min-width: 768px) 58vw, 100vw" priority={i === 0} />
              ))
            ) : (
              <EdImage image={{ src: r.space.coverImage ?? null, alt: r.space.name, position: r.space.coverPosition }} ratio="4 / 5" sizes="(min-width: 768px) 58vw, 100vw" priority />
            )}
          </div>

          <div className="md:col-span-5 md:pt-4 space-y-6">
            <div className="space-y-3">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>
                {[r.space.area, r.space.category].filter(Boolean).join(" · ")}
              </p>
              <h1 className="text-[36px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.04em] break-keep">{r.space.name}</h1>
              <p className="text-sm" style={{ color: "var(--ed-dim)" }}>
                {r.profile.name}{hasBatchim(r.profile.name) ? "이" : "가"} {r.visited ? "다녀온 곳" : "가보고 싶은 곳"}
                {r.month && <span className="tabular-nums"> · {r.month}</span>}
              </p>
            </div>

            {r.memo && (
              <p className="py-5 text-lg md:text-xl leading-relaxed break-keep" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)" }}>
                “{r.memo}”
              </p>
            )}

            <div className="flex flex-wrap items-start gap-3">
              <SaveButton spaceId={r.space.id} spaceName={r.space.name} initialSaved={saved} loggedIn={viewer.loggedIn} variant="text" />
              <Link href={`/spaces/${r.space.slug}`} className="tap-target inline-flex items-center px-4 text-sm" style={{ border: "1px solid var(--ed-line)" }}>공간 자세히 보기 →</Link>
            </div>
            <p className="text-xs leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              저장하면 내 아카이브에 같은 공간으로 담겨요.{own ? "" : " 사진은 공간큐브의 공간 사진이에요."}
            </p>
          </div>
        </div>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
