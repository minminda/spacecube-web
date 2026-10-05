/**
 * 데이터 감사(읽기 전용) — 어떤 쓰기 쿼리도 실행하지 않는다(findMany · count · groupBy만).
 *   npx tsx --env-file=.env scripts/audit-data.ts            요약 + 의심 목록
 *   npx tsx --env-file=.env scripts/audit-data.ts --json     JSON으로 출력(다른 도구에서 비교용)
 * 개인정보: 이메일은 마스킹해서만 출력한다.
 * 각 항목: [OK] 문제 없음 · [WARN] 확인 필요(정책상 허용일 수 있음) · [ISSUE] 정책 위반 가능성 높음.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { normalizeArea } from "../src/lib/editorial/area";

const prisma = new PrismaClient();
const asJson = process.argv.includes("--json");
type Level = "OK" | "WARN" | "ISSUE";
const findings: { section: string; level: Level; title: string; count: number; samples: unknown[] }[] = [];
let section = "";

function report(level: Level, title: string, rows: unknown[] | number, sampleLimit = 8) {
  const count = typeof rows === "number" ? rows : rows.length;
  const lvl: Level = count === 0 && level !== "OK" ? "OK" : level;
  const samples = typeof rows === "number" ? [] : rows.slice(0, sampleLimit);
  findings.push({ section, level: lvl, title, count, samples });
}
const info = (title: string, value: unknown) => findings.push({ section, level: "OK", title, count: typeof value === "number" ? value : 0, samples: typeof value === "number" ? [] : [value] });
const maskEmail = (e: string | null) => (e ? e.replace(/^(.{2}).*(@.*)$/, "$1***$2") : null);

const TEST_RE = /(\btest|fixture|dummy|\bdemo|\btemp\b|\btmp\b|sample|테스트|더미|임시|\bqa\b|^zz|zz-|example\.test|lorem)/i;
const PLACEHOLDER_RE = /(TODO|lorem ipsum|입력해주세요|\bundefined\b|\[object Object\]|\bnull\b|placeholder|example\.com)/i;
const URL_OK = (u: string) => /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(u);
const BAD_URL = (u: string | null | undefined) => {
  if (u == null) return null;
  if (u.trim() === "") return "빈 문자열";
  if (/^(javascript|data|blob|file|vbscript):/i.test(u)) return "위험/임시 scheme";
  if (/localhost|127\.0\.0\.1|\.test\b|\.local\b/i.test(u)) return "로컬/테스트 호스트";
  if (/^http:\/\//i.test(u)) return "http(비보안)";
  if (!URL_OK(u)) return "형식 오류";
  return null;
};
const normName = (s: string) => s.toLowerCase().replace(/[\s·・.,'"()\-_/]/g, "").replace(/(연남동?|망원동?|서촌|성수동?|합정|상수|용인|처인구|점)$/g, "");

async function main() {
  // ── 0. 테이블 규모 ──
  section = "0. 테이블";
  const models = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const sizes: Record<string, number> = {};
  for (const m of models) {
    const key = m.charAt(0).toLowerCase() + m.slice(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sizes[m] = await (prisma as any)[key].count();
  }
  info(`테이블 ${models.length}개 행 수`, sizes);

  // ── 1. 사용자 ──
  section = "1. 사용자";
  const users = await prisma.user.findMany({
    select: { id: true, email: true, nickname: true, name: true, isDemo: true, profilePublic: true, profileHandle: true, createdAt: true, _count: { select: { accounts: true, sessions: true } } },
  });
  info("사용자 수", users.length);
  report("ISSUE", "테스트처럼 보이는 일반 사용자(isDemo 아님 — 픽스처 잔존 의심)", users.filter((u) => !u.isDemo && [u.email, u.nickname, u.name, u.profileHandle].some((v) => v && TEST_RE.test(v))).map((u) => ({ id: u.id, email: maskEmail(u.email), nickname: u.nickname, handle: u.profileHandle, isDemo: u.isDemo })), 20);
  info("isDemo 사용자(이메일 앞부분 형태별)", Object.entries(users.filter((u) => u.isDemo).reduce((a: Record<string, number>, u) => { const k = (u.email ?? "(없음)").replace(/\d+/g, "#").replace(/\+[^@]*/, "+…"); a[k] = (a[k] ?? 0) + 1; return a; }, {})));
  report("ISSUE", "공개 프로필인데 핸들 없음", users.filter((u) => u.profilePublic && !u.profileHandle).map((u) => u.id));
  report("WARN", "공개 프로필인 isDemo 사용자(사람 찾기에서 제외돼야 함)", users.filter((u) => u.isDemo && u.profilePublic).map((u) => u.profileHandle));
  report("ISSUE", "로그인 계정(Account) 없는 일반 사용자(고아)", users.filter((u) => u._count.accounts === 0 && !u.isDemo).map((u) => ({ id: u.id, email: maskEmail(u.email), nickname: u.nickname, isDemo: u.isDemo })), 20);

  // ── 2. 공간 콘텐츠(EditorialSpace = canonical) ──
  section = "2. 공간(EditorialSpace)";
  const es = await prisma.editorialSpace.findMany({ select: { id: true, slug: true, name: true, area: true, category: true, tags: true, coverImage: true, images: true, address: true, mapUrl: true, instagram: true, website: true, status: true, isDemo: true, publishedAt: true, cubeAvailable: true } });
  const pub = es.filter((s) => s.status === "PUBLISHED");
  info("전체 / 발행 / 초안 / 보관 / isDemo", { total: es.length, published: pub.length, draft: es.filter((s) => s.status === "DRAFT").length, archived: es.filter((s) => s.status === "ARCHIVED").length, demo: es.filter((s) => s.isDemo).length, publishedNonDemo: pub.filter((s) => !s.isDemo).length });
  info("대표 이미지 — 발행·비데모 기준", { total: pub.filter((s) => !s.isDemo).length, withCover: pub.filter((s) => !s.isDemo && s.coverImage).length, without: pub.filter((s) => !s.isDemo && !s.coverImage).map((s) => s.name) });
  info("대표 이미지 — 발행 전체(데모 포함)", { total: pub.length, withCover: pub.filter((s) => s.coverImage).length });
  report("ISSUE", "이름 비어 있음/공백", es.filter((s) => !s.name.trim()).map((s) => s.slug));
  report("ISSUE", "지역(area) 비어 있음", es.filter((s) => !s.area.trim()).map((s) => s.slug));
  report("WARN", "유형(category) 비어 있음", es.filter((s) => !s.category.trim()).map((s) => s.slug));
  report("WARN", "태그 없음(발행)", pub.filter((s) => s.tags.length === 0).map((s) => s.name));
  report("ISSUE", "발행인데 publishedAt 없음", pub.filter((s) => !s.publishedAt).map((s) => s.slug));
  report("WARN", "테스트처럼 보이는 공간 이름·slug", es.filter((s) => TEST_RE.test(s.name) || TEST_RE.test(s.slug)).map((s) => ({ slug: s.slug, name: s.name, status: s.status, isDemo: s.isDemo })));
  const urlIssues: unknown[] = [];
  for (const s of es) {
    for (const [field, v] of [["coverImage", s.coverImage], ["mapUrl", s.mapUrl], ["instagram", s.instagram], ["website", s.website], ...s.images.map((u, i) => [`images[${i}]`, u] as const)] as const) {
      const bad = BAD_URL(v);
      if (bad) urlIssues.push({ slug: s.slug, field, bad, value: String(v).slice(0, 80) });
    }
  }
  report("WARN", "URL 형식 이상(빈 값·http·로컬·위험 scheme·형식 오류)", urlIssues, 20);

  // 지역 정규화
  const areaRaw = new Map<string, number>();
  for (const s of es) areaRaw.set(s.area, (areaRaw.get(s.area) ?? 0) + 1);
  const areaRows = [...areaRaw.entries()].map(([raw, n]) => ({ raw, normalized: normalizeArea(raw), n }));
  info("지역 원본값 → 정규화", areaRows);
  const byNorm = new Map<string, string[]>();
  for (const r of areaRows) if (r.normalized) byNorm.set(r.normalized, [...(byNorm.get(r.normalized) ?? []), r.raw]);
  report("WARN", "같은 지역이 여러 표기로 저장됨(정규화로 합쳐지지만 원본 정리 권장)", [...byNorm.entries()].filter(([, raws]) => raws.length > 1).map(([n, raws]) => ({ normalized: n, raws })));

  // 중복 후보
  const dupe = (key: (s: (typeof es)[number]) => string | null, label: string) => {
    const m = new Map<string, typeof es>();
    for (const s of es) { const k = key(s); if (k) m.set(k, [...(m.get(k) ?? []), s]); }
    report("WARN", `중복 후보 — ${label}`, [...m.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ key: k, spaces: v.map((s) => `${s.name}(${s.slug}, ${s.status}${s.isDemo ? ", demo" : ""})`) })), 20);
  };
  dupe((s) => normName(s.name) || null, "정규화 이름");
  dupe((s) => (s.address ? s.address.replace(/\s+/g, "") : null), "주소");
  dupe((s) => (s.mapUrl ? s.mapUrl.replace(/\/+$/, "").toLowerCase() : null), "지도 URL");
  dupe((s) => (s.instagram ? s.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/@?].*$/, "").toLowerCase() : null), "Instagram");
  const coverUse = new Map<string, string[]>();
  for (const s of es) if (s.coverImage) coverUse.set(s.coverImage, [...(coverUse.get(s.coverImage) ?? []), s.slug]);
  report("WARN", "같은 대표 사진을 여러 공간이 사용", [...coverUse.entries()].filter(([, v]) => v.length > 1).map(([u, v]) => ({ url: u.slice(-60), spaces: v })));

  // ── 3. 운영 공간(Space · Cube 현장) ──
  section = "3. 운영 공간(Space)";
  const ops = await prisma.space.findMany({ select: { id: true, slug: true, name: true, district: true, isActive: true, isDemo: true, imageUrl: true, ownerId: true, _count: { select: { episodes: true } }, cube: { select: { code: true, status: true } } } });
  info("운영 공간 수 / 활성 / 데모", { total: ops.length, active: ops.filter((s) => s.isActive).length, demo: ops.filter((s) => s.isDemo).length });
  report("WARN", "테스트처럼 보이는 운영 공간", ops.filter((s) => (TEST_RE.test(s.name) || TEST_RE.test(s.slug)) ).map((s) => ({ slug: s.slug, name: s.name, isDemo: s.isDemo, active: s.isActive })));
  report("WARN", "이상한 slug·이름(기호만·앞뒤 공백·끝 밑줄·대문자)", ops.filter((s) => !/[a-z0-9]/i.test(s.slug) || s.name !== s.name.trim() || /[_-]$/.test(s.slug) || /[A-Z]/.test(s.slug)).map((s) => ({ slug: s.slug, name: JSON.stringify(s.name), isDemo: s.isDemo, active: s.isActive })));
  const districts = await prisma.district.findMany({ select: { name: true, status: true } });
  const dNames = new Set(districts.map((d) => d.name));
  report("WARN", "District 테이블에 없는 district 값(지도·카운트 누락)", ops.filter((s) => s.district && !dNames.has(s.district)).map((s) => ({ slug: s.slug, district: s.district })));
  report("WARN", "활성 운영 공간인데 에피소드 0", ops.filter((s) => s.isActive && s._count.episodes === 0).map((s) => s.slug));
  const cubes = await prisma.cube.findMany({ select: { code: true, status: true, spaceId: true } });
  info("큐브 상태", Object.fromEntries(["UNASSIGNED", "ASSIGNED", "DISABLED"].map((st) => [st, cubes.filter((c) => c.status === st).length])));
  report("ISSUE", "ASSIGNED인데 spaceId 없음", cubes.filter((c) => c.status === "ASSIGNED" && !c.spaceId).map((c) => c.code));
  report("ISSUE", "spaceId 있는데 ASSIGNED 아님", cubes.filter((c) => c.status !== "ASSIGNED" && c.spaceId).map((c) => c.code));
  const eps = await prisma.episode.findMany({ select: { id: true, spaceId: true, episodeNumber: true, unlockVisitCount: true, published: true, isFeatured: true, _count: { select: { scenes: true } } } });
  report("WARN", "EP.1 잠금 방문수 ≠ 0", eps.filter((e) => e.episodeNumber === 1 && e.unlockVisitCount !== 0).map((e) => ({ spaceId: e.spaceId, unlock: e.unlockVisitCount })));
  report("WARN", "EP.2 잠금 방문수 ≠ 2", eps.filter((e) => e.episodeNumber === 2 && e.unlockVisitCount !== 2).map((e) => ({ spaceId: e.spaceId, unlock: e.unlockVisitCount })));
  report("WARN", "발행 에피소드인데 Scene 0", eps.filter((e) => e.published && e._count.scenes === 0).map((e) => ({ spaceId: e.spaceId, ep: e.episodeNumber })));
  const featured = new Map<string, number>();
  for (const e of eps) if (e.isFeatured) featured.set(e.spaceId, (featured.get(e.spaceId) ?? 0) + 1);
  report("ISSUE", "대표 에피소드가 2개 이상인 공간", [...featured.entries()].filter(([, n]) => n > 1));

  // ── 4. STORY · CURATION ──
  section = "4. STORY · CURATION";
  const [people, thoughts, curations] = await Promise.all([
    prisma.editorialPerson.findMany({ select: { id: true, slug: true, number: true, title: true, subject: true, summary: true, coverImage: true, blocks: true, status: true, stage: true, publishedAt: true, scheduledAt: true, assignee: true, spaces: { select: { order: true, note: true, space: { select: { slug: true, status: true, isDemo: true } } } } } }),
    prisma.editorialThought.findMany({ select: { id: true, slug: true, number: true, title: true, scene: true, summary: true, coverImage: true, blocks: true, status: true, stage: true, publishedAt: true, scheduledAt: true, assignee: true, spaces: { select: { order: true, note: true, space: { select: { slug: true, status: true, isDemo: true } } } } } }),
    prisma.editorialCuration.findMany({ select: { id: true, slug: true, number: true, title: true, area: true, perspective: true, summary: true, coverImage: true, blocks: true, status: true, stage: true, publishedAt: true, scheduledAt: true, assignee: true, spaces: { select: { order: true, note: true, space: { select: { slug: true, status: true, isDemo: true, area: true } } } } } }),
  ]);
  const all = [
    ...people.map((x) => ({ ...x, kind: "PEOPLE" })),
    ...thoughts.map((x) => ({ ...x, kind: "THOUGHT" })),
    ...curations.map((x) => ({ ...x, kind: "CURATION" })),
  ];
  info("개수(PEOPLE / THOUGHT / CURATION, 발행)", { people: [people.length, people.filter((x) => x.status === "PUBLISHED").length], thoughts: [thoughts.length, thoughts.filter((x) => x.status === "PUBLISHED").length], curations: [curations.length, curations.filter((x) => x.status === "PUBLISHED").length] });
  const tag = (x: (typeof all)[number]) => `${x.kind} ${x.number} ${x.slug}`;
  report("ISSUE", "제목 비어 있음", all.filter((x) => !x.title.trim()).map(tag));
  report("ISSUE", "발행인데 publishedAt 없음", all.filter((x) => x.status === "PUBLISHED" && !x.publishedAt).map(tag));
  report("WARN", "비발행인데 publishedAt 있음(발행 취소 이력 — 공개 아님)", all.filter((x) => x.status !== "PUBLISHED" && x.publishedAt).map((x) => `${tag(x)} ${x.status}`));
  report("ISSUE", "발행인데 대표 이미지 없음", all.filter((x) => x.status === "PUBLISHED" && !x.coverImage).map(tag));
  report("ISSUE", "발행인데 요약 없음", all.filter((x) => x.status === "PUBLISHED" && !x.summary.trim()).map(tag));
  report("WARN", "발행인데 본문 블록 0", all.filter((x) => x.status === "PUBLISHED" && (!Array.isArray(x.blocks) || x.blocks.length === 0)).map(tag));
  report("WARN", "stage와 status 불일치(파이프라인 도입 전 데이터 — 화면은 effectiveStage로 보정됨)", all.filter((x) => (x.stage === "PUBLISHED") !== (x.status === "PUBLISHED")).map((x) => `${tag(x)} stage=${x.stage} status=${x.status}`));
  report("ISSUE", "예약(SCHEDULED)인데 scheduledAt 없음", all.filter((x) => x.stage === "SCHEDULED" && !x.scheduledAt).map(tag));
  report("WARN", "예약일이 지났는데 아직 예약 상태(자동 발행 없음)", all.filter((x) => x.stage === "SCHEDULED" && x.status !== "PUBLISHED" && x.scheduledAt && x.scheduledAt < new Date()).map(tag));
  report("WARN", "scheduledAt이 있지만 예약 단계 아님(예정일 메모로 허용)", all.filter((x) => x.scheduledAt && x.stage !== "SCHEDULED" && x.status !== "PUBLISHED").map((x) => `${tag(x)} ${x.stage}`));
  report("WARN", "테스트·placeholder처럼 보이는 제목/요약/본문", all.filter((x) => TEST_RE.test(x.title) || PLACEHOLDER_RE.test(x.title) || PLACEHOLDER_RE.test(x.summary) || PLACEHOLDER_RE.test(JSON.stringify(x.blocks))).map((x) => `${tag(x)} ${x.status}: ${x.title}`));
  report("WARN", "PEOPLE인데 인물(subject) 없음", people.filter((x) => x.status === "PUBLISHED" && !x.subject?.trim()).map((x) => x.slug));
  for (const kind of ["PEOPLE", "THOUGHT", "CURATION"]) {
    const nums = all.filter((x) => x.kind === kind).map((x) => x.number);
    report("ISSUE", `${kind} 번호 중복`, nums.filter((n, i) => nums.indexOf(n) !== i));
  }
  report("ISSUE", "발행 콘텐츠가 비공개/보관/데모 공간을 연결", all.filter((x) => x.status === "PUBLISHED").flatMap((x) => x.spaces.filter((l) => l.space.status !== "PUBLISHED" || l.space.isDemo).map((l) => `${tag(x)} → ${l.space.slug}(${l.space.status}${l.space.isDemo ? ", demo" : ""})`)));
  report("WARN", "같은 콘텐츠 안 공간 순서(order) 중복", all.filter((x) => new Set(x.spaces.map((l) => l.order)).size !== x.spaces.length).map(tag));
  report("ISSUE", "발행 CURATION인데 공간 0", curations.filter((c) => c.status === "PUBLISHED" && c.spaces.length === 0).map((c) => c.slug));
  report("WARN", "발행 CURATION 공간에 선정 이유 없음", curations.filter((c) => c.status === "PUBLISHED").flatMap((c) => c.spaces.filter((l) => !l.note?.trim()).map((l) => `${c.slug} → ${l.space.slug}`)));
  report("WARN", "CURATION 지역 비어 있음(주제형 허용) 또는 정규화 불가", curations.filter((c) => !normalizeArea(c.area)).map((c) => `${c.slug} area=${c.area}`));
  report("WARN", "CURATION 지역과 다른 지역 공간 포함", curations.flatMap((c) => c.spaces.filter((l) => normalizeArea(c.area) && normalizeArea(l.space.area) !== normalizeArea(c.area)).map((l) => `${c.slug}(${c.area}) → ${l.space.slug}(${l.space.area})`)));
  report("WARN", "CURATION 관점(perspective) 없음", curations.filter((c) => !c.perspective).map((c) => c.slug));
  const allCovers = new Map<string, string[]>();
  for (const x of all) if (x.coverImage) allCovers.set(x.coverImage, [...(allCovers.get(x.coverImage) ?? []), tag(x)]);
  for (const s of es) if (s.coverImage && allCovers.has(s.coverImage)) allCovers.set(s.coverImage, [...allCovers.get(s.coverImage)!, `SPACE ${s.slug}(${s.area})`]);
  report("WARN", "같은 사진을 여러 콘텐츠·공간이 공유(지역 불일치 여부 확인)", [...allCovers.entries()].filter(([, v]) => v.length > 1).map(([u, v]) => ({ url: u.slice(-50), used: v })), 20);
  report("WARN", "콘텐츠 이미지 URL 이상", all.flatMap((x) => { const b = BAD_URL(x.coverImage); return b ? [`${tag(x)} ${b}`] : []; }));
  const blockUrls = all.flatMap((x) => JSON.stringify(x.blocks).match(/"(src|url|href)":"([^"]*)"/g)?.map((m) => ({ x: tag(x), u: m.replace(/^"(src|url|href)":"/, "").replace(/"$/, "") })) ?? []);
  report("ISSUE", "본문 블록 URL 이상(javascript:/data:/localhost 등)", blockUrls.filter((b) => b.u && /^(javascript|data|blob|vbscript):|localhost/i.test(b.u)));
  report("WARN", "본문 블록에 HTML 태그처럼 보이는 텍스트(렌더는 텍스트로만 — 확인용)", all.filter((x) => /<\s*(script|iframe|img|a)\b/i.test(JSON.stringify(x.blocks))).map(tag));
  info("담당자 값", [...new Set(all.map((x) => x.assignee).filter(Boolean))]);

  // ── 5. 아카이브 · 저장 ──
  section = "5. 아카이브 · 저장";
  const entries = await prisma.archiveEntry.findMany({ select: { id: true, userId: true, spaceId: true, placeName: true, placeKey: true, status: true, memo: true, sourceUrl: true, space: { select: { slug: true, status: true, isDemo: true } }, user: { select: { isDemo: true } }, visits: { select: { visitedOn: true } }, photos: { select: { url: true } } } });
  info("아카이브 기록 / 개인 기록(spaceId 없음)", { total: entries.length, personal: entries.filter((e) => !e.spaceId).length });
  report("WARN", "VISITED인데 방문(ArchiveVisit) 0 — 방문 날짜 없이 '다녀왔어요'만 고른 경우", entries.filter((e) => e.status === "VISITED" && e.visits.length === 0).map((e) => e.id));
  report("ISSUE", "SAVED(가보고 싶어요)인데 방문 기록 있음", entries.filter((e) => e.status === "SAVED" && e.visits.length > 0).map((e) => e.id));
  report("ISSUE", "미래 방문 날짜", entries.flatMap((e) => e.visits.filter((v) => v.visitedOn && v.visitedOn > new Date(Date.now() + 86400e3)).map(() => e.id)));
  report("WARN", "빈 문자열 메모(null이어야 함)", entries.filter((e) => e.memo !== null && !e.memo.trim()).map((e) => e.id));
  report("WARN", "비공개·보관 공간을 가리키는 기록", entries.filter((e) => e.space && e.space.status !== "PUBLISHED").map((e) => `${e.id} → ${e.space!.slug}(${e.space!.status})`));
  report("WARN", "일반 사용자의 데모 공간 기록", entries.filter((e) => e.space?.isDemo && !e.user.isDemo).map((e) => `${e.id} → ${e.space!.slug}`));
  const pk = new Map<string, number>();
  for (const e of entries.filter((x) => !x.spaceId)) pk.set(`${e.userId}|${e.placeKey}`, (pk.get(`${e.userId}|${e.placeKey}`) ?? 0) + 1);
  report("WARN", "같은 사용자의 같은 개인 장소(placeKey) 중복", [...pk.entries()].filter(([, n]) => n > 1));
  report("WARN", "개인 기록 이름이 canonical 공간과 같음(나중에 연결 후보)", entries.filter((e) => !e.spaceId && es.some((s) => normName(s.name) === normName(e.placeName))).map((e) => e.placeName));
  report("ISSUE", "사진 URL 이상", entries.flatMap((e) => e.photos.filter((p) => BAD_URL(p.url) || !/res\.cloudinary\.com\/[^/]+\/image\/upload\/.*archive\//.test(p.url)).map((p) => `${e.id} ${p.url.slice(0, 60)}`)));
  report("WARN", "링크(sourceUrl) 이상", entries.filter((e) => e.sourceUrl && BAD_URL(e.sourceUrl)).map((e) => `${e.id} ${BAD_URL(e.sourceUrl)}`));
  const saves = await prisma.savedEditorialSpace.findMany({ select: { userId: true, spaceId: true, space: { select: { slug: true, status: true, isDemo: true } } } });
  info("공간 저장(SavedEditorialSpace)", saves.length);
  report("WARN", "비공개·보관 공간 저장", saves.filter((s) => s.space.status !== "PUBLISHED").map((s) => s.space.slug));
  const entryKey = new Set(entries.filter((e) => e.spaceId).map((e) => `${e.userId}|${e.spaceId}`));
  info("저장 + 아카이브 기록이 같은 공간에 함께 있는 경우(정상: 화면에서 하나로 합침)", saves.filter((s) => entryKey.has(`${s.userId}|${s.spaceId}`)).length);
  const opsSaved = await prisma.savedSpace.count();
  info("구 운영 공간 저장(SavedSpace)", opsSaved);

  // ── 6. 공개 프로필 · 취향 따라가기 ──
  section = "6. 공개 프로필 · 따라가기";
  const follows = await prisma.savedTaste.findMany({ select: { userId: true, targetUserId: true, target: { select: { profilePublic: true, isDemo: true, profileHandle: true } } } });
  info("따라가기 수", follows.length);
  report("ISSUE", "자기 자신 따라가기", follows.filter((f) => f.userId === f.targetUserId).length);
  report("WARN", "비공개/데모/핸들 없는 사용자를 따라가는 관계(목록에서는 숨겨짐)", follows.filter((f) => !f.target.profilePublic || f.target.isDemo || !f.target.profileHandle).map((f) => f.target.profileHandle ?? "(no handle)"));
  const ps = await prisma.profileSpace.findMany({ select: { userId: true, spaceId: true, showMemo: true, showPhotos: true, space: { select: { slug: true, status: true, isDemo: true } } } });
  info("공개 프로필 공간(ProfileSpace)", ps.length);
  report("WARN", "공개 공간이 비공개·데모 공간을 가리킴(조회 단계에서 제외됨)", ps.filter((p) => p.space.status !== "PUBLISHED" || p.space.isDemo).map((p) => p.space.slug));
  const owned = new Set([...entries.filter((e) => e.spaceId).map((e) => `${e.userId}|${e.spaceId}`), ...saves.map((s) => `${s.userId}|${s.spaceId}`)]);
  report("WARN", "아카이브·저장에 없는 공간이 공개 프로필에 남음(저장 해제 후 잔존)", ps.filter((p) => !owned.has(`${p.userId}|${p.spaceId}`)).map((p) => `${p.userId.slice(-6)} → ${p.space.slug}`));

  // ── 7. 방명록 · 계측 ──
  section = "7. 방명록 · KPI 계측";
  const notes = await prisma.guestbookNote.findMany({ select: { id: true, userId: true, anonId: true, spaceId: true, content: true, deletedAt: true, isHidden: true, imageUrl: true, session: { select: { spaceId: true } }, space: { select: { isDemo: true, slug: true } }, user: { select: { isDemo: true } } } });
  info("방명록 글 / 삭제 / 숨김", { total: notes.length, deleted: notes.filter((n) => n.deletedAt).length, hidden: notes.filter((n) => n.isHidden).length });
  report("ISSUE", "userId·anonId 둘 다 없는 글", notes.filter((n) => !n.userId && !n.anonId).map((n) => n.id));
  report("ISSUE", "글의 공간 ≠ 세션의 공간", notes.filter((n) => n.session.spaceId !== n.spaceId).map((n) => n.id));
  report("WARN", "데모 공간·데모 사용자의 글(공개 노출 여부는 공간 정책)", notes.filter((n) => n.space.isDemo || n.user?.isDemo).length);
  report("WARN", "테스트처럼 보이는 글(삭제 안 된 것)", notes.filter((n) => !n.deletedAt && TEST_RE.test(n.content)).map((n) => `${n.space.slug}: ${n.content.slice(0, 30)}`));
  report("WARN", "방명록 이미지 URL 이상", notes.filter((n) => n.imageUrl && BAD_URL(n.imageUrl)).map((n) => n.id));
  const sessions = await prisma.guestbookSession.groupBy({ by: ["spaceId"], where: { status: "ACTIVE" }, _count: true });
  report("WARN", "ACTIVE 방명록 세션이 2개 이상인 공간", sessions.filter((s) => s._count > 1));
  const scans = await prisma.spaceScan.findMany({ select: { scannedAt: true, cubeId: true, spaceId: true, userId: true, anonId: true, cube: { select: { spaceId: true } }, space: { select: { isDemo: true } } } });
  info("QR 스캔 수 / 데모 공간 / 큐브 연결", { total: scans.length, demoSpace: scans.filter((s) => s.space.isDemo).length, withCube: scans.filter((s) => s.cubeId).length });
  report("WARN", "스캔 공간 ≠ 큐브의 현재 공간(큐브 재배정 이력일 수 있음)", scans.filter((s) => s.cube && s.cube.spaceId !== s.spaceId).length);
  report("ISSUE", "미래 시각 스캔", scans.filter((s) => s.scannedAt > new Date(Date.now() + 600e3)).length);
  const reads = await prisma.episodeRead.findMany({ select: { openedAt: true, completedAt: true, durationMs: true, userId: true, anonId: true } });
  report("WARN", "완독 시각 < 시작 시각(7월 이전 생성 시 1ms 시계 차 — 집계 영향 없음)", reads.filter((r) => r.completedAt && r.completedAt < r.openedAt).length);
  report("WARN", "체류시간 음수 또는 6시간 초과", reads.filter((r) => r.durationMs != null && (r.durationMs < 0 || r.durationMs > 6 * 3600e3)).length);
  report("ISSUE", "EpisodeRead userId·anonId 둘 다 없음", reads.filter((r) => !r.userId && !r.anonId).length);
}

main()
  .then(() => {
    if (asJson) {
      console.log(JSON.stringify(findings, null, 2));
      return;
    }
    let cur = "";
    for (const f of findings) {
      if (f.section !== cur) { cur = f.section; console.log(`\n=== ${cur} ===`); }
      const mark = f.level === "OK" ? (f.samples.length && f.count === 0 ? "[INFO]" : "[OK]  ") : f.level === "WARN" ? "[WARN]" : "[ISSUE]";
      console.log(`${mark} ${f.title}${f.count ? ` — ${f.count}` : ""}`);
      for (const s of f.samples) console.log(`        ${typeof s === "string" ? s : JSON.stringify(s)}`);
    }
    const n = (l: Level) => findings.filter((f) => f.level === l && f.count > 0).length;
    console.log(`\n요약: ISSUE ${n("ISSUE")} · WARN ${n("WARN")} · 항목 ${findings.length}`);
  })
  .finally(() => prisma.$disconnect());
