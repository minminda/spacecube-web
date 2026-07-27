import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";

const SRC = path.resolve("node_modules/pretendard/dist/public/static/alternative/Pretendard-ExtraBold.ttf");
const OUT = path.resolve("src/lib/brandFont.generated.ts");
const CHARS = "공간큐브"; // "공간큐브" 브랜드 캡션에 실제로 쓰이는 글자만 남겨 폰트 용량을 최소화

const buf = fs.readFileSync(SRC);
const subset = await subsetFont(buf, CHARS, { targetFormat: "sfnt" });
const base64 = subset.toString("base64");

const content = `// 자동 생성 파일 — scripts/gen-brand-font.mjs 로 재생성한다. 직접 수정하지 말 것.
// Pretendard ExtraBold를 "${CHARS}" 글자만 남기고 subset한 TTF(base64). 스티커 PDF의
// "공간큐브" 브랜드 캡션에만 쓰는 최소 용량 벡터 한글 폰트.
export const BRAND_FONT_BASE64 = "${base64}";
`;

fs.writeFileSync(OUT, content);
console.log(`generated ${OUT} (${(base64.length / 1024).toFixed(1)}KB base64, source ttf ${(buf.length / 1024).toFixed(1)}KB)`);
