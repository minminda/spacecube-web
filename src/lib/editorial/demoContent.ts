/* ── 시연용 CURATION · PEOPLE · THOUGHT (코드 데이터) ──────────────────────────────
   ⚠ 가상 콘텐츠다. Editorial CMS 행이 아니라 코드 데이터이고, 시연용 가상 공간(DB의 EditorialSpace, slug 접두어 demo-)만 연결한다.
   - 실제 취재 · 방문 · 인터뷰에 근거하지 않는다. PEOPLE은 실존 인물이 아니라 "가상 페르소나"이며 인물의 발언(인용)을 만들지 않는다.
   - 모든 글 맨 앞에 시연용임을 밝히는 안내 블록을 둔다. 카드 머리줄에도 "시연용"이 붙는다(queries.ts).
   - 대표 이미지는 콘텐츠마다 서로 다른 사진 한 장(public/demo)이며 다른 콘텐츠와 겹치지 않는다. 각 콘텐츠 대표 사진은 그 콘텐츠가 소개하는 공간의 사진이다.
   - 공간 연결은 공간 이름 → DB에서 읽은 SpaceView(실제 id · slug)로 한다(queries.ts가 map을 만들어 넘긴다). 가상 공간 11곳이 DB에 모두 있을 때만 쓴다.
   - queries.ts가 DB 콘텐츠 앞에 합쳐 HOME · /curation · /story · 상세 · 공간 상세의 "소개된 이야기"에 같은 경로로 나온다.
   - ENABLE_PUBLIC_DEMO_SPACES가 꺼지면 모두 사라진다(호출부가 demoContentEnabled로 판단). ── */

import { ENABLE_PUBLIC_DEMO_SPACES } from "@/lib/features";
import { DEMO_SPACE_SEEDS } from "@/lib/home/demoSpaceSeeds";
import type { CurationView, EditorialBlock, LinkedSpace, PersonView, ResolvedImage, SpaceView, ThoughtView } from "./types";

export const demoContentEnabled = (): boolean => ENABLE_PUBLIC_DEMO_SPACES;

export const DEMO_MARK = "시연용";

/** 공간 이름 → DB의 시연용 공간 SpaceView */
export type SpaceByName = Map<string, SpaceView>;

/** 시연 콘텐츠가 쓰는 공간 11곳이 모두 있는가(없으면 시연 콘텐츠를 내지 않는다) */
export const demoSpacesComplete = (by: SpaceByName): boolean => DEMO_SPACE_SEEDS.every((s) => by.has(s.name));

const DISCLAIMER =
  "시연용 콘텐츠 — 공간큐브 시연을 위해 만든 가상의 글입니다. 등장하는 공간은 실제 장소가 아니며, 취재나 방문에 근거하지 않았습니다.";

function helpers(by: SpaceByName) {
  const get = (name: string): SpaceView => {
    const v = by.get(name);
    if (!v) throw new Error(`demo space not found: ${name}`);
    return v;
  };
  return {
    link: (name: string, note: string): LinkedSpace => ({ space: get(name), note }),
    card: (name: string, note: string): EditorialBlock => ({ type: "SPACE_CARD", spaceId: get(name).id, note }),
  };
}
const text = (t: string): EditorialBlock => ({ type: "TEXT", text: t });
const head = (t: string): EditorialBlock => ({ type: "HEADING", text: t });
const disclaimer: EditorialBlock = { type: "TEXT", text: DISCLAIMER, small: true };
const cover = (src: string, alt: string): ResolvedImage => ({ src, alt });
const at = (iso: string) => new Date(iso);

/* ── CURATION ── */

export function demoCurations(by: SpaceByName): CurationView[] {
  const { link, card } = helpers(by);
  const items: CurationView[] = [
    {
      id: "demo-curation-7", slug: "demo-solo-afternoon", number: 7, area: "망원", perspective: "SITUATION",
      title: "혼자 보내는 오후",
      summary: "말을 걸지 않아도 되는 자리가 있는 공간 셋.",
      cover: cover("/demo/window-afternoon.jpg", "혼자 보내는 오후 — 창가의 오후"),
      spaces: [
        link("창가의 오후", "큰 창 앞의 바 형태 자리와 낮은 음악이 있어, 혼자 앉아 창밖을 보기에 맞다."),
        link("서가 뒤의 창", "서가와 독서등이 자리를 나눠 주어, 각자 자기 일에 집중하기 좋다."),
        link("물가의 창", "천장까지 닿는 창이 풍경을 앞에 두어, 말없이 오래 앉아 있기 좋다."),
      ],
      blocks: [
        disclaimer,
        text("혼자 가는 날에는 메뉴보다 자리가 먼저 보인다. 창이 어느 쪽으로 나 있는지, 옆 테이블과 얼마나 떨어져 있는지, 소리가 어디서 나는지.\n\n이 큐레이션은 그런 기준으로 세 곳을 골랐다."),
        card("창가의 오후", "큰 창 앞의 바 형태 자리와 낮은 음악이 있어, 혼자 앉아 창밖을 보기에 맞다."),
        card("서가 뒤의 창", "서가와 독서등이 자리를 나눠 주어, 각자 자기 일에 집중하기 좋다."),
        card("물가의 창", "천장까지 닿는 창이 풍경을 앞에 두어, 말없이 오래 앉아 있기 좋다."),
        text("세 공간 모두 대화를 요구하지 않는다. 오후 한나절을 혼자 보내려는 날에 어울린다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T03:10:00Z"),
    },
    {
      id: "demo-curation-8", slug: "demo-listen-slowly", number: 8, area: "망원", perspective: "PURPOSE",
      title: "음악을 천천히 듣는 날",
      summary: "음악이 배경이 아니라 이유가 되는 공간 셋.",
      cover: cover("/demo/jazz-record-shelf.jpg", "음악을 천천히 듣는 날 — 재즈 음반장"),
      spaces: [
        link("재즈 음반장", "벽 한 면의 음반장과 낮은 조명 — 저녁에 음악을 듣기 위해 가는 곳."),
        link("쪽지와 음반", "CD 진열대 옆 벽에 쪽지가 붙어 있어, 음반을 고르다 다른 사람의 글을 읽게 된다."),
        link("창가의 오후", "창 옆 스피커의 낮은 소리를 들으며, 음악과 창밖을 번갈아 보게 된다."),
      ],
      blocks: [
        disclaimer,
        text("음악이 공간의 이유가 되는 곳은 물건이 먼저 알려 준다. 음반장, 진열대, 스피커. 소리 주변에 놓인 것들을 기준으로 세 곳을 모았다."),
        card("재즈 음반장", "벽 한 면의 음반장과 낮은 조명 — 저녁에 음악을 듣기 위해 가는 곳."),
        card("쪽지와 음반", "CD 진열대 옆 벽에 쪽지가 붙어 있어, 음반을 고르다 다른 사람의 글을 읽게 된다."),
        card("창가의 오후", "창 옆 스피커의 낮은 소리를 들으며, 음악과 창밖을 번갈아 보게 된다."),
        text("한 곡을 끝까지 듣고 싶은 날이라면 저녁의 음반장부터, 가볍게 듣고 싶은 날이라면 낮의 창가부터."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T03:30:00Z"),
    },
    {
      id: "demo-curation-9", slug: "demo-stay-with-books", number: 9, area: "망원", perspective: "PURPOSE",
      title: "책과 함께 머무는 공간",
      summary: "읽는 일에서 쓰는 일로 이어지는 책상과 서가.",
      cover: cover("/demo/green-shelf.jpg", "책과 함께 머무는 공간 — 초록 서가"),
      spaces: [
        link("초록 서가", "책마다 손글씨 추천 쪽지가 붙어 있어, 고르는 과정이 대화처럼 이어진다."),
        link("서가 뒤의 창", "책장 너머 창가에 독서등이 놓인 자리가 이어진다."),
        link("만년필과 우체통", "책으로 지붕을 얹은 우체통과 만년필이 한 책상에 있어, 읽다가 몇 줄 적어 보게 된다."),
      ],
      blocks: [
        disclaimer,
        text("책이 있는 공간은 많지만, 책 곁에 머물게 만드는 방식은 조금씩 다르다. 쪽지로 권하는 곳, 독서등 아래 앉히는 곳, 쓰는 도구를 함께 두는 곳."),
        card("초록 서가", "책마다 손글씨 추천 쪽지가 붙어 있어, 고르는 과정이 대화처럼 이어진다."),
        card("서가 뒤의 창", "책장 너머 창가에 독서등이 놓인 자리가 이어진다."),
        card("만년필과 우체통", "책으로 지붕을 얹은 우체통과 만년필이 한 책상에 있어, 읽다가 몇 줄 적어 보게 된다."),
        text("고른 책을 그 자리에서 읽고 싶다면 서가 뒤의 창으로, 책을 고르는 일 자체가 즐거운 날에는 초록 서가로."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T02:50:00Z"),
    },
    {
      id: "demo-curation-10", slug: "demo-small-objects", number: 10, area: "망원", perspective: "SITUATION",
      title: "작은 물건을 오래 들여다보는 날",
      summary: "쓰지 않게 된 물건과 손으로 만든 것들을 천천히 보는 공간 넷.",
      cover: cover("/demo/camera-display.jpg", "작은 물건을 오래 들여다보는 날 — 구형 카메라 진열"),
      spaces: [
        link("구형 카메라 진열", "컴팩트 카메라와 탁상시계가 안내 판과 함께 놓여 있어, 하나씩 구경하게 된다."),
        link("슬라이드 룸", "라이트 테이블 위의 슬라이드 필름을 한 장씩 빛에 비춰 볼 수 있다."),
        link("종이 아카이브", "곡선 벽을 따라 종이 작업물이 놓여 있어, 걸으며 가까이 보게 된다."),
        link("찻잔 선반", "칸마다 다른 잔이 이름표와 함께 놓여 있어, 하나를 고르는 데 시간이 걸린다."),
      ],
      blocks: [
        disclaimer,
        text("목적 없이 구경하러 가는 날이 있다. 그럴 때는 크고 유명한 곳보다, 작은 물건이 가까이 놓인 곳이 맞는다.\n\n사진에서 확인되는 진열 방식을 기준으로 네 곳을 골랐다."),
        card("구형 카메라 진열", "컴팩트 카메라와 탁상시계가 안내 판과 함께 놓여 있어, 하나씩 구경하게 된다."),
        card("슬라이드 룸", "라이트 테이블 위의 슬라이드 필름을 한 장씩 빛에 비춰 볼 수 있다."),
        card("종이 아카이브", "곡선 벽을 따라 종이 작업물이 놓여 있어, 걸으며 가까이 보게 된다."),
        card("찻잔 선반", "칸마다 다른 잔이 이름표와 함께 놓여 있어, 하나를 고르는 데 시간이 걸린다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T05:00:00Z"),
    },
  ];
  return items;
}

/* ── PEOPLE (가상 페르소나) ── */

const PERSONA_ROLE = "가상 페르소나 · 시연용 프로필";

export function demoPeople(by: SpaceByName): PersonView[] {
  const { link, card } = helpers(by);
  return [
    {
      id: "demo-person-5", slug: "demo-persona-tools", number: 5,
      title: "쓰는 도구를 먼저 보는 사람",
      subject: "문구와 찻잔을 고르는 사람", subjectRole: PERSONA_ROLE,
      summary: "실존 인물이 아닌 가상 페르소나로, 물건에서 시작하는 취향을 따라가 봅니다.",
      cover: cover("/demo/pen-and-postbox.jpg", "쓰는 도구를 먼저 보는 사람 — 만년필과 우체통"),
      spaces: [
        link("만년필과 우체통", "쓰는 도구를 구경하고 몇 줄 적어 볼 수 있는 책상."),
        link("찻잔 선반", "잔을 고르는 일에서 대화가 시작되는 찻집."),
      ],
      blocks: [
        disclaimer,
        text("이 글의 주인공 역시 가상의 사람이다. 실제 인터뷰가 아니며, 인물의 말을 인용하지 않는다."),
        head("프로필"),
        text("공간에 들어서면 메뉴판보다 선반을 먼저 본다. 같은 물건이라도 어떻게 놓였는지에 눈이 가고, 마음에 드는 물건 하나를 오래 들고 있는다."),
        head("이 프로필이 가는 곳"),
        card("만년필과 우체통", "쓰는 도구를 구경하고 몇 줄 적어 볼 수 있는 책상."),
        card("찻잔 선반", "잔을 고르는 일에서 대화가 시작되는 찻집."),
        head("공간큐브가 읽는 것"),
        text("읽히는 신호는 소품, 책, 따뜻한 분위기다. 취향을 점수로 묻지 않고, 저장과 방문 같은 행동에서 읽는다는 점이 이 프로필의 요점이다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T02:40:00Z"),
    },
    {
      id: "demo-person-6", slug: "demo-persona-window-seat", number: 6,
      title: "창가 자리부터 찾는 사람",
      subject: "자리를 고르는 사람", subjectRole: PERSONA_ROLE,
      summary: "실존 인물이 아닌 가상 페르소나로, 자리에서 시작하는 취향을 따라가 봅니다.",
      cover: cover("/demo/water-window.jpg", "창가 자리부터 찾는 사람 — 물가의 창"),
      spaces: [
        link("창가의 오후", "창가 바 자리에서 혼자 오래 앉기 좋은 공간."),
        link("물가의 창", "큰 창 너머 풍경을 앞에 두고 앉는 공간."),
      ],
      blocks: [
        disclaimer,
        text("이 글의 주인공은 가상의 사람이며, 실제 인터뷰나 발언이 아니다."),
        head("프로필"),
        text("들어서면 가장 먼저 창이 있는 쪽을 본다. 혼자 가는 일이 많고, 한 번 앉으면 오래 머문다. 사람이 많은 시간대는 피하는 편이다."),
        head("이 프로필이 가는 곳"),
        card("창가의 오후", "창가 바 자리에서 혼자 오래 앉기 좋은 공간."),
        card("물가의 창", "큰 창 너머 풍경을 앞에 두고 앉는 공간."),
        head("공간큐브가 읽는 것"),
        text("읽히는 신호는 조용한, 혼자, 오래 머물기다. 이런 신호는 점수가 아니라 저장한 공간과 다녀온 공간에서 모인다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T03:00:00Z"),
    },
  ];
}

/* ── THOUGHT ── */

export function demoThoughts(by: SpaceByName): ThoughtView[] {
  const { link, card } = helpers(by);
  return [
    {
      id: "demo-thought-4", slug: "demo-conditions-to-stay", number: 4,
      title: "오래 머물고 싶어지는 공간의 조건",
      scene: "책장 너머로 창이 보이는 자리",
      summary: "자리 사이의 거리, 빛의 방향, 소리의 크기에 대한 짧은 생각.",
      cover: cover("/demo/shelf-window.jpg", "오래 머물고 싶어지는 공간의 조건 — 서가 뒤의 창"),
      spaces: [link("서가 뒤의 창", "빛과 자리의 거리를 생각하게 하는 공간."), link("물가의 창", "창이 풍경을 앞에 두는 공간.")],
      blocks: [
        disclaimer,
        text("오래 머문 공간을 떠올리면 메뉴가 아니라 자리가 기억난다. 어디에 앉았는지, 창이 어느 쪽이었는지."),
        text("몇 가지를 꼽아 보면 이렇다. 옆 사람과의 거리가 너무 가깝지 않을 것. 빛이 한쪽에서 들어올 것. 소리가 한 방향에서만 날 것. 이 조건은 어느 쪽도 화려하지 않다."),
        card("서가 뒤의 창", "빛과 자리의 거리를 생각하게 하는 공간."),
        card("물가의 창", "창이 풍경을 앞에 두는 공간."),
        text("두 공간은 모두 사진으로 본 장면일 뿐이다. 실제로 머물러 본 기록이 아니므로, 이 조건이 맞는지는 각자 앉아 보며 확인할 일이다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T04:26:27Z"),
    },
    {
      id: "demo-thought-5", slug: "demo-taste-stays-in-places", number: 5,
      title: "취향은 자주 가는 공간에 남는다",
      scene: "칸마다 다른 찻잔이 놓인 선반",
      summary: "고르는 일이 쌓이면 취향이 되고, 공간은 그 흔적이 된다는 생각.",
      cover: cover("/demo/teacup-shelf.jpg", "취향은 자주 가는 공간에 남는다 — 찻잔 선반"),
      spaces: [link("찻잔 선반", "고르는 일이 쌓이는 장면을 떠올리게 하는 공간."), link("초록 서가", "고른 책이 쪽지로 남는 공간.")],
      blocks: [
        disclaimer,
        text("취향을 물으면 대답하기 어렵다. 대신 어떤 공간에 자주 갔는지를 떠올리면 조금 쉽다."),
        text("찻잔을 하나 고르는 일은 작지만, 같은 선택이 여러 번 쌓이면 방향이 생긴다. 공간은 그 방향이 눈에 보이는 곳이다."),
        card("찻잔 선반", "고르는 일이 쌓이는 장면을 떠올리게 하는 공간."),
        card("초록 서가", "고른 책이 쪽지로 남는 공간."),
        text("공간큐브가 점수 대신 저장과 방문을 기록으로 삼는 이유도 여기에 있다. 이 글에 나온 두 공간은 시연용이며, 실제 방문 경험을 쓴 글이 아니다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T03:20:00Z"),
    },
    {
      id: "demo-thought-6", slug: "demo-when-to-record", number: 6,
      title: "기록하고 싶어지는 순간은 언제일까",
      scene: "라이트 테이블 위의 슬라이드 필름",
      summary: "남겨 두고 싶다는 마음이 생기는 장면에 대한 짧은 생각.",
      cover: cover("/demo/slide-room.jpg", "기록하고 싶어지는 순간은 언제일까 — 슬라이드 룸"),
      spaces: [link("슬라이드 룸", "오래된 기록을 들여다보는 공간."), link("종이 아카이브", "기록물이 벽을 따라 놓인 공간.")],
      blocks: [
        disclaimer,
        text("무언가를 남기고 싶어지는 순간은 대체로 조용하다. 감탄이 아니라, 이 장면이 곧 지나간다는 느낌에 가깝다."),
        text("필름 슬라이드는 한 장에 한 순간만 담는다. 그래서 한 장씩 빛에 비춰 볼 때 오래 보게 된다. 종이 작업물을 벽에 길게 놓는 방식도 비슷하다."),
        card("슬라이드 룸", "오래된 기록을 들여다보는 공간."),
        card("종이 아카이브", "기록물이 벽을 따라 놓인 공간."),
        text("기록은 남기는 일보다 다시 꺼내 보는 일에서 값이 생긴다. 이 글은 시연용 에세이이며, 특정한 방문 경험을 바탕으로 하지 않는다."),
      ],
      status: "PUBLISHED", publishedAt: at("2026-10-04T02:00:00Z"),
    },
  ];
}

/** 공간(id)이 소개된 시연 콘텐츠 — 시연용 공간 상세의 "소개된 이야기" */
export function demoStoriesForSpace(spaceId: string, by: SpaceByName): { curations: CurationView[]; people: PersonView[]; thoughts: ThoughtView[] } {
  if (!demoSpacesComplete(by)) return { curations: [], people: [], thoughts: [] };
  const has = (l: LinkedSpace[]) => l.some((x) => x.space.id === spaceId);
  return {
    curations: demoCurations(by).filter((c) => has(c.spaces)),
    people: demoPeople(by).filter((p) => has(p.spaces)),
    thoughts: demoThoughts(by).filter((t) => has(t.spaces)),
  };
}
