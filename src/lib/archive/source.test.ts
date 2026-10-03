import { describe, it, expect } from "vitest";
import { canonicalLink, compactName, detectSourceKind, linkMatchesSpace, naverPlaceId, parseHttpUrl, placeKey } from "./source";

const u = (s: string) => parseHttpUrl(s)!;

describe("parseHttpUrl", () => {
  it("공유 문구 속 주소를 꺼내고 http(s)만 허용", () => {
    expect(parseHttpUrl("[네이버 지도]\n북눅 https://naver.me/abc123 ")?.href).toBe("https://naver.me/abc123");
    expect(parseHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpUrl("그냥 글")).toBeNull();
  });
});

describe("detectSourceKind", () => {
  it("주요 플랫폼 구분", () => {
    expect(detectSourceKind(u("https://naver.me/xyz"))).toBe("NAVER_PLACE");
    expect(detectSourceKind(u("https://map.naver.com/p/entry/place/1234567890"))).toBe("NAVER_PLACE");
    expect(detectSourceKind(u("https://m.place.naver.com/restaurant/1234567/home"))).toBe("NAVER_PLACE");
    expect(detectSourceKind(u("https://www.instagram.com/p/Cx123/"))).toBe("INSTAGRAM");
    expect(detectSourceKind(u("https://place.map.kakao.com/12345"))).toBe("KAKAO_MAP");
    expect(detectSourceKind(u("https://maps.app.goo.gl/abc"))).toBe("GOOGLE_MAPS");
    expect(detectSourceKind(u("https://www.google.com/maps/place/x"))).toBe("GOOGLE_MAPS");
    expect(detectSourceKind(u("https://example.com/cafe"))).toBe("WEB");
  });
});

describe("naverPlaceId · linkMatchesSpace", () => {
  it("플레이스 번호로 같은 장소를 알아본다(주소 모양이 달라도)", () => {
    expect(naverPlaceId(u("https://map.naver.com/p/entry/place/1234567890?c=15"))).toBe("1234567890");
    expect(naverPlaceId(u("https://naver.me/abc"))).toBeNull();
    expect(linkMatchesSpace(u("https://m.place.naver.com/place/1234567890/home"), ["https://map.naver.com/p/entry/place/1234567890"])).toBe(true);
    expect(linkMatchesSpace(u("https://m.place.naver.com/place/999999/home"), ["https://map.naver.com/p/entry/place/1234567890"])).toBe(false);
  });
  it("같은 주소면 추적 파라미터·www·끝 슬래시 차이를 무시", () => {
    expect(canonicalLink(u("https://www.instagram.com/booknook/?igsh=abc&utm_source=x"))).toBe("instagram.com/booknook");
    expect(linkMatchesSpace(u("https://instagram.com/booknook?igsh=1"), [null, "https://www.instagram.com/booknook/"])).toBe(true);
  });
});

describe("placeKey · compactName", () => {
  it("이름 공백·기호와 지역 표기 차이를 흡수", () => {
    expect(placeKey("북눅 연남", "연남동")).toBe(placeKey("북눅연남", "연남"));
    expect(placeKey("A", null)).toBe("a|");
    expect(compactName("북눅 연남")).toBe("북눅연남");
  });
});
