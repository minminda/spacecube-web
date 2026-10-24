import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { demoSpaces, findFixtureSpace, fixtureAreaCounts, fixtureSpaces, fixtureSpaceView } from "./fixtures";

// 관리자 태그 정본(운영 DB 활성 태그, 2026-10-24) — 사진 기반 가상 공간은 이 이름만 쓴다
const CANON_TAGS = new Set([
  "LP", "디자인", "소품", "음악", "전시", "책", "커피", "패션",
  "감각 있는", "다시 오고 싶은", "독특한", "따뜻한", "영감 있는", "조용한", "집중되는", "편안한",
  "대화", "데이트", "산책 중 들르기", "오래 머물기", "저녁", "혼자",
  "루프탑", "예약제", "작은 공간", "테라스",
]);
const CANON_TYPES = new Set(["LP카페", "문화 카페", "복합문화공간", "북카페", "촬영장비", "카페"]);

describe("사진 기반 가상 공간(fixtures)", () => {
  const photo = fixtureSpaces(1).filter((s) => s.image.src);

  it("11곳이고 이름 · slug가 겹치지 않는다", () => {
    expect(photo).toHaveLength(11);
    expect(new Set(photo.map((s) => s.name)).size).toBe(11);
    expect(new Set(photo.map((s) => s.slug)).size).toBe(11);
  });

  it("사진 파일이 public/demo에 있고 중복 사용하지 않는다", () => {
    for (const s of photo) expect(existsSync(join(process.cwd(), "public", s.image.src as string))).toBe(true);
    expect(new Set(photo.map((s) => s.image.src)).size).toBe(11);
  });

  it("유형 · 태그(3~5개)는 정본 이름, 임시 공간 표시(fixture)이며 Partner · 지도 링크가 없다", () => {
    for (const s of photo) {
      expect(CANON_TYPES.has(s.category)).toBe(true);
      expect(s.tags.length).toBeGreaterThanOrEqual(3);
      expect(s.tags.length).toBeLessThanOrEqual(5);
      for (const t of s.tags) expect(CANON_TAGS.has(t)).toBe(true);
      expect(s.fixture).toBe(true);
      expect(s.partner).toBe(false);
      expect(s.hasMapLink).toBe(false);
    }
  });

  it("상세 화면용 모양은 대표 사진 · 소개문을 갖고 주소 · 운영시간은 없다", () => {
    const f = findFixtureSpace(photo[0].slug as string);
    expect(f).not.toBeNull();
    const v = fixtureSpaceView(f!);
    expect(v.coverImage).toBe(photo[0].image.src);
    expect((v.description ?? []).length).toBeGreaterThan(0);
    expect(v.address).toBeUndefined();
    expect(v.hours).toBeUndefined();
    expect(v.mapUrl).toBeUndefined();
    expect(v.cubeAvailable).toBe(false);
  });

  it("일반 방문자용 목록(demoSpaces)은 사진 기반 11곳만이고, publicOnly 조회는 글자만 있는 임시 공간을 막는다", () => {
    const pub = demoSpaces(1);
    expect(pub).toHaveLength(11);
    expect(pub.every((s) => s.image.src && s.fixture)).toBe(true);
    expect(findFixtureSpace("fixture-1", { publicOnly: true })).toBeNull();
    expect(findFixtureSpace("fixture-1")).not.toBeNull();
    expect(findFixtureSpace(pub[0].slug as string, { publicOnly: true })?.id).toBe(pub[0].id);
    expect(fixtureAreaCounts(true).reduce((n, a) => n + a.spaceCount, 0)).toBe(11);
  });
});
