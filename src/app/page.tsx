import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import DiscoverEntry from "./DiscoverEntry";

export default async function Home() {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);
  const lang = await getLang();

  const now = new Date();

  const [stories, spaces, storyCount, spaceCount] = await Promise.all([
    prisma.contentStory.findMany({
      where: { isActive: true, publishedAt: { not: null, lte: now } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      include: {
        storySpaces: {
          orderBy: { order: "asc" },
          take: 3,
          include: { space: { select: { name: true, slug: true } } },
        },
      },
    }),
    prisma.space.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { slug: true, name: true, tagline: true, type: true, district: true, imageUrl: true },
    }),
    prisma.contentStory.count({ where: { isActive: true, publishedAt: { not: null, lte: now } } }),
    prisma.space.count({ where: { isActive: true } }),
  ]);

  const heading =
    lang === "ko" ? "공간 경험을 기록하고,\n취향을 발견해봐" :
    lang === "ja" ? "空間の体験を記録して、\n好みを発見しよう" :
    lang === "zh" ? "记录空间体验，\n发现自己的品味" :
                   "Record your spaces,\ndiscover your taste";

  const archiveLabel =
    lang === "ko" ? "내 아카이브" :
    lang === "ja" ? "マイアーカイブ" :
    lang === "zh" ? "我的档案" : "My Archive";
  const startLabel =
    lang === "ko" ? "시작하기" : lang === "ja" ? "始める" :
    lang === "zh" ? "开始" : "Get Started";

  const [featured, ...rest] = stories;

  return (
    <main className="flex flex-col min-h-screen pb-16">

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="px-6 pt-12 pb-10 space-y-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
          <span className="text-xs tabular-nums" style={{ color: "var(--border)" }}>
            {spaceCount}곳 · {storyCount}편
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">{heading}</h1>
        <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
          작은 문화공간의 이야기를 기록합니다.<br />
          경험이 쌓일수록 취향이 드러납니다.
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ─── 대표 이야기 ────────────────────────────────── */}
      {featured && (
        <>
          <section className="px-6 pt-8 pb-10 space-y-5">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>
              {featured.type === "REGION" ? "지역 이야기" : "취향 이야기"}
            </p>

            <Link href={`/story/${featured.slug}`} className="block group space-y-4">
              {featured.imageUrl ? (
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 2", background: "var(--tag-bg)" }}>
                  <Image
                    src={featured.imageUrl}
                    alt={featured.title}
                    fill
                    priority
                    className="object-cover group-hover:opacity-90 transition-opacity"
                    style={{ aspectRatio: "unset" }}
                  />
                </div>
              ) : (
                <div className="w-full" style={{ aspectRatio: "3 / 2", background: "var(--tag-bg)" }} />
              )}

              <div className="space-y-3">
                {(featured.district || featured.persona) && (
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {featured.type === "REGION" ? featured.district : featured.persona}
                  </p>
                )}
                <h2 className="text-2xl font-bold leading-snug group-hover:underline">
                  {featured.title}
                </h2>
                <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
                  {featured.intro.length > 160 ? featured.intro.slice(0, 160).trimEnd() + "…" : featured.intro}
                </p>
                {featured.storySpaces.length > 0 && (
                  <p className="text-xs" style={{ color: "var(--border)" }}>
                    {featured.storySpaces.map((s) => s.space.name).join("  ·  ")}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--dim)" }}>읽기 →</p>
              </div>
            </Link>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      {/* ─── 최근 이야기 4편 ─────────────────────────────── */}
      {rest.length > 0 && (
        <>
          <section className="px-6 pt-8 pb-10 space-y-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>최근 이야기</p>
              <Link href="/stories" className="text-xs transition-opacity hover:opacity-60" style={{ color: "var(--dim)" }}>
                전체 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              {rest.map((story) => (
                <Link key={story.id} href={`/story/${story.slug}`} className="block group space-y-3">
                  {story.imageUrl ? (
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }}>
                      <Image
                        src={story.imageUrl}
                        alt={story.title}
                        fill
                        className="object-cover group-hover:opacity-90 transition-opacity"
                        style={{ aspectRatio: "unset" }}
                      />
                    </div>
                  ) : (
                    <div className="w-full" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }} />
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                      {story.type === "REGION" ? "지역" : "취향"}
                    </span>
                    {(story.district || story.persona) && (
                      <span className="text-xs" style={{ color: "var(--dim)" }}>
                        {story.type === "REGION" ? story.district : story.persona}
                      </span>
                    )}
                  </div>

                  <p className="text-base font-semibold leading-snug group-hover:underline">{story.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                    {story.intro.length > 80 ? story.intro.slice(0, 80).trimEnd() + "…" : story.intro}
                  </p>
                  {story.storySpaces.length > 0 && (
                    <p className="text-xs" style={{ color: "var(--border)" }}>
                      {story.storySpaces.map((s) => s.space.name).join("  ·  ")}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      {/* ─── 큐레이션 공간 ─────────────────────────────── */}
      {spaces.length > 0 && (
        <>
          <section className="px-6 pt-8 pb-10 space-y-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>큐레이션 공간</p>
              <Link href="/discover?district=서촌" className="text-xs transition-opacity hover:opacity-60" style={{ color: "var(--dim)" }}>
                탐험하기 →
              </Link>
            </div>

            <div className="space-y-0">
              {spaces.map((space, i) => (
                <Link
                  key={space.slug}
                  href={`/space/${space.slug}`}
                  className="flex items-start gap-4 py-5 group transition-opacity hover:opacity-70"
                  style={{ borderBottom: i < spaces.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  {/* 썸네일 */}
                  <div
                    className="flex-shrink-0 overflow-hidden"
                    style={{ width: 56, height: 56, background: "var(--tag-bg)" }}
                  >
                    {space.imageUrl && (
                      <Image
                        src={space.imageUrl}
                        alt={space.name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      {space.district && (
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--border)" }}>{space.district}</span>
                      )}
                      <p className="text-sm font-semibold truncate">{space.name}</p>
                    </div>
                    {space.tagline && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--dim)" }}>
                        {space.tagline}
                      </p>
                    )}
                    <p className="text-xs pt-1" style={{ color: "var(--border)" }}>
                      {space.type === "CAFE" ? "카페" :
                       space.type === "BOOKSTORE" ? "서점" :
                       space.type === "GALLERY" ? "갤러리" :
                       space.type === "SHOP" ? "소품샵" :
                       space.type === "BAR" ? "바" : space.type}
                    </p>
                  </div>

                  <span className="text-xs flex-shrink-0 pt-1" style={{ color: "var(--border)" }}>→</span>
                </Link>
              ))}
            </div>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      {/* ─── 경험 밀도 에디토리얼 ─────────────────────── */}
      <section className="px-6 pt-10 pb-10 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브의 방식</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "01", title: "방문 + 기록", body: "QR 스캔 이후 짧은 감정 태그와 노트를 남깁니다. 기록은 강요되지 않습니다." },
            { n: "02", title: "취향 축적", body: "기록이 쌓이면 태그 빈도가 취향 프로필을 형성합니다. 설명보다 경험으로 드러납니다." },
            { n: "03", title: "공간 연결", body: "취향 벡터 기반으로 비슷한 결의 공간이 연결됩니다. 태그 일치도 60% + 위치 40%." },
          ].map(({ n, title, body }) => (
            <div key={n} className="space-y-3 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--border)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs leading-loose" style={{ color: "var(--dim)" }}>{body}</p>
            </div>
          ))}
        </div>
        <Link href="/connect" className="text-xs transition-opacity hover:opacity-60" style={{ color: "var(--dim)" }}>
          연결 구조 자세히 →
        </Link>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ─── 지역 탐험 ────────────────────────────────── */}
      <section className="px-6 pt-8 pb-10 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>
          {lang === "ko" ? "어디로 갈까" : lang === "ja" ? "どこへ行く" : lang === "zh" ? "去哪里" : "Where to"}
        </p>
        <DiscoverEntry lang={lang} />
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="px-6 pt-8 pb-2 space-y-4">
        {session ? (
          <div className="space-y-3">
            <Link
              href="/archive"
              className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
              style={{ borderColor: "var(--fg)" }}
            >
              {archiveLabel}
            </Link>
            <p className="text-xs text-center" style={{ color: "var(--dim)" }}>
              {lang === "ko" ? "공간 안의 큐브를 스캔해서 시작해봐." :
               lang === "ja" ? "空間内のキューブをスキャンして始めよう。" :
               lang === "zh" ? "扫描空间内的方块开始体验。" :
               "Scan the cube inside a space to begin."}
            </p>
            {admin && (
              <Link href="/owner" className="block text-xs text-center py-2" style={{ color: "var(--dim)" }}>
                {lang === "ko" ? "관리자" : lang === "ja" ? "管理者" : lang === "zh" ? "管理员" : "Admin"}
              </Link>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {startLabel}
          </Link>
        )}
      </section>
    </main>
  );
}
