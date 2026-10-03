/**
 * 큐레이터 프로토타입 더미 데이터 — 가상의 큐레이터 4명 · 컬렉션 11개 · 가상 공간 23곳(연남/망원/서촌).
 * 큐레이터는 별도 계정이 아니라 "CuratorProfile을 가진 User"다 — 가상 큐레이터마다 가상 User(isDemo, 이메일
 * proto-curator+<slug>@spacecube.local, 닉네임 없음 — 실제 사용자의 고유 닉네임을 점유하지 않도록)를 만들고 프로필을 붙인다.
 * 가상 User는 isDemo라 KPI·다른 사용자 목록에서 이미 빠진다(src/lib/demoData.ts).
 * 실제 인물·실제 인스타그램 계정을 쓰지 않는다. 이미지는 넣지 않는다(가상 공간에 실제 사진을 붙이면 오해를 낳으므로
 * 화면에는 플레이스홀더가 보인다).
 *
 * 안전 장치
 * - 가상 공간·큐레이터·컬렉션은 전부 isDemo=true. 공개 조회(src/lib/editorial/queries.ts)는 isDemo를 항상 제외하고,
 *   큐레이터 화면도 관리자·로컬 미리보기에서만 가상 데이터를 읽는다(src/lib/curators/access.ts).
 * - 실제 공개 공간(북눅 연남 등)은 컬렉션에 "연결만" 한다 — 그 행은 읽기만 하고 절대 수정하지 않는다.
 * - 같은 slug의 실제(isDemo=false) 공간·큐레이터·컬렉션이 이미 있으면 그 항목은 건드리지 않고 중단한다.
 * - idempotent: 다시 실행하면 가상 행은 갱신되고, 가상 컬렉션의 공간 연결은 지우고 다시 만든다.
 *
 * 실행: npx tsx prisma/seed-curator-prototype.ts   (= npm run db:seed-curator-prototype)
 * 삭제: npx tsx prisma/cleanup-curator-prototype.ts
 */
import { prisma } from "../src/lib/prisma";

type DemoSpace = { slug: string; name: string; area: string; category: string; tags: string[]; summary: string; address: string };

const AREA_ADDRESS: Record<string, string> = {
  연남: "서울 마포구 연남동 (가상 공간)",
  망원: "서울 마포구 망원동 (가상 공간)",
  서촌: "서울 종로구 서촌 (가상 공간)",
};

const S = (slug: string, name: string, area: string, category: string, tags: string[], summary: string): DemoSpace => ({
  slug: `proto-${slug}`, name, area, category, tags, summary, address: AREA_ADDRESS[area],
});

const DEMO_SPACES: DemoSpace[] = [
  // 연남
  S("yeonnam-slow-sentence", "느린 문장", "연남", "북카페", ["조용한", "책", "혼자", "오래 머무는"], "창가 1인석이 많은 작은 북카페"),
  S("yeonnam-alley-coffee", "골목 끝 커피", "연남", "카페", ["조용한", "편안한", "혼자"], "골목 끝, 테이블 네 개짜리 커피집"),
  S("yeonnam-night-listening", "밤의 청음실", "연남", "음악 바", ["음악", "LP", "밤", "조용한"], "대화보다 음악이 먼저인 작은 청음실"),
  S("yeonnam-paper-light", "종이와 빛", "연남", "전시 카페", ["감각적인", "전시", "카페", "둘이"], "종이 작업 전시가 바뀌는 카페"),
  S("yeonnam-three-pm-tea", "오후 세시 다실", "연남", "찻집", ["조용한", "편안한", "오래 머무는", "둘이"], "낮은 좌식 자리가 있는 찻집"),
  S("yeonnam-place-of-objects", "사물의 자리", "연남", "편집숍 카페", ["독특한", "감각적인", "데이트"], "오래된 물건과 커피가 함께 있는 곳"),
  // 망원
  S("mangwon-river-desk", "강변 책상", "망원", "작업 카페", ["조용한", "혼자", "오래 머무는", "카페"], "콘센트 자리가 넉넉한 작업 카페"),
  S("mangwon-record-room", "레코드 룸 2층", "망원", "LP카페", ["음악", "LP", "작은 공간"], "계단을 올라가면 나오는 LP 카페"),
  S("mangwon-one-book", "한 권 서점", "망원", "독립서점", ["책", "조용한", "혼자"], "한 달에 한 권을 깊게 소개하는 서점"),
  S("mangwon-rain-window", "비 오는 창", "망원", "카페", ["편안한", "조용한", "비 오는 날"], "큰 창 앞 긴 테이블이 있는 카페"),
  S("mangwon-studio-next", "작업실 옆 카페", "망원", "카페", ["감각적인", "독특한"], "디자인 작업실이 함께 쓰는 카페"),
  S("mangwon-small-needle", "작은 바늘", "망원", "음악 바", ["음악", "밤", "둘이", "데이트"], "턴테이블 두 대가 있는 작은 바"),
  S("mangwon-clay-coffee", "흙과 커피", "망원", "공방 카페", ["독특한", "감각적인", "둘이"], "도자 공방 한쪽의 커피 자리"),
  S("mangwon-slow-lunch", "느린 점심", "망원", "카페", ["편안한", "오래 머무는"], "점심 이후가 길어지는 동네 카페"),
  // 서촌
  S("seochon-hanok-shelves", "한옥 서가", "서촌", "북카페", ["책", "조용한", "오래 머무는", "혼자"], "한옥 대청에 서가를 둔 북카페"),
  S("seochon-alley-gallery", "골목 갤러리 커피", "서촌", "전시 카페", ["전시", "감각적인", "데이트", "둘이"], "작은 전시와 커피를 함께 보는 곳"),
  S("seochon-listening", "서촌 청음", "서촌", "LP카페", ["음악", "LP", "밤", "혼자"], "혼자 와서 한 장을 끝까지 듣는 곳"),
  S("seochon-garden-tea", "마당 있는 찻집", "서촌", "찻집", ["편안한", "조용한", "둘이"], "작은 마당이 보이는 찻집"),
  S("seochon-inwang-roof", "인왕 루프", "서촌", "카페", ["감각적인", "데이트"], "인왕산이 보이는 옥상 카페"),
  S("seochon-record-shop", "기록 상점", "서촌", "편집숍", ["독특한", "책"], "노트와 오래된 인쇄물을 파는 상점"),
  S("seochon-single-seat", "1인석", "서촌", "카페", ["혼자", "조용한", "오래 머무는"], "모든 자리가 1인석인 카페"),
  S("seochon-small-photo", "작은 사진관", "서촌", "전시 공간", ["전시", "독특한"], "필름 사진을 걸어두는 작은 전시 공간"),
  S("seochon-seven-pm", "저녁 일곱시", "서촌", "와인바", ["밤", "둘이", "데이트", "편안한"], "저녁 일곱 시에 문을 여는 와인바"),
];

/** 실제 공개 공간 — 연결만 한다(읽기 전용). */
const REAL = { booknook: "booknook-yeonnam", turndown: "turndown-service", inner: "inner-discovery", dasijeom: "dasijeom", nokhwa: "nokhwabutton" };
const P = (slug: string) => `proto-${slug}`;

type Pick = [spaceSlug: string, comment: string];
type DemoCollection = { slug: string; title: string; description: string; area: string | null; keywords: string[]; picks: Pick[] };
type DemoCurator = { slug: string; name: string; bio: string; tasteTags: string[]; isOfficial?: boolean; collections: DemoCollection[] };

const CURATORS: DemoCurator[] = [
  {
    slug: "proto-minji", name: "민지", bio: "혼자 오래 머무를 수 있는 작은 카페와 서점을 기록합니다.",
    tasteTags: ["조용한", "책", "혼자", "오래 머무는"],
    collections: [
      { slug: "proto-minji-yeonnam-alone", title: "혼자 오래 있고 싶은 연남", area: "연남", keywords: ["혼자", "조용한", "오래 머무는"],
        description: "사람이 너무 많지 않고, 혼자 앉아 있어도 어색하지 않은 곳들을 골랐어요.",
        picks: [
          [REAL.booknook, "몇 시간이고 책을 펴두고 싶은 날 가장 먼저 떠오르는 곳."],
          [P("yeonnam-slow-sentence"), "창가 1인석에 앉으면 시간이 조금 느리게 가요."],
          [P("yeonnam-alley-coffee"), "말 걸지 않는 친절이 있는 커피집."],
          [P("yeonnam-three-pm-tea"), "차를 두 번 우릴 때쯤 생각이 정리돼요."],
        ] },
      { slug: "proto-minji-books-till-evening", title: "책 읽다가 저녁까지 있고 싶은 곳", area: null, keywords: ["책", "오래 머무는", "조용한"],
        description: "점심쯤 들어가서 해 질 때 나오게 되는, 책과 오래 있기 좋은 자리들.",
        picks: [
          [P("seochon-hanok-shelves"), "대청마루 볕이 바뀌는 걸 보며 한 권을 끝냈어요."],
          [P("mangwon-one-book"), "한 권만 소개하는 서점이라 오히려 오래 머물게 돼요."],
          [P("yeonnam-slow-sentence"), "책장 사이 작은 테이블이 제일 좋은 자리."],
          [P("mangwon-river-desk"), "읽다가 쓰고 싶어질 때 가는 곳."],
          [REAL.booknook, "예약하고 몇 시간 동안 책을 읽고 싶을 때 가는 곳."],
        ] },
      { slug: "proto-minji-rainy-day", title: "비 오는 날 생각나는 공간", area: null, keywords: ["비 오는 날", "조용한", "편안한"],
        description: "빗소리가 배경음악이 되는 창가와 마당이 있는 곳.",
        picks: [
          [P("mangwon-rain-window"), "큰 창으로 비 오는 골목을 오래 볼 수 있어요."],
          [P("seochon-garden-tea"), "마당에 떨어지는 빗소리가 좋아서."],
          [P("seochon-single-seat"), "비 오는 날엔 혼자 앉는 자리가 더 아늑해요."],
          [P("yeonnam-alley-coffee"), "우산 꽂아두고 한 시간쯤 있기 좋은 곳."],
        ] },
    ],
  },
  {
    slug: "proto-hyunwoo", name: "현우", bio: "서울에서 음악을 제대로 들을 수 있는 공간을 찾습니다.",
    tasteTags: ["음악", "LP", "작은 공간", "밤"],
    collections: [
      { slug: "proto-hyunwoo-music-alone-seoul", title: "혼자 음악 들으러 가는 서울", area: null, keywords: ["음악", "혼자", "밤"],
        description: "대화 없이 한 장을 끝까지 들어도 괜찮은 곳들.",
        picks: [
          [P("yeonnam-night-listening"), "스피커 앞자리는 꼭 혼자 앉아야 해요."],
          [P("seochon-listening"), "신청곡보다 주인장 선곡을 믿게 되는 곳."],
          [P("mangwon-record-room"), "계단 올라가는 순간부터 소리가 달라요."],
          [REAL.turndown, "음악을 들으러 가는 카페라는 말이 정확히 맞는 곳."],
        ] },
      { slug: "proto-hyunwoo-yeonnam-listening", title: "오래 듣고 싶은 연남", area: "연남", keywords: ["음악", "LP", "오래 머무는"],
        description: "연남에서 앨범 한 장이 아니라 저녁 한 번을 통째로 보내는 곳.",
        picks: [
          [REAL.turndown, "편히 쉬다 가라는 말이 진짜인 곳."],
          [P("yeonnam-night-listening"), "밤 열 시 이후의 선곡이 제일 좋아요."],
          [P("yeonnam-place-of-objects"), "오래된 앰프가 놓인 구석 자리를 좋아해요."],
        ] },
      { slug: "proto-hyunwoo-come-back-for-music", title: "음악 때문에 다시 가는 곳", area: null, keywords: ["음악", "작은 공간", "밤"],
        description: "커피나 술보다 그날 들은 음악 때문에 또 가게 되는 작은 공간.",
        picks: [
          [P("mangwon-record-room"), "갈 때마다 모르는 앨범을 하나씩 알게 돼요."],
          [P("mangwon-small-needle"), "턴테이블 두 대가 번갈아 도는 걸 보는 재미."],
          [P("seochon-listening"), "혼자 가도, 둘이 가도 음악이 대화를 대신해요."],
        ] },
    ],
  },
  {
    slug: "proto-seoyeon", name: "서연", bio: "분위기와 경험이 함께 남는 데이트 공간을 기록합니다.",
    tasteTags: ["감각적인", "둘이", "전시", "카페"],
    collections: [
      { slug: "proto-seoyeon-not-ordinary-cafe", title: "평범한 카페 말고 다른 곳", area: null, keywords: ["감각적인", "독특한", "카페"],
        description: "커피만 마시고 나오기엔 아까운, 공간 자체가 경험인 곳.",
        picks: [
          [P("yeonnam-paper-light"), "갈 때마다 벽에 걸린 작업이 바뀌어 있어요."],
          [P("yeonnam-place-of-objects"), "물건 하나하나에 이야기가 있는 카페."],
          [P("mangwon-studio-next"), "옆 작업실의 분위기가 그대로 넘어와요."],
          [P("mangwon-clay-coffee"), "커피잔을 직접 고르는 재미가 있어요."],
          [REAL.inner, "들어서는 순간 평범한 카페가 아니라는 걸 알게 되는 곳."],
        ] },
      { slug: "proto-seoyeon-seochon-date", title: "데이트하기 좋은 서촌", area: "서촌", keywords: ["데이트", "둘이", "감각적인"],
        description: "걷다가 들르고, 오래 이야기하게 되는 서촌의 저녁 동선.",
        picks: [
          [P("seochon-alley-gallery"), "작은 전시를 같이 보고 나면 대화가 길어져요."],
          [P("seochon-inwang-roof"), "해 질 무렵 인왕산 쪽 하늘이 좋아요."],
          [P("seochon-seven-pm"), "데이트의 마지막은 늘 여기."],
          [P("seochon-garden-tea"), "낮 데이트라면 마당이 보이는 자리로."],
        ] },
      { slug: "proto-seoyeon-memorable", title: "공간 자체가 기억에 남는 곳", area: null, keywords: ["감각적인", "전시", "독특한"],
        description: "무엇을 먹었는지보다 그 공간이 먼저 기억나는 곳들.",
        picks: [
          [P("seochon-small-photo"), "필름 사진 앞에서 한참 서 있게 돼요."],
          [P("seochon-record-shop"), "오래된 인쇄물 냄새까지 기억나는 상점."],
          [REAL.dasijeom, "다시 보게 되는 것들에 대해 생각하게 하는 곳."],
          [REAL.nokhwa, "오래된 장비들 사이에 있으면 시간이 다르게 흘러요."],
          [P("yeonnam-paper-light"), "빛이 종이를 통과하는 오후가 가장 좋아요."],
        ] },
    ],
  },
  {
    slug: "proto-gonggancube", name: "공간큐브", isOfficial: true, bio: "오래 머물 이유가 있는 작은 공간을 기록합니다.",
    tasteTags: ["조용한", "독특한", "감각적인", "오래 머무는"],
    collections: [
      { slug: "proto-gonggancube-reasons-to-stay", title: "오래 머물 이유가 있는 작은 공간", area: null, keywords: ["오래 머무는", "조용한"],
        description: "공간큐브가 실제로 함께한 공간과, 같은 결의 공간들.",
        picks: [
          [REAL.booknook, "나만의 작은 공간 하나라는 말이 잘 어울리는 곳."],
          [REAL.turndown, "음악과 쉼이 같은 무게로 있는 곳."],
          [REAL.inner, "머무는 동안 자기 안쪽을 보게 되는 공간."],
          [P("seochon-hanok-shelves"), "오래 머무는 사람을 위해 만든 서가."],
        ] },
      { slug: "proto-gonggancube-mangwon-makers", title: "망원에서 무언가를 만드는 사람들", area: "망원", keywords: ["독특한", "감각적인"],
        description: "무언가를 만드는 사람이 운영하는 망원의 공간.",
        picks: [
          [REAL.nokhwa, "기록하는 도구를 좋아하는 사람이 만든 공간."],
          [REAL.dasijeom, "다른 시점으로 보게 만드는 복합문화공간."],
          [P("mangwon-clay-coffee"), "공방과 카페가 한 공간을 나눠 써요."],
          [P("mangwon-studio-next"), "작업실의 리듬이 그대로 느껴지는 곳."],
        ] },
    ],
  },
];

async function main() {
  // 1) 가상 공간 — 같은 slug의 실제 공간이 있으면 중단
  const existing = await prisma.editorialSpace.findMany({ where: { slug: { in: DEMO_SPACES.map((s) => s.slug) } }, select: { slug: true, isDemo: true } });
  const clash = existing.filter((e) => !e.isDemo);
  if (clash.length) throw new Error(`실제 공간과 slug가 겹쳐 중단: ${clash.map((c) => c.slug).join(", ")}`);
  const now = new Date();
  for (const s of DEMO_SPACES) {
    const data = { name: s.name, area: s.area, category: s.category, tags: s.tags, summary: s.summary, address: s.address, isDemo: true, status: "PUBLISHED" as const };
    await prisma.editorialSpace.upsert({ where: { slug: s.slug }, create: { slug: s.slug, ...data, publishedAt: now }, update: data });
  }

  // 2) 실제 공개 공간 확인(읽기 전용)
  const realSlugs = Object.values(REAL);
  const real = await prisma.editorialSpace.findMany({ where: { slug: { in: realSlugs }, status: "PUBLISHED", isDemo: false }, select: { slug: true } });
  const missingReal = realSlugs.filter((r) => !real.some((x) => x.slug === r));
  if (missingReal.length) console.warn("발행 상태가 아니어서 연결하지 않는 실제 공간:", missingReal);

  const spaceRows = await prisma.editorialSpace.findMany({ where: { slug: { in: [...DEMO_SPACES.map((s) => s.slug), ...real.map((r) => r.slug)] } }, select: { id: true, slug: true } });
  const idBySlug = new Map(spaceRows.map((r) => [r.slug, r.id]));

  // 3) 큐레이터 · 컬렉션 · 연결
  let order = 0;
  let pickCount = 0;
  for (const c of CURATORS) {
    const found = await prisma.curatorProfile.findUnique({ where: { slug: c.slug }, select: { isDemo: true } });
    if (found && !found.isDemo) throw new Error(`실제 큐레이터와 slug가 겹쳐 중단: ${c.slug}`);
    const email = `proto-curator+${c.slug.replace(/^proto-/, "")}@spacecube.local`;
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { isDemo: true } });
    if (existingUser && !existingUser.isDemo) throw new Error(`실제 사용자와 이메일이 겹쳐 중단: ${email}`);
    const user = await prisma.user.upsert({ where: { email }, create: { email, name: c.name, isDemo: true }, update: { name: c.name, isDemo: true } });
    const curatorData = { userId: user.id, name: c.name, bio: c.bio, tasteTags: c.tasteTags, isOfficial: !!c.isOfficial, displayOrder: order++, status: "PUBLISHED" as const, isDemo: true };
    const curator = await prisma.curatorProfile.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...curatorData }, update: curatorData });

    let colOrder = 0;
    for (const col of c.collections) {
      const foundCol = await prisma.curatorCollection.findUnique({ where: { slug: col.slug }, select: { isDemo: true } });
      if (foundCol && !foundCol.isDemo) throw new Error(`실제 컬렉션과 slug가 겹쳐 중단: ${col.slug}`);
      const colData = {
        curatorId: curator.id, title: col.title, description: col.description, area: col.area, keywords: col.keywords,
        displayOrder: colOrder++, status: "PUBLISHED" as const, isDemo: true,
      };
      const collection = await prisma.curatorCollection.upsert({ where: { slug: col.slug }, create: { slug: col.slug, ...colData }, update: colData });
      await prisma.curatorCollectionSpace.deleteMany({ where: { collectionId: collection.id } });
      const rows = col.picks.flatMap(([slug, comment], i) => {
        const spaceId = idBySlug.get(slug);
        return spaceId ? [{ collectionId: collection.id, spaceId, comment, displayOrder: i }] : [];
      });
      await prisma.curatorCollectionSpace.createMany({ data: rows });
      pickCount += rows.length;
    }
  }

  const [spaces, curators, collections] = await Promise.all([
    prisma.editorialSpace.count({ where: { isDemo: true } }),
    prisma.curatorProfile.count({ where: { isDemo: true } }),
    prisma.curatorCollection.count({ where: { isDemo: true } }),
  ]);
  console.log(`가상 공간 ${spaces} · 가상 큐레이터 ${curators} · 가상 컬렉션 ${collections} · 공간 연결 ${pickCount} (실제 공간 연결 ${real.length}곳, 실제 공간 수정 0)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
