/* ── HOME LATEST(Hero) 선정 — 카드 레이아웃에 맞는 이미지를 우선한다 ──────────────────
   LatestSlider의 이미지 칸은 가로형(휴대폰 16:10, 데스크톱 3:2 ≈ 1.5)이고 object-cover로 채운다. 그래서
   정사각형 · 세로형 사진은 큰 가로 카드에서 윗부분만 잘리고 크게 늘어나(업스케일) 흐려진다 → Hero 후보에서 뺀다.
   순서(lexicographic): ① 이미지 적합도(가로형 + 충분한 해상도 → 가로형이나 작음 → 크기를 모름) ② 종류 다양성(CURATION · PEOPLE · THOUGHT · SPACE가
   한쪽에 쏠리지 않게) ③ 최신순. 같은 이미지는 한 번만(콘텐츠 대표 이미지가 공간 사진과 같은 경우 포함).
   이미지 크기는 DB에 없어서, 현재 공개 대표 이미지를 한 번 실측한 표(KNOWN_SIZES, 2026-10-24)를 쓴다. 표에 없는 새 이미지는 "크기를 모름"으로 보고
   실측된 가로형 뒤에 둔다(배제하지 않는다). 새 이미지를 올린 뒤에는 이 표에 한 줄 추가하면 된다. 순수 함수. ── */

import { hasValidImageSrc } from "@/lib/editorial/imageValid";
import type { ContentItem } from "@/lib/editorial/types";

/** 파일명(경로 마지막 조각) → [가로, 세로] px. 실측: 운영 대표 이미지(Cloudinary)와 public/demo 사진. */
export const KNOWN_SIZES: Record<string, [number, number]> = {
  // 공개 공간 · 콘텐츠 대표 이미지(Cloudinary)
  "c8l0vvqi6qbmkaqfifkc.jpg": [1106, 760],
  "lcde2s2o2falistdvtlk.jpg": [1206, 829],
  "rmjcx9x8wofg1tsxol0g.jpg": [1058, 727],
  "zvimkayoogpv8ao74wjn.jpg": [810, 1081],
  "ueaomui9dbawrejjvhwk.jpg": [1067, 733],
  "rjlzpvpy36fldcxxlhrs.jpg": [1599, 2400],
  "kvhrpngliaytuasuhul3.jpg": [2278, 1566],
  "j67iasptbdir89k3qoah.jpg": [1177, 809],
  // 시연용 사진(public/demo)
  "window-afternoon.jpg": [1400, 1867],
  "notes-and-records.jpg": [900, 1829],
  "slide-room.jpg": [757, 1009],
  "water-window.jpg": [594, 937],
  "shelf-window.jpg": [900, 1200],
  "teacup-shelf.jpg": [900, 1201],
  "pen-and-postbox.jpg": [848, 1088],
  "jazz-record-shelf.jpg": [900, 1200],
  "paper-wall.jpg": [900, 1200],
  "camera-display.jpg": [900, 1200],
  "green-shelf.jpg": [900, 1200],
};

const fileOf = (src: string) => src.split("?")[0].split("/").pop() ?? src;

export function knownSize(src: string): [number, number] | null {
  return KNOWN_SIZES[fileOf(src)] ?? null;
}

/** 가로형 카드(3:2)에 쓸 수 있는 비율 범위 — 너무 세로형이거나 너무 길쭉하면 피사체가 잘린다 */
export const LANDSCAPE_MIN = 1.25;
export const LANDSCAPE_MAX = 2.2;
/** 데스크톱 이미지 칸(약 700px)을 2배 화면에서도 선명하게 채울 가로 해상도의 기준 */
export const GOOD_WIDTH = 1000;

export type LatestFit = "good" | "ok" | "unknown" | "poor";
const FIT_RANK: Record<Exclude<LatestFit, "poor">, number> = { good: 0, ok: 1, unknown: 2 };

export function latestFit(src: string | null | undefined): LatestFit | "none" {
  if (!hasValidImageSrc(src)) return "none";
  const size = knownSize(src);
  if (!size) return "unknown";
  const [w, h] = size;
  const r = w / h;
  if (r < LANDSCAPE_MIN || r > LANDSCAPE_MAX) return "poor";
  return w >= GOOD_WIDTH ? "good" : "ok";
}

/** HOME LATEST에 고정 노출하는 콘텐츠(이 순서 그대로). 상세 주소로 식별한다 — 발행일 · 이미지 비율 · 개인화는 순서에 영향을 주지 않는다. */
export const PINNED_LATEST_HREFS: readonly string[] = [
  "/thought/demo-conditions-to-stay",
  "/curation/demo-small-objects",
  "/curation/places-for-music",
  "/curation/mangwon-making",
  "/curation/demo-solo-afternoon",
];

/** 고정 목록 순서대로 stream에서 찾는다. 조회되지 않는 항목은 다른 콘텐츠로 대체하지 않고 missing으로 알린다. */
export function pinLatest(stream: ContentItem[], hrefs: readonly string[] = PINNED_LATEST_HREFS): { items: ContentItem[]; missing: string[] } {
  const items: ContentItem[] = [];
  const missing: string[] = [];
  for (const href of hrefs) {
    const found = stream.find((i) => i.href === href);
    if (found) items.push(found);
    else missing.push(href);
  }
  return { items, missing };
}

/** stream: 최신순으로 정렬된 콘텐츠. 최근 windowSize개 안에서 n개를 고른다(오래된 콘텐츠를 끌어올리지 않는다). */
export function pickLatest(stream: ContentItem[], n: number, windowSize = 24): ContentItem[] {
  const candidates = stream
    .slice(0, windowSize)
    .map((item, index) => ({ item, index, fit: latestFit(item.image.src) }))
    .filter((c): c is { item: ContentItem; index: number; fit: Exclude<LatestFit, "poor"> } => c.fit !== "none" && c.fit !== "poor");
  const kindCount = new Map<string, number>();
  const usedImages = new Set<string>();
  const out: ContentItem[] = [];
  const left = [...candidates];
  while (out.length < n && left.length > 0) {
    let best = -1;
    for (let i = 0; i < left.length; i++) {
      if (usedImages.has(fileOf(left[i].item.image.src as string))) continue;
      if (best === -1) { best = i; continue; }
      const a = left[i];
      const b = left[best];
      const ka = kindCount.get(a.item.kind) ?? 0;
      const kb = kindCount.get(b.item.kind) ?? 0;
      if (FIT_RANK[a.fit] !== FIT_RANK[b.fit] ? FIT_RANK[a.fit] < FIT_RANK[b.fit] : ka !== kb ? ka < kb : a.index < b.index) best = i;
    }
    if (best === -1) break;
    const [c] = left.splice(best, 1);
    out.push(c.item);
    usedImages.add(fileOf(c.item.image.src as string));
    kindCount.set(c.item.kind, (kindCount.get(c.item.kind) ?? 0) + 1);
  }
  return out;
}
