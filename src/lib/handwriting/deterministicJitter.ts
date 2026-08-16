/**
 * EXPERIMENTAL ONLY — Hybrid handwriting comparison PoC.
 * 문장을 글자 이미지/글자 span을 단순 나열하면 "글자가 따로 논다"는 문제가 있어(스펙
 * 5번), 아주 작은 회전/기준선/크기/간격 variation을 글자마다 부여한다. 같은 문장은
 * 다시 봐도 같은 레이아웃이어야 하므로(스펙 6번) 진짜 random이 아니라 (문장, 글자
 * 위치) 문자열을 시드로 쓰는 결정론적 PRNG로 계산한다.
 *
 * 시드는 mode(Original/Hybrid30/...)를 포함하지 않는다 — 4개 모드가 같은 리듬(같은
 * 위치에 같은 회전/간격)을 공유해야, 모드 간 차이가 순수하게 "글자 모양" 차이로만
 * 보이고 레이아웃 차이로 오염되지 않는다(비교 목적에 더 적합).
 */

export interface CharJitter {
  rotateDeg: number;
  baselineOffsetPx: number;
  scale: number;
  spacingPx: number;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PUNCTUATION = new Set([",", ".", "!", "?", "…", "、", "。", "'", '"']);

/** ±range 범위의 값 하나를 (sentence, index, salt) 시드로 결정론적으로 뽑는다. */
function seededRange(sentence: string, index: number, salt: string, range: number): number {
  const rand = mulberry32(hashString(`${sentence}::${index}::${salt}`));
  return (rand() * 2 - 1) * range;
}

export function charJitter(sentence: string, index: number, ch: string): CharJitter {
  const isPunct = PUNCTUATION.has(ch);
  return {
    rotateDeg: seededRange(sentence, index, "rot", 1.6),
    baselineOffsetPx: seededRange(sentence, index, "base", 2.2),
    scale: 1 + seededRange(sentence, index, "scale", 0.03),
    // 문장부호는 자간을 더 좁게 — 손글씨에서 쉼표/마침표가 앞 글자에 바짝 붙는 것과 같은 효과
    spacingPx: isPunct ? seededRange(sentence, index, "space", 0.6) : seededRange(sentence, index, "space", 1.8),
  };
}

/** 줄바꿈 시 줄마다 아주 약간의 line-height 편차 — 완전히 균일한 인쇄물처럼 보이지 않게 한다. */
export function lineHeightJitter(sentence: string, lineIndex: number): number {
  return 1 + seededRange(sentence, lineIndex, "line", 0.025);
}
