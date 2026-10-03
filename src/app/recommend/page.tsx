import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import SpaceCard from "@/components/editorial/SpaceCard";
import TabLinks from "@/components/editorial/TabLinks";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listSpaces } from "@/lib/editorial/queries";
import { normalizeArea } from "@/lib/editorial/area";
import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { buildTasteProfile, discoveryReason, isEmptyProfile, profileSummary, rankDiscovery } from "@/lib/discoveryRecommend";

export const metadata: Metadata = {
  title: "나에게 맞는 공간 — 공간큐브",
  description: "지금까지 저장하고 경험한 공간을 바탕으로, 다른 지역에서도 나와 잘 맞을 공간을 찾습니다.",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ area?: string }>;
}

const LIMIT = 12;

function Header() {
  return (
    <header className="ed-container pt-12 pb-8 md:pt-20 md:pb-12" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
      <div className="grid gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7 space-y-4">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Recommend</p>
          <h1 className="text-[40px] md:text-[64px] font-bold leading-[1.05] tracking-[-0.04em]">나에게 맞는 공간</h1>
        </div>
        <p className="md:col-span-5 text-base md:text-lg leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
          지금까지 저장하고 경험한 공간을 바탕으로, 당신과 잘 맞을 것 같은 공간을 찾아봤어요.
        </p>
      </div>
    </header>
  );
}

function Empty({ title, body, actions }: { title: string; body: string; actions: { href: string; label: string; primary?: boolean }[] }) {
  return (
    <section className="ed-container py-14 md:py-20 max-w-[720px]">
      <p className="text-xl md:text-2xl font-bold leading-snug break-keep">{title}</p>
      <p className="pt-3 text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>{body}</p>
      <div className="pt-8 flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="tap-target inline-flex items-center px-5 text-sm font-semibold"
            style={a.primary ? { background: "var(--ed-fg)", color: "var(--ed-bg)" } : { border: "1px solid var(--ed-fg)" }}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * 추천 — 아카이브에서 분리된 독립 페이지. 내가 다녀온 기록(Record, 기존 취향 벡터)과 저장한 공간을 바탕으로
 * 발행된 공개 공간 중 아직 가보지도 저장하지도 않은 곳을 고른다. 지역을 바꿔도 취향은 그대로 두고 후보만 바꾼다.
 * 점수는 겹치는 속성(공간 유형·태그)의 가중치 합 — 이유는 실제로 겹친 속성으로만 쓴다. 겹치는 게 없으면 추천하지 않는다.
 * 공간 상세 조회·지도 클릭 같은 약한 신호는 아직 계측하지 않아 쓰지 않는다.
 */
export default async function RecommendPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  // 새 정보 구조 공개 전에는 기존 추천 화면(/archive/taste)이 그대로 추천을 맡는다.
  if (!viewer.editorial) redirect(viewer.loggedIn ? "/archive/taste" : "/");

  const area = normalizeArea(sp.area);

  if (!viewer.userId) {
    return (
      <div className="editorial-bleed">
        <main>
          <Header />
          <Empty
            title="로그인하면 나에게 맞는 공간을 찾아드려요"
            body="저장한 공간과 Cube가 있는 공간에 다녀온 기록을 바탕으로 추천합니다. 그 전에는 지역 큐레이션에서 둘러보세요."
            actions={[
              { href: `/login?callbackUrl=${encodeURIComponent("/recommend")}`, label: "로그인", primary: true },
              { href: "/curation", label: "큐레이션 둘러보기" },
            ]}
          />
        </main>
        <SiteFooter admin={viewer.admin} />
      </div>
    );
  }

  const [context, spaces] = await Promise.all([getUserDiscoveryContext(viewer.userId), listSpaces()]);
  const profile = buildTasteProfile(context.signals);

  if (isEmptyProfile(profile)) {
    return (
      <div className="editorial-bleed">
        <main>
          <Header />
          <Empty
            title="아직 추천의 단서가 없어요"
            body="마음에 드는 공간을 저장하거나, Cube가 있는 공간에 다녀와 기록을 남기면 그 결을 따라 다른 지역의 공간을 찾아드려요."
            actions={[
              { href: "/curation", label: "큐레이션에서 저장하기", primary: true },
              { href: "/cube-spaces", label: "함께한 공간 보기" },
            ]}
          />
        </main>
        <SiteFooter admin={viewer.admin} />
      </div>
    );
  }

  // 이미 다녀왔거나 저장한 공간은 추천하지 않는다(아카이브에서 다시 볼 수 있으므로).
  const exclude = new Set(
    spaces.filter((s) => context.visitedSlugs.has(s.slug) || context.savedEditorialIds.has(s.id) || context.savedSlugs.has(s.slug)).map((s) => s.id),
  );
  const ranked = rankDiscovery(spaces, profile, { exclude });

  // 지역 탭 — 공간이 있는 지역 전부, 괄호 안은 그 지역에서 실제로 추천된 수.
  const countByArea = new Map<string, number>();
  for (const r of ranked) {
    const a = normalizeArea(r.space.area);
    if (a) countByArea.set(a, (countByArea.get(a) ?? 0) + 1);
  }
  const areas = [...new Set(spaces.map((s) => normalizeArea(s.area)).filter((a): a is string => !!a))]
    .sort((a, b) => (countByArea.get(b) ?? 0) - (countByArea.get(a) ?? 0) || a.localeCompare(b, "ko"));
  const tabs = [
    { key: "all", label: `전체${ranked.length ? ` ${ranked.length}` : ""}`, href: "/recommend" },
    ...areas.map((a) => ({ key: a, label: `${a}${countByArea.get(a) ? ` ${countByArea.get(a)}` : ""}`, href: `/recommend?area=${encodeURIComponent(a)}` })),
  ];
  const shown = (area ? ranked.filter((r) => normalizeArea(r.space.area) === area) : ranked).slice(0, LIMIT);
  const summary = profileSummary(profile);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <Header />
        {summary && (
          <p className="ed-container pt-6 text-sm md:text-base leading-relaxed break-keep">{summary}</p>
        )}
        <div className="ed-container pt-8">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>이번에는 어디에서 찾아볼까요</p>
        </div>
        <div className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <TabLinks tabs={tabs} active={area ?? "all"} label="추천 지역" />
        </div>

        {shown.length === 0 ? (
          <Empty
            title={area ? `${area}에서는 아직 결이 겹치는 공간을 찾지 못했어요` : "아직 결이 겹치는 새 공간을 찾지 못했어요"}
            body={area ? "취향은 그대로 두고 다른 지역을 골라보거나, 이 지역의 큐레이션을 둘러보세요. 새 공간이 소개되면 이곳에도 나타나요." : "다녀오고 저장한 공간과 겹치는 속성의 공간이 아직 없어요. 새 공간이 소개되면 이곳에 나타나요."}
            actions={[
              { href: area ? `/curation?area=${encodeURIComponent(area)}` : "/curation", label: area ? `${area} 큐레이션` : "큐레이션 둘러보기", primary: true },
              ...(area ? [{ href: "/recommend", label: "전체 지역 보기" }] : []),
            ]}
          />
        ) : (
          <section className="ed-container pt-10 md:pt-14">
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-10 md:gap-y-16">
              {shown.map((r) => (
                <SpaceCard
                  key={r.space.id}
                  space={r.space}
                  sizes="(min-width: 768px) 33vw, 50vw"
                  showSummary
                  reason={discoveryReason(r.matched) ?? undefined}
                  save={{ saved: false, loggedIn: true }}
                />
              ))}
            </div>
          </section>
        )}

        <p className="ed-container pt-16 text-xs leading-relaxed" style={{ color: "var(--ed-dim)" }}>
          추천은 다녀온 기록(남긴 취향 점수 포함)과 저장한 공간의 공간 유형·태그만으로 계산해요. 이미 다녀왔거나 저장한 공간은 빼고 보여드려요.
          {" "}
          <Link href="/archive" className="underline underline-offset-4">내 아카이브</Link>
        </p>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
