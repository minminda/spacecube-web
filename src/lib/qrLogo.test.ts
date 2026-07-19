import { describe, it, expect } from "vitest";
import { injectCenterLogoIntoSvg, CENTER_LOGO_RATIO } from "./qrLogo";

const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h35v35H0z"/></svg>`;

describe("injectCenterLogoIntoSvg", () => {
  it("</svg> 앞에 흰색 사각형과 텍스트 2줄을 추가한다", () => {
    const result = injectCenterLogoIntoSvg(baseSvg);
    expect(result).toContain("<rect");
    expect(result).toContain('fill="#ffffff"');
    expect(result).toContain("공간");
    expect(result).toContain("큐브");
    expect(result.endsWith("</svg>")).toBe(true);
  });

  it("로고 정사각형 크기는 viewBox 너비의 약 15%", () => {
    const result = injectCenterLogoIntoSvg(baseSvg);
    const widthMatch = /<rect[^>]*width="([\d.]+)"/.exec(result);
    expect(widthMatch).not.toBeNull();
    const size = parseFloat(widthMatch![1]);
    expect(size).toBeCloseTo(35 * CENTER_LOGO_RATIO, 1);
  });

  it("로고가 중앙에 위치한다(정사각형 x/y가 viewBox 중심 기준으로 대칭)", () => {
    const result = injectCenterLogoIntoSvg(baseSvg);
    const x = parseFloat(/<rect[^>]*x="([\d.]+)"/.exec(result)![1]);
    const size = parseFloat(/<rect[^>]*width="([\d.]+)"/.exec(result)![1]);
    expect(x + size / 2).toBeCloseTo(17.5, 1); // viewBox 35의 중심
  });

  it("viewBox 형식이 예상과 다르면 원본을 그대로 반환한다", () => {
    const malformed = `<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>`;
    expect(injectCenterLogoIntoSvg(malformed)).toBe(malformed);
  });

  it("커스텀 텍스트/비율을 넘기면 그대로 반영한다", () => {
    const result = injectCenterLogoIntoSvg(baseSvg, { ratio: 0.2, lines: ["가", "나"] });
    expect(result).toContain("가");
    expect(result).toContain("나");
    const size = parseFloat(/<rect[^>]*width="([\d.]+)"/.exec(result)![1]);
    expect(size).toBeCloseTo(35 * 0.2, 1);
  });
});
