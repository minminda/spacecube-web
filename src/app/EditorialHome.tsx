import Link from "next/link";
import SiteFooter from "@/components/editorial/SiteFooter";
import LatestSlider from "@/components/editorial/LatestSlider";
import StoryCard from "@/components/editorial/StoryCard";
import CurationCard from "@/components/editorial/CurationCard";
import Shelf from "@/components/home/Shelf";
import HomeSpaceCard from "@/components/home/HomeSpaceCard";
import RegionPicker from "@/components/home/RegionPicker";
import RegionStar from "@/components/home/RegionStar";
import SimilarPeopleShelf from "@/components/home/SimilarPeopleShelf";
import { SearchIcon, StarIcon } from "@/components/icons";
import { getHomeData, type HomeSpaceShelf } from "@/lib/home/homeData";
import { homeHref } from "@/lib/home/shelves";
import QrScanSheet from "./QrScanSheet";

/* ── HOME — 공간 발견 허브 ─────────────────────────────────────────────────
   어디를 갈지 발견하는 순간부터 → 실제 방문 → 기록 → 다음 발견까지 한 흐름의 시작점.
   넷플릭스처럼 Hero(LATEST) 아래로 여러 "선반"을 이어 보여준다(외형이 아니라 탐색 구조만 가져온다 — 조용한 흑백 · 여백 · 사진 중심 유지).
     LATEST(Hero) → 지역 선택 · 검색 입구 → 엄선한 공간(로그인 + 취향 데이터면 회원님을 위해) → 찜한 공간
     → 새로 소개 · 지역 선반 → CURATION → 테마 선반(사이에 STORY) → 다시 떠올려볼 공간 → 함께한 공간 → Experience
   - 공간 하나가 여러 선반(지역 · 유형 · 테마 · 추천)에 동시에 나올 수 있다.
   - 지역을 고르면(/?area=후암) 선반이 그 지역 중심으로 바뀐다. 공간이 부족한 선반은 만들지 않는다.
   - 별점 · 순위 · 퍼센트는 없다. 카드에는 "왜 이 공간인가" 한 줄(큐레이션 선정 이유 · 추천 이유 · 한 줄 소개).
   - 최상위는 HOME · 검색 · 내 공간. HOME은 공간큐브가 나에게 골라 보여주는 곳(추천은 별도 페이지가 아니라 선반의 순서 · 이유로 녹아 있다),
     검색은 내가 직접 찾는 곳, 내 공간은 저장 · 방문 · 기록이 쌓이는 곳.
   - 관심 지역(별표) → "관심 지역에서 발견한 공간" 선반이 일반 지역 선반보다 먼저. 취향이 비슷한 사람이 고른 공간 → "나와 비슷한 사람들이 좋아한 공간".
   - 임시 공간(src/lib/home/fixtures.ts)은 관리자 · 로컬의 /?preview=fixtures에서만 섞인다. ── */

interface Props {
  admin: boolean;
  previewDrafts: boolean;
  /** UI 확인용 임시 공간을 섞어 보는가(관리자 · 로컬 전용) */
  fixtures: boolean;
  userId: string | null;
  area: string | null;
  /** 별표한 관심 지역(최근 순) */
  savedRegions: string[];
}

function SpaceShelf({ shelf, savedIds, loggedIn, id }: { shelf: HomeSpaceShelf; savedIds: Set<string>; loggedIn: boolean; id?: string }) {
  return (
    <Shelf id={id} title={shelf.title} description={shelf.description} href={shelf.href} cta={shelf.cta} kind="space">
      {shelf.cards.map(({ space, reason }) => (
        <li key={space.id}>
          <HomeSpaceCard space={space} reason={reason} save={space.fixture ? undefined : { saved: savedIds.has(space.id), loggedIn }} />
        </li>
      ))}
    </Shelf>
  );
}

export default async function EditorialHome({ admin, previewDrafts, fixtures, userId, area, savedRegions }: Props) {
  const d = await getHomeData({ userId, admin, previewDrafts, fixtures, area, savedRegions });
  const preview = fixtures ? "fixtures" : previewDrafts ? "drafts" : null;
  const shelf = (s: HomeSpaceShelf, id?: string) => <SpaceShelf key={s.key} id={id ?? s.key} shelf={s} savedIds={d.savedIds} loggedIn={d.loggedIn} />;
  const lead = d.spaceShelves.filter((s) => !s.key.startsWith("theme-"));
  const themed = d.spaceShelves.filter((s) => s.key.startsWith("theme-"));
  // 운영자가 정한 제목(지역 화면에서는 규칙이 만든 제목을 그대로 쓴다)
  const titleOf = new Map(d.plan.filter((p) => p.titleOverride).map((p) => [p.key, p.titleOverride as string]));
  const retitle = (s: HomeSpaceShelf, key: string): HomeSpaceShelf => (!d.area && titleOf.has(key) ? { ...s, title: titleOf.get(key) as string } : s);
  const named = (key: string, fallback: string) => (!d.area && titleOf.get(key)) || fallback;

  const curationShelf = d.curations.length > 0 ? (
    <Shelf key="curation" id="curation" title={d.area ? `${d.area}의 CURATION` : named("curation", "최근 올라온 CURATION")} href={d.area ? `/curation?area=${encodeURIComponent(d.area)}` : "/curation"} cta="큐레이션" kind="curation">
      {d.curations.map((c) => (
        <li key={c.id}><CurationCard c={c} ratio="4 / 3" sizes="(min-width: 1024px) 440px, 64vw" showArea={!d.area} /></li>
      ))}
    </Shelf>
  ) : !d.area ? (
    <EmptySection key="curation" title="CURATION" text="첫 번째 큐레이션을 준비하고 있어요." />
  ) : null;

  const storyShelf = d.stories.length > 0 ? (
    <Shelf key="story" id="story" title={named("story", "새로운 STORY")} href="/story" cta="스토리" kind="story">
      {d.stories.map((s) => (
        <li key={s.key}><StoryCard href={s.href} image={s.cover} eyebrow={s.eyebrow} title={s.title} line={s.summary} ratio="4 / 5" sizes="(min-width: 1024px) 340px, 44vw" /></li>
      ))}
    </Shelf>
  ) : !d.area ? (
    <EmptySection key="story" title="STORY" text="첫 번째 이야기를 준비하고 있어요." />
  ) : null;

  // 선반 종류별 내용 — 노출 · 순서는 d.plan(운영자 설정)이 정한다. 값이 null이면 그 선반은 이번에 만들 내용이 없는 것.
  const sh = (x: HomeSpaceShelf | null, key: string) => (x ? shelf(retitle(x, key), key) : null);
  const blocks: Record<string, React.ReactNode> = {
    "for-you": sh(d.forYou, "for-you"),
    interest: sh(d.interest, "interest"),
    similar: sh(d.similar, "similar"),
    // 계정 데이터가 필요한 선반 — 비로그인은 한 줄 안내로 대신한다
    saved: d.saved ? sh(d.saved, "saved") : !d.loggedIn && (
      <section key="saved-login" className="ed-wide py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-5 py-5 md:px-7" style={{ background: "var(--ed-soft)" }}>
          <p className="text-sm md:text-[15px] leading-relaxed break-keep md:mr-auto">
            가보고 싶은 공간을 담아 두면, 여기서 다시 꺼내 보고 취향에 맞는 공간을 더 골라 드려요.
          </p>
          <Link href={`/login?callbackUrl=${encodeURIComponent(homeHref({ area: d.area }))}`} className="ed-btn ed-btn-sm ed-btn-primary self-start md:self-auto">로그인</Link>
        </div>
      </section>
    ),
    new: lead.filter((s) => s.key === "new").map((s) => sh(s, "new")),
    area: lead.filter((s) => s.key !== "new").map((s) => shelf(s)),
    curation: curationShelf,
    theme: themed.map((s) => shelf(s)),
    story: storyShelf,
    revisit: sh(d.revisit, "revisit"),
    cube: sh(d.cubeSpaces, "cube"),
    // 사람 자체를 보여주는 줄은 공간 발견보다 뒤
    "similar-people": d.similarPeople.length >= 2 ? <SimilarPeopleShelf key="similar-people" people={d.similarPeople} /> : null,
    // 운영자가 만든 편집 선반 — 지역 화면에서는 지역과 무관하므로 내보내지 않는다
    ...(d.area ? {} : Object.fromEntries(Object.entries(d.editorialShelves).map(([k, v]) => [k, shelf(v, k)]))),
  };

  return (
    <div className="editorial-bleed">
      {(previewDrafts || fixtures) && (
        <div className="sticky top-[var(--nav-h)] z-40" style={{ background: "#fff6e6", borderBottom: "1px solid #f0dcb0" }}>
          <p className="ed-wide py-2.5 text-xs" style={{ color: "#8a5a00" }}>
            <strong className="font-semibold">미리보기 · {fixtures ? "임시 공간 포함" : "초안 포함"}</strong>
            <span className="ml-2">{fixtures ? "‘임시 ·’로 시작하는 카드는 UI 확인용입니다. 일반 방문자에게는 보이지 않아요." : "초안 콘텐츠가 함께 표시됩니다. 일반 방문자에게는 발행된 콘텐츠만 보여요."}</span>
            <Link href={homeHref({ area: d.area })} className="ml-3 underline underline-offset-4">발행본만 보기</Link>
          </p>
        </div>
      )}
      <main className="pb-6">
        {/* ── LATEST(Hero) ── */}
        {d.latest.length > 0 ? (
          <LatestSlider items={d.latest} allHref="/latest" containerClassName="ed-wide" />
        ) : (
          <section className="ed-wide pt-8 pb-6">
            <h2 className="ed-section-title pb-3" style={{ borderBottom: "1px solid var(--ed-fg)" }}>LATEST</h2>
            <p className="pt-6 text-base" style={{ color: "var(--ed-dim)" }}>첫 번째 이야기를 준비하고 있어요.</p>
          </section>
        )}

        {/* ── 지역 입구 — "오늘 어느 지역의 공간을 볼까?" (테마 바로가기는 검색에서) ── */}
        <section id="discover" className="scroll-mt-[calc(var(--nav-h)+8px)]" style={{ borderTop: "1px solid var(--ed-line)" }}>
          <div className="ed-wide pt-6 pb-2 md:pt-9">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <h2 className="text-lg md:text-[28px] font-bold tracking-[-0.03em] break-keep mr-auto inline-flex items-center gap-1">
                {d.area ? <>{d.area}의 공간</> : <>오늘은 어떤 공간을 발견해 볼까요?</>}
                {/* 지역 화면에서 바로 관심 지역으로 저장 · 해제 */}
                {d.area && <RegionStar area={d.area} initialSaved={d.savedRegions.includes(d.area)} loggedIn={d.loggedIn} refresh />}
              </h2>
              <RegionPicker options={d.areaOptions} current={d.area} preview={preview} savedRegions={d.savedRegions} loggedIn={d.loggedIn} />
            </div>
            {/* 검색 입구 — 직접 찾고 싶을 때(HOME은 골라 보여주는 곳, 검색은 직접 찾는 곳) */}
            <Link
              href="/search"
              className="mt-4 flex items-center gap-3 h-12 px-4 max-w-[560px] border text-sm transition-colors hover:bg-[var(--ed-soft)]"
              style={{ borderColor: "var(--ed-line)", color: "var(--ed-dim)" }}
            >
              <SearchIcon className="w-[18px] h-[18px] shrink-0" />
              지역, 공간, 취향을 검색해보세요
            </Link>
            {d.area && d.areaCounts && !d.areaEmpty && (
              <p className="pt-2 text-xs md:text-sm" style={{ color: "var(--ed-dim)" }}>
                공간 {d.areaCounts.spaces}곳{d.areaCounts.curations > 0 ? ` · 큐레이션 ${d.areaCounts.curations}편` : ""}
                <Link href={homeHref({ preview })} scroll={false} className="ml-3 font-semibold underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>전체 지역 보기</Link>
              </p>
            )}
            {!d.area && d.savedRegions.length > 0 && (
              <nav aria-label="관심 지역" className="-mx-5 md:mx-0 px-5 md:px-0 pt-4 flex gap-2 overflow-x-auto ed-scroll-x">
                {d.savedRegions.map((a) => (
                  <Link key={a} href={homeHref({ area: a, preview })} scroll={false} className="shrink-0 inline-flex items-center gap-1.5 h-9 pl-3 pr-3.5 text-[13px] font-semibold border transition-colors hover:bg-[var(--ed-soft)]" style={{ borderColor: "var(--ed-fg)" }}>
                    <StarIcon filled className="w-3.5 h-3.5" strokeWidth={1.6} />
                    {a}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </section>

        {d.areaEmpty && (
          <section className="ed-wide py-8">
            <p className="text-base font-semibold">아직 {d.area}에서 소개한 공간이 없어요.</p>
            <p className="pt-1 text-sm" style={{ color: "var(--ed-dim)" }}>곧 이 지역의 공간도 고르고 있을게요. 다른 지역을 둘러보세요.</p>
            <Link href={homeHref({ preview })} scroll={false} className="ed-btn ed-btn-sm mt-5">전체 지역 보기</Link>
          </section>
        )}

        {d.plan.filter((p) => p.visible).map((p) => blocks[p.key] ?? null)}

        {/* ── GONGGANCUBE EXPERIENCE — 발견 → 저장 → 방문 → Cube → 기록 ── */}
        <section className="mt-8" style={{ background: "var(--ed-soft)" }}>
          <div className="ed-wide py-8 md:py-12 grid gap-6 md:grid-cols-12 md:gap-12 md:items-center">
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-2">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Gonggancube Experience</p>
                <h2 className="text-xl md:text-[32px] font-bold leading-[1.3] tracking-[-0.03em] break-keep">
                  좋은 공간을 발견했다면,
                  <br />
                  언젠가 직접 만나보세요.
                </h2>
              </div>
              <ol className="grid grid-cols-5" style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {["DISCOVER", "SAVE", "VISIT", "CUBE", "RECORD"].map((en, i) => (
                  <li key={en} className="pt-3 pr-1 space-y-0.5">
                    <span className="block tabular-nums text-[10px]" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="block text-[10px] md:text-xs font-bold tracking-[0.02em]">{en}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="md:col-span-5 flex flex-col gap-3 md:items-end">
              <div className="w-full max-w-sm space-y-3">
                <QrScanSheet />
                <Link href="/about" className="tap-target flex items-center justify-center w-full text-sm font-semibold border transition-colors hover:bg-[var(--ed-bg)]" style={{ borderColor: "var(--ed-fg)" }}>
                  공간큐브 소개 →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter admin={admin} />
    </div>
  );
}

function EmptySection({ title, text }: { title: string; text: string }) {
  return (
    <section className="py-7 md:py-10">
      <div className="ed-wide">
        <h2 className="text-[17px] md:text-2xl font-bold tracking-[-0.02em]">{title}</h2>
        <p className="pt-3 text-sm" style={{ color: "var(--ed-dim)" }}>{text}</p>
      </div>
    </section>
  );
}
