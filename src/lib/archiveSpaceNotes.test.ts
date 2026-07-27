import { describe, it, expect } from "vitest";
import {
  buildSpaceNoteEntries, getCoreTags, resolveInitialIndex, guestbookNoteHref,
  SPACE_NOTE_MAX_CORE_TAGS,
  type ArchiveRecordInput, type ArchiveGuestbookNoteInput, type ArchiveSpaceTagLink,
} from "./archiveSpaceNotes";

const SPACE_X = "space-x";
const SPACE_Y = "space-y";

interface LinkOverrides {
  visibleToUsers?: boolean;
  weight?: number;
  isPrimary?: boolean;
  tag: {
    id: string;
    name: string;
    isActive?: boolean;
    categoryId?: string | null;
    categoryRef?: { name: string } | null;
  };
}

function link(overrides: LinkOverrides): ArchiveSpaceTagLink {
  return {
    visibleToUsers: overrides.visibleToUsers ?? true,
    weight: overrides.weight ?? 1,
    isPrimary: overrides.isPrimary ?? false,
    tag: {
      isActive: true,
      categoryId: null,
      categoryRef: null,
      ...overrides.tag,
    },
  };
}

function record(overrides: Partial<ArchiveRecordInput> & { id: string; spaceId: string; visitedAt: Date }): ArchiveRecordInput {
  return {
    tasteScore: null,
    space: {
      id: overrides.spaceId, name: "space", slug: "space", type: "타입", district: null, imageUrl: null,
      spaceTagLinks: [],
    },
    ...overrides,
  };
}

describe("buildSpaceNoteEntries", () => {
  it("한 공간을 여러 번 방문하면 카드 하나로 묶이고, 대표 기록은 최신 방문이다", () => {
    const entries = buildSpaceNoteEntries(
      [
        record({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5 }),
        record({ id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-07-20"), tasteScore: 3 }),
      ],
      [],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].visitCount).toBe(2);
    expect(entries[0].tasteScore).toBe(3); // 최신 방문(07-20) 점수
    expect(entries[0].representativeRecordId).toBe("r2");
  });

  it("여러 공간은 각각 카드로 만들어지고, 최근 방문 순으로 정렬된다", () => {
    const entries = buildSpaceNoteEntries(
      [
        record({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") }),
        record({ id: "r2", spaceId: SPACE_Y, visitedAt: new Date("2026-07-15") }),
      ],
      [],
    );
    expect(entries.map((e) => e.spaceId)).toEqual([SPACE_Y, SPACE_X]);
  });

  it("방명록이 있으면 공간별 최신 흔적 1개만 대표로 담는다", () => {
    const notes: ArchiveGuestbookNoteInput[] = [
      { id: "n2", spaceId: SPACE_X, content: "두번째", color: "#fff", imageUrl: null, createdAt: new Date("2026-07-10"), spaceSlug: "x", sessionId: "s1", sessionStatus: "ACTIVE" },
      { id: "n1", spaceId: SPACE_X, content: "첫번째", color: "#fff", imageUrl: null, createdAt: new Date("2026-07-01"), spaceSlug: "x", sessionId: "s1", sessionStatus: "ACTIVE" },
    ];
    const entries = buildSpaceNoteEntries(
      [record({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") })],
      notes, // 호출부가 이미 createdAt desc로 정렬해서 넘긴다고 가정
    );
    expect(entries[0].latestGuestbookNote?.id).toBe("n2");
  });

  it("방명록이 없으면 null이다(더미 생성 금지)", () => {
    const entries = buildSpaceNoteEntries(
      [record({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") })],
      [],
    );
    expect(entries[0].latestGuestbookNote).toBeNull();
  });
});

describe("getCoreTags", () => {
  it('"공간 유형" 카테고리는 이미 별도로 표시되므로 후보에서 제외한다', () => {
    const links = [
      link({ tag: { id: "t1", name: "카페", categoryId: "cat-type", categoryRef: { name: "공간 유형" } } }),
      link({ tag: { id: "t2", name: "조용한", categoryId: "cat-mood", categoryRef: { name: "분위기" } } }),
    ];
    const result = getCoreTags(links);
    expect(result.map((t) => t.name)).toEqual(["조용한"]);
  });

  it("같은 카테고리에서는 weight가 높은 태그 1개만 남긴다", () => {
    const links = [
      link({ weight: 0.5, tag: { id: "t1", name: "따뜻한", categoryId: "cat-mood" } }),
      link({ weight: 1.5, tag: { id: "t2", name: "조용한", categoryId: "cat-mood" } }),
    ];
    const result = getCoreTags(links);
    expect(result.map((t) => t.name)).toEqual(["조용한"]);
  });

  it("미분류 태그(categoryId=null)는 서로 다른 태그로 취급해 여러 개 나올 수 있다", () => {
    const links = [
      link({ tag: { id: "t1", name: "빈티지", categoryId: null } }),
      link({ tag: { id: "t2", name: "독립적인", categoryId: null } }),
    ];
    const result = getCoreTags(links);
    expect(result.map((t) => t.name)).toEqual(["빈티지", "독립적인"]);
  });

  it("isPrimary가 weight보다 우선한다", () => {
    const links = [
      link({ weight: 2, isPrimary: false, tag: { id: "t1", name: "따뜻한", categoryId: "cat-mood" } }),
      link({ weight: 0.5, isPrimary: true, tag: { id: "t2", name: "조용한", categoryId: "cat-mood" } }),
    ];
    expect(getCoreTags(links).map((t) => t.name)).toEqual(["조용한"]);
  });

  it(`최대 ${SPACE_NOTE_MAX_CORE_TAGS}개까지만 고른다`, () => {
    const links = Array.from({ length: 5 }, (_, i) =>
      link({ tag: { id: `t${i}`, name: `tag${i}`, categoryId: null } }),
    );
    expect(getCoreTags(links)).toHaveLength(SPACE_NOTE_MAX_CORE_TAGS);
  });

  it("visibleToUsers가 false거나 비활성 태그는 후보에서 제외한다", () => {
    const links = [
      link({ visibleToUsers: false, tag: { id: "t1", name: "숨김", categoryId: null } }),
      link({ tag: { id: "t2", name: "비활성", categoryId: null, isActive: false } }),
    ];
    expect(getCoreTags(links)).toEqual([]);
  });

  it("동일 입력에 대해 항상 같은 결과를 낸다(결정적)", () => {
    const links = [
      link({ weight: 1, tag: { id: "t1", name: "A", categoryId: null } }),
      link({ weight: 1, tag: { id: "t2", name: "B", categoryId: null } }),
    ];
    const a = getCoreTags(links).map((t) => t.name);
    const b = getCoreTags(links).map((t) => t.name);
    expect(a).toEqual(b);
  });
});

describe("resolveInitialIndex", () => {
  const entries = buildSpaceNoteEntries(
    [
      record({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") }),
      record({ id: "r2", spaceId: SPACE_Y, visitedAt: new Date("2026-07-15") }),
    ],
    [],
  );

  it("주어진 spaceId의 인덱스를 찾는다", () => {
    expect(resolveInitialIndex(entries, SPACE_X)).toBe(entries.findIndex((e) => e.spaceId === SPACE_X));
  });

  it("spaceId가 없거나 못 찾으면 0을 반환한다", () => {
    expect(resolveInitialIndex(entries, undefined)).toBe(0);
    expect(resolveInitialIndex(entries, "no-such-space")).toBe(0);
  });
});

describe("guestbookNoteHref", () => {
  it("ACTIVE 세션은 캔버스 focus로 링크한다", () => {
    expect(guestbookNoteHref({ id: "n1", spaceSlug: "x", sessionId: "s1", sessionStatus: "ACTIVE" }))
      .toBe("/space/x/guestbook?focus=n1");
  });

  it("종료된 세션은 아카이브 highlight로 링크한다", () => {
    expect(guestbookNoteHref({ id: "n1", spaceSlug: "x", sessionId: "s1", sessionStatus: "ARCHIVED" }))
      .toBe("/space/x/guestbook/archive/s1?highlight=n1");
  });
});
