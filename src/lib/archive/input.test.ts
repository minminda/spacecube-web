import { describe, it, expect } from "vitest";
import { isAllowedArchivePhoto, parseCreateInput, parsePatchInput, parseTags, parseVisitDate, parseVisitInput } from "./input";

const allowedTags = new Set(["조용한", "편안한", "독특한"]);
const ok = (url: string) => isAllowedArchivePhoto(url, "demo", "u1");
const PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/archive/u1/abc.jpg";

describe("isAllowedArchivePhoto", () => {
  it("이 서비스 계정 + 본인 폴더 사진만", () => {
    expect(ok(PHOTO)).toBe(true);
    expect(ok("https://res.cloudinary.com/demo/image/upload/v1/archive/u2/abc.jpg")).toBe(false);
    expect(ok("https://res.cloudinary.com/other/image/upload/v1/archive/u1/abc.jpg")).toBe(false);
    expect(ok("https://evil.com/archive/u1/x.jpg")).toBe(false);
    expect(isAllowedArchivePhoto(PHOTO, undefined, "u1")).toBe(false);
  });
});

describe("parseCreateInput", () => {
  const ctx = { isAllowedPhoto: ok, allowedTags };
  it("사진 + 이름만으로 저장 가능", () => {
    const r = parseCreateInput({ placeName: " 북눅 ", fromPhoto: true, photos: [{ url: PHOTO, width: 800 }], status: "VISITED" }, ctx);
    expect(r.ok && r.data).toMatchObject({ placeName: "북눅", status: "VISITED", photos: [{ url: PHOTO, width: 800 }] });
  });
  it("사진으로 추가하면서 사진이 없으면 거부, 이름이 없으면 거부", () => {
    expect(parseCreateInput({ placeName: "a", fromPhoto: true }, ctx).ok).toBe(false);
    expect(parseCreateInput({}, ctx).ok).toBe(false);
  });
  it("연결 공간이 있으면 이름은 그 공간 이름으로 채운다", () => {
    const r = parseCreateInput({ spaceId: "s1" }, { ...ctx, spaceName: "북눅 연남" });
    expect(r.ok && r.data.placeName).toBe("북눅 연남");
    expect(r.ok && r.data.status).toBe("SAVED");
  });
  it("허용되지 않은 사진 주소·태그는 막거나 버린다", () => {
    expect(parseCreateInput({ placeName: "a", photos: [{ url: "https://x.com/a.jpg" }] }, ctx).ok).toBe(false);
    const r = parseCreateInput({ placeName: "a", tags: ["조용한", "가짜태그", "조용한"] }, ctx);
    expect(r.ok && r.data.tags).toEqual(["조용한"]);
  });
});

describe("날짜 · 방문 · 수정", () => {
  it("방문 날짜는 YYYY-MM-DD, 미래는 거부", () => {
    expect(parseVisitDate("2026-08-01")?.toString()).toBe(new Date("2026-08-01T00:00:00.000Z").toString());
    expect(parseVisitDate("")).toBeNull();
    expect(parseVisitDate("2099-01-01", new Date("2026-10-03"))).toBe("invalid");
    expect(parseVisitDate("8월 1일")).toBe("invalid");
  });
  it("또 갔어요 — 날짜·메모·사진 모두 선택", () => {
    const r = parseVisitInput({}, ok);
    expect(r.ok && r.data).toEqual({ visitedOn: null, memo: null, photos: [] });
  });
  it("수정은 보낸 필드만, 이름은 비울 수 없음", () => {
    const r = parsePatchInput({ memo: " 또 가고 싶다 ", tags: ["편안한"] }, allowedTags);
    expect(r.ok && r.data).toEqual({ memo: "또 가고 싶다", tags: ["편안한"] });
    expect(parsePatchInput({ placeName: "  " }, allowedTags).ok).toBe(false);
    expect(parsePatchInput({ status: "DELETED" }, allowedTags).ok).toBe(false);
  });
  it("parseTags 최대 개수", () => {
    expect(parseTags(["조용한", "편안한", "독특한"], allowedTags)).toHaveLength(3);
  });
});
