/**
 * EXPERIMENTAL ONLY — Hybrid handwriting comparison PoC.
 * "읽기 좋은 기본 손글씨" 후보 폰트: Gaegu (Google Fonts, SIL OFL 1.1 — 한글 전체 지원,
 * 상업적 이용 가능, 둥글고 정돈되어 있으면서 과하게 장식적이지 않음). next/font/google을
 * 통해 로드하므로 폰트 파일을 저장소에 직접 커밋하지 않는다 — Next.js 빌드 시 Google
 * Fonts에서 받아 자체 호스팅한다(빌드 후에는 외부 요청 없음).
 * Python 추론 서비스가 Hybrid 블렌딩용으로 rasterize하는 폰트와 반드시 같은 폰트여야
 * 한다 — handwriting-service/model/basefont.py, Dockerfile의 BASE_FONT_URL 참고.
 */
import { Gaegu } from "next/font/google";

// next/font/google only lists "latin" as a valid subset for Gaegu, but Google Fonts
// serves this particular family as a single unsplit file with no unicode-range
// restriction at all (verified: fonts.googleapis.com/css2?family=Gaegu returns one
// @font-face, no subsetting) — so "latin" here still delivers the full glyph set,
// Hangul included. The "latin" label is a metadata quirk, not an actual limitation.
export const baseHandwritingFont = Gaegu({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const BASE_FONT_NAME = "Gaegu";
export const BASE_FONT_LICENSE = "SIL Open Font License 1.1 (상업적 이용 가능)";
