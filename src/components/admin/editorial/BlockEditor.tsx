"use client";

import { useState } from "react";
import { adminButtonClass } from "@/components/admin/ui";
import { BLOCK_TYPES, type BlockImage, type EditorialBlock, type EditorialBlockType } from "@/lib/editorial/types";
import { uploadEditorialImage } from "@/lib/uploadImage";
import { ImageField } from "./ImageFields";
import { TextArea, TextInput } from "./FormBits";
import type { SpaceOption } from "./SpacePicker";

/* ── 본문 블록 편집기(최소 기능) ─────────────────────────────────────────
   + 블록 추가 → 종류 선택, 각 블록은 ↑↓·삭제·필드 편집. 드래그 앤 드롭·인라인 서식은 없다.
   저장 시 서버(parseBlocks)가 최종 검증한다 — 여기서는 편집 편의만 담당. ── */

export interface BlockItem {
  key: string;
  block: EditorialBlock;
}

let seq = 0;
export function toBlockItems(blocks: EditorialBlock[]): BlockItem[] {
  return blocks.map((block) => ({ key: `b${++seq}`, block }));
}

function emptyBlock(type: EditorialBlockType): EditorialBlock {
  switch (type) {
    case "TEXT": return { type, text: "" };
    case "HEADING": return { type, text: "" };
    case "IMAGE": return { type, image: { url: "" } };
    case "IMAGE_TEXT": return { type, image: { url: "" }, title: "", text: "" };
    case "GALLERY": return { type, images: [] };
    case "QUOTE": return { type, text: "" };
    case "QNA": return { type, items: [{ q: "", a: "" }] };
    case "SPACE_CARD": return { type, spaceId: "" };
    case "DIVIDER": return { type };
  }
}

const LABEL = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.label])) as Record<EditorialBlockType, string>;

export default function BlockEditor({ value, onChange, spaceOptions }: { value: BlockItem[]; onChange: (v: BlockItem[]) => void; spaceOptions: SpaceOption[] }) {
  const [menuAt, setMenuAt] = useState<number | null>(null); // 이 인덱스 뒤에 추가(-1 = 맨 앞)

  function insert(at: number, type: EditorialBlockType) {
    const next = [...value];
    next.splice(at + 1, 0, { key: `b${++seq}`, block: emptyBlock(type) });
    onChange(next);
    setMenuAt(null);
  }
  function update(i: number, block: EditorialBlock) {
    onChange(value.map((it, k) => (k === i ? { ...it, block } : it)));
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  const addMenu = (at: number) =>
    menuAt === at ? (
      <div className="a-card p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {BLOCK_TYPES.map((t) => (
          <button key={t.type} type="button" onClick={() => insert(at, t.type)} className="text-left rounded-md px-3 py-2 hover:bg-[var(--a-soft)]">
            <span className="block text-[13px] font-medium">{t.label}</span>
            {t.description && <span className="block text-[11px]" style={{ color: "var(--a-dim)" }}>{t.description}</span>}
          </button>
        ))}
        <button type="button" onClick={() => setMenuAt(null)} className={`${adminButtonClass("ghost", "sm")} col-span-full justify-self-end`}>닫기</button>
      </div>
    ) : (
      <button type="button" onClick={() => setMenuAt(at)} className={adminButtonClass("secondary", "sm")}>+ 블록 추가</button>
    );

  return (
    <div className="space-y-3">
      {value.length === 0 && <p className="text-xs" style={{ color: "var(--a-dim)" }}>본문이 비어 있어요. 블록을 추가해 글을 구성하세요.</p>}
      {value.map((item, i) => (
        <div key={item.key} className="space-y-3">
          <div className="a-card">
            <div className="flex items-center justify-between gap-2 px-4 py-2" style={{ borderBottom: item.block.type === "DIVIDER" ? undefined : "1px solid var(--a-line)" }}>
              <p className="text-xs font-semibold">
                <span className="tabular-nums mr-2" style={{ color: "var(--a-faint)" }}>{i + 1}</span>
                {LABEL[item.block.type]}
              </p>
              <span className="flex gap-0.5">
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="아래로">↓</button>
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="블록 삭제">삭제</button>
              </span>
            </div>
            {item.block.type !== "DIVIDER" && (
              <div className="p-4 space-y-3">
                <BlockFields block={item.block} onChange={(b) => update(i, b)} spaceOptions={spaceOptions} />
              </div>
            )}
          </div>
          {i === value.length - 1 ? null : menuAt === i ? addMenu(i) : null}
        </div>
      ))}
      {addMenu(value.length - 1)}
    </div>
  );
}

function Small({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>{children}</p>;
}

function BlockImageInput({ value, onChange }: { value: BlockImage; onChange: (v: BlockImage) => void }) {
  return (
    <div className="space-y-2">
      <ImageField
        value={value.url || null}
        onChange={(url, meta) => onChange(url ? { ...value, url, width: meta?.width, height: meta?.height } : { ...value, url: "", width: undefined, height: undefined })}
      />
      <TextInput value={value.caption ?? ""} onChange={(x) => onChange({ ...value, caption: x })} placeholder="캡션(선택)" />
    </div>
  );
}

function GalleryInput({ value, onChange }: { value: BlockImage[]; onChange: (v: BlockImage[]) => void }) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  async function add(files: File[]) {
    const list = files.slice(0, Math.max(0, 12 - value.length));
    if (!list.length) return;
    setError(null);
    setUploading(list.length);
    const added: BlockImage[] = [];
    for (const f of list) {
      try {
        const up = await uploadEditorialImage(f);
        added.push({ url: up.url, width: up.width, height: up.height });
      } catch (e) {
        setError(e instanceof Error ? e.message : "일부 사진 업로드에 실패했어요.");
      }
      setUploading((n) => n - 1);
    }
    onChange([...value, ...added]);
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((im, i) => (
            <li key={`${im.url}-${i}`} className="space-y-1.5">
              <div className="relative overflow-hidden rounded-md border" style={{ borderColor: "var(--a-line)", aspectRatio: "1 / 1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <input value={im.caption ?? ""} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))} placeholder="캡션" className="a-input" style={{ height: 30, fontSize: 12 }} />
              <span className="flex gap-0.5 justify-end">
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로">↑</button>
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="뒤로">↓</button>
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="삭제">✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <label className={`${adminButtonClass("secondary", "sm")} cursor-pointer`}>
        {uploading > 0 ? `업로드 중... (${uploading})` : "+ 사진 추가"}
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading > 0} onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; add(f); }} />
      </label>
      {error && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</p>}
    </div>
  );
}

function BlockFields({ block, onChange, spaceOptions }: { block: EditorialBlock; onChange: (b: EditorialBlock) => void; spaceOptions: SpaceOption[] }) {
  switch (block.type) {
    case "TEXT":
      return (
        <>
          <TextArea value={block.text} onChange={(x) => onChange({ ...block, text: x })} rows={6} placeholder="빈 줄로 문단을 나눕니다." />
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-dim)" }}>
            <input type="checkbox" checked={!!block.small} onChange={(e) => onChange({ ...block, small: e.target.checked || undefined })} />
            작은 글씨(부연 설명·캡션)
          </label>
        </>
      );
    case "HEADING":
      return <TextInput value={block.text} onChange={(x) => onChange({ ...block, text: x })} placeholder="소제목" />;
    case "QUOTE":
      return (
        <>
          <TextArea value={block.text} onChange={(x) => onChange({ ...block, text: x })} rows={2} placeholder="강조할 문장" />
          <TextInput value={block.cite ?? ""} onChange={(x) => onChange({ ...block, cite: x })} placeholder="출처·말한 사람(선택)" />
        </>
      );
    case "IMAGE":
      return (
        <>
          <BlockImageInput value={block.image} onChange={(image) => onChange({ ...block, image })} />
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-dim)" }}>
            <input type="checkbox" checked={!!block.wide} onChange={(e) => onChange({ ...block, wide: e.target.checked || undefined })} />
            넓게(본문 폭보다 크게)
          </label>
        </>
      );
    case "IMAGE_TEXT":
      return (
        <>
          <BlockImageInput value={block.image} onChange={(image) => onChange({ ...block, image })} />
          <TextInput value={block.title ?? ""} onChange={(x) => onChange({ ...block, title: x })} placeholder="제목(선택) — 예: 집, 학교 운동장" />
          <TextArea value={block.text} onChange={(x) => onChange({ ...block, text: x })} rows={4} placeholder="설명" />
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-dim)" }}>
            <input type="checkbox" checked={!!block.reverse} onChange={(e) => onChange({ ...block, reverse: e.target.checked || undefined })} />
            사진을 오른쪽에
          </label>
        </>
      );
    case "GALLERY":
      return <GalleryInput value={block.images} onChange={(images) => onChange({ ...block, images })} />;
    case "QNA":
      return (
        <div className="space-y-3">
          {block.items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-md p-3" style={{ background: "var(--a-soft)" }}>
              <div className="flex items-center justify-between">
                <Small>질문 {i + 1}</Small>
                <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== i) })} disabled={block.items.length === 1}>삭제</button>
              </div>
              <TextInput value={it.q} onChange={(x) => onChange({ ...block, items: block.items.map((y, k) => (k === i ? { ...y, q: x } : y)) })} placeholder="질문" />
              <TextArea value={it.a} onChange={(x) => onChange({ ...block, items: block.items.map((y, k) => (k === i ? { ...y, a: x } : y)) })} rows={3} placeholder="답변" />
            </div>
          ))}
          <button type="button" className={adminButtonClass("secondary", "sm")} onClick={() => onChange({ ...block, items: [...block.items, { q: "", a: "" }] })}>+ 질문 추가</button>
        </div>
      );
    case "SPACE_CARD":
      return (
        <>
          <select value={block.spaceId} onChange={(e) => onChange({ ...block, spaceId: e.target.value })} className="a-input">
            <option value="">공간 콘텐츠 선택</option>
            {spaceOptions.filter((o) => o.status !== "ARCHIVED" || o.id === block.spaceId).map((o) => (
              <option key={o.id} value={o.id}>{o.name} · {o.area}{o.status !== "PUBLISHED" ? ` (${o.status === "DRAFT" ? "초안" : "보관"})` : ""}</option>
            ))}
          </select>
          <TextInput value={block.note ?? ""} onChange={(x) => onChange({ ...block, note: x })} placeholder="카드에 붙일 설명(선택, 비우면 공간 한 줄 소개)" />
          <Small>발행되지 않은 공간은 공개 화면에서 이 카드가 표시되지 않아요.</Small>
        </>
      );
    case "DIVIDER":
      return null;
  }
}
