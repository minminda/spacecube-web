/* ── 작성 중 초안 → 공개 렌더러 입력(순수 함수) ─────────────────────────────────
   관리자 실시간 미리보기는 공개 상세 페이지와 "같은 렌더러"(StoryArticle · CurationArticle · BlockRenderer)에
   폼 상태를 그대로 넣는다. 이 모듈은 그 변환만 맡는다 — DB에 임시 저장하지 않는다.
   - 공개 페이지도 같은 머리줄(eyebrow) 함수를 쓰므로 미리보기와 공개 화면의 표기가 갈라지지 않는다.
   - 빈 칸 안내 문구("제목을 입력해주세요" 등)는 previewPlaceholders일 때만 넣는다 — 공개 화면에는 절대 쓰지 않는다.
   - 작성 중인 미완성 블록(빈 소제목, 주소 없는 이미지 등)은 공개 화면과 같은 규칙(readStoredBlocks)으로 걸러
     렌더러가 깨지지 않게 한다. 빈 소제목·인용은 미리보기에서만 안내 문구로 자리를 보여준다.
   - 공개 화면처럼 발행된 공간만 보여준다(초안 공간은 독자에게 안 보이므로 미리보기에서도 빠진다). ── */

import { readStoredBlocks } from "./input";
import {
  PERSPECTIVE_LABEL, formatSerial,
  type CurationPerspectiveValue, type EditorialBlock, type LinkedSpace, type ResolvedImage, type SpaceView,
} from "./types";

/* ── 공개 페이지와 공용: 머리줄 ──
   상세 머리줄은 유형을 빼고 번호부터 쓴다 — 바로 위 뒤로가기 링크(← PEOPLE · ← CURATION 등)가 이미 유형을 말해 준다. */

export function peopleEyebrow(number: number, subject?: string | null, role?: string | null): string {
  return [formatSerial(number), subject, role].filter(Boolean).join(" · ");
}

export function thoughtEyebrow(number: number, scene?: string | null): string {
  return `${formatSerial(number)}${scene ? ` · ${scene}` : ""}`;
}

export function curationEyebrowLine(number: number, perspective?: CurationPerspectiveValue | null): string {
  return `${formatSerial(number)}${perspective ? ` · ${PERSPECTIVE_LABEL[perspective].en} · ${PERSPECTIVE_LABEL[perspective].ko}` : ""}`;
}

/** "공간 3곳" — 지역은 머리줄 · 큰 제목이 이미 보여 주므로 여기서 다시 쓰지 않는다. */
export function curationSpaceCountLabel(count: number): string {
  return `공간 ${count}곳`;
}

/* ── 초안 입력 ── */

export type DraftKind = "people" | "thoughts" | "curations";

export interface DraftInput {
  kind: DraftKind;
  number: string;
  /** 큐레이션: 지역 / 피플: 인터뷰이 / 생각: 시작 장면 */
  label: string;
  perspective?: CurationPerspectiveValue | "";
  subjectRole?: string;
  title: string;
  summary: string;
  coverImage: string | null;
  coverPosition: string | null;
  /** 폼의 연결 공간(순서·메모) */
  spaces: { spaceId: string; note: string }[];
  /** 작성 중 블록(미완성 포함) */
  blocks: unknown[];
  /** 발행된 글이면 공개 화면의 날짜 표기(초안은 비움) */
  date?: string;
}

export const PREVIEW_PLACEHOLDER = {
  title: "제목을 입력해주세요",
  summary: "요약을 입력해주세요",
  curationSummary: "한 줄 선정 기준을 입력해주세요",
  heading: "소제목",
  quote: "인용문을 입력해주세요",
  body: "본문을 작성해주세요",
} as const;

/** 미리보기에서만: 빈 소제목·인용·문단은 자리만 보이게 안내 문구로(공개 화면에는 쓰지 않는다). */
function fillPlaceholders(raw: unknown[]): unknown[] {
  return raw.map((b) => {
    if (!b || typeof b !== "object") return b;
    const o = b as Record<string, unknown>;
    const empty = typeof o.text !== "string" || !o.text.trim();
    if (o.type === "HEADING" && empty) return { ...o, text: PREVIEW_PLACEHOLDER.heading };
    if (o.type === "QUOTE" && empty) return { ...o, text: PREVIEW_PLACEHOLDER.quote };
    return o;
  });
}

/** 공개 화면 규칙과 같은 블록 정리 — 미완성 블록은 빠진다. placeholders면 빈 소제목·인용 자리를 안내 문구로. */
export function draftBlocks(raw: unknown[], opts: { placeholders: boolean }): EditorialBlock[] {
  const blocks = readStoredBlocks(opts.placeholders ? fillPlaceholders(raw) : raw);
  if (opts.placeholders && blocks.length === 0) return [{ type: "TEXT", text: PREVIEW_PLACEHOLDER.body }];
  return blocks;
}

/** 연결 공간 → 공개 렌더러의 LinkedSpace(발행된 공간만, 폼 순서 그대로). */
export function draftLinkedSpaces(spaces: DraftInput["spaces"], views: Record<string, SpaceView>): LinkedSpace[] {
  return spaces.flatMap((s) => {
    const v = views[s.spaceId];
    return v ? [{ space: v, note: s.note.trim() || undefined }] : [];
  });
}

/** 본문 공간 카드(SPACE_CARD)가 가리키는 공간 — 공개 페이지의 getBlockSpaces와 같은 역할. */
export function draftBlockSpaces(blocks: EditorialBlock[], views: Record<string, SpaceView>): Map<string, SpaceView> {
  const m = new Map<string, SpaceView>();
  for (const b of blocks) if (b.type === "SPACE_CARD" && views[b.spaceId]) m.set(b.spaceId, views[b.spaceId]);
  return m;
}

function draftCover(d: DraftInput, alt: string): ResolvedImage {
  return { src: d.coverImage, alt, position: d.coverPosition ?? undefined };
}

const num = (s: string) => (Number.isInteger(Number(s)) && Number(s) > 0 ? Number(s) : 0);

/** STORY(PEOPLE · THOUGHT) 초안 → StoryArticle 입력(관련 이야기 목록은 미리보기에서 생략). */
export function storyArticleFromDraft(d: DraftInput, views: Record<string, SpaceView>, opts: { placeholders: boolean }) {
  const people = d.kind === "people";
  const title = d.title.trim() || (opts.placeholders ? PREVIEW_PLACEHOLDER.title : "");
  const blocks = draftBlocks(d.blocks, opts);
  return {
    backHref: people ? "/story?type=people" : "/story?type=thought",
    backLabel: people ? "PEOPLE" : "THOUGHT",
    eyebrow: people ? peopleEyebrow(num(d.number), d.label.trim(), d.subjectRole?.trim()) : thoughtEyebrow(num(d.number), d.label.trim()),
    title,
    summary: d.summary.trim() || (opts.placeholders ? PREVIEW_PLACEHOLDER.summary : ""),
    date: d.date,
    cover: draftCover(d, title),
    blocks,
    blockSpaces: draftBlockSpaces(blocks, views),
    spaces: draftLinkedSpaces(d.spaces, views),
    spacesLabel: people ? "이 사람이 머문 공간" : "이 생각이 시작된 공간",
    related: [],
  };
}

/** CURATION 초안 → CurationArticle 입력. */
export function curationArticleFromDraft(d: DraftInput, views: Record<string, SpaceView>, opts: { placeholders: boolean }) {
  const title = d.title.trim() || (opts.placeholders ? PREVIEW_PLACEHOLDER.title : "");
  const area = d.label.trim() || null;
  const spaces = draftLinkedSpaces(d.spaces, views);
  const blocks = readStoredBlocks(opts.placeholders ? fillPlaceholders(d.blocks) : d.blocks);
  return {
    eyebrow: curationEyebrowLine(num(d.number), d.perspective || null),
    area,
    title,
    summary: d.summary.trim() || (opts.placeholders ? PREVIEW_PLACEHOLDER.curationSummary : ""),
    meta: [curationSpaceCountLabel(spaces.length), d.date].filter(Boolean).join(" · "),
    cover: draftCover(d, title),
    blocks,
    blockSpaces: draftBlockSpaces(blocks, views),
    spaces,
    related: [],
  };
}
