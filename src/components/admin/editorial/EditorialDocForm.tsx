"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField } from "@/components/admin/ui";
import { PERSPECTIVE_LABEL, type CurationPerspectiveValue, type EditorialBlock, type EditorialStatusValue } from "@/lib/editorial/types";
import { ImageField } from "./ImageFields";
import { EditorialSaveBar } from "./EditorialControls";
import { FormSection, TextArea, TextInput } from "./FormBits";
import SpacePicker, { type LinkedSpaceValue, type SpaceOption } from "./SpacePicker";
import BlockEditor, { toBlockItems, type BlockItem } from "./BlockEditor";

export interface DocFormValue {
  number: string;
  slug: string;
  /** 큐레이션: 지역(선택) / 피플: 소개 대상(선택) / 생각: 시작 장면(선택) */
  label: string;
  /** 큐레이션 전용: 관점(SITUATION/PURPOSE), 미지정은 "" */
  perspective?: CurationPerspectiveValue | "";
  title: string;
  summary: string;
  coverImage: string | null;
  coverPosition: string | null;
  spaces: LinkedSpaceValue[];
  blocks: EditorialBlock[];
}

interface Props {
  kind: "curations" | "people" | "thoughts";
  id?: string;
  status?: EditorialStatusValue;
  initial: DocFormValue;
  spaceOptions: SpaceOption[];
}

const COPY = {
  curations: {
    numberLabel: "CURATION 번호",
    labelField: "지역",
    labelHelp: "지역 × 하나의 관점으로 운영할 때 입력하세요(예: 문래). 지역과 무관한 주제형 큐레이션이면 비워 두세요.",
    labelKey: "area",
    titlePlaceholder: "오래된 시간 위에 새로운 취향이 쌓이는 동네",
    spacesTitle: "연결 공간",
    spacesHelp: "이 큐레이션에 묶을 공간 콘텐츠입니다. 순서대로 표시됩니다.",
    publicBase: "/curation",
  },
  people: {
    numberLabel: "PEOPLE 번호",
    labelField: "소개 대상",
    labelHelp: "이름 또는 호칭(선택).",
    labelKey: "subject",
    titlePlaceholder: "한 사람을 이해하기 위해 그 사람이 머문 공간을 따라갑니다",
    spacesTitle: "이 사람이 머문 공간",
    spacesHelp: "공개 가능한 공간 콘텐츠만 연결하세요. 집·학교처럼 개인적인 장소는 본문의 '이미지 + 텍스트' 블록으로 소개합니다.",
    publicBase: "/people",
  },
  thoughts: {
    numberLabel: "THOUGHT 번호",
    labelField: "시작 장면",
    labelHelp: "이 생각이 시작된 실제 장면·장소(선택). 예: 비 오는 오후의 서점",
    labelKey: "scene",
    titlePlaceholder: "왜 어떤 공간은 오래 기억에 남을까",
    spacesTitle: "이 생각이 시작된 공간",
    spacesHelp: "글의 출발점이 된 공간 콘텐츠를 연결하세요. 추상적인 글이 아니라 장면 → 경험 → 질문 → 생각의 순서로 읽히도록 실제 장면에서 시작합니다.",
    publicBase: "/thought",
  },
} as const;

/** 저장 여부 비교용 스냅샷(블록은 내용만, 편집용 key 제외). */
function snapshot(val: Omit<DocFormValue, "blocks">, its: BlockItem[]): string {
  return JSON.stringify({ val, blocks: its.map((i) => i.block) });
}

/** 큐레이션 / PEOPLE / THOUGHT 등록·편집 — 기본 정보 + 대표 이미지 + 연결 공간 + 본문 블록. */
export default function EditorialDocForm({ kind, id, status, initial, spaceOptions }: Props) {
  const c = COPY[kind];
  const router = useRouter();
  const [v, setV] = useState<Omit<DocFormValue, "blocks">>(() => {
    const rest = { ...initial } as Partial<DocFormValue>;
    delete rest.blocks;
    return rest as Omit<DocFormValue, "blocks">;
  });
  const [items, setItems] = useState<BlockItem[]>(() => toBlockItems(initial.blocks));
  const [savedSnap, setSavedSnap] = useState(() => snapshot(v, items));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useMemo(() => snapshot(v, items) !== savedSnap, [v, items, savedSnap]);

  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }));

  async function save(): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        number: Number(v.number),
        slug: v.slug,
        [c.labelKey]: v.label,
        ...(kind === "curations" ? { perspective: v.perspective || null } : {}),
        title: v.title,
        summary: v.summary,
        coverImage: v.coverImage,
        coverPosition: v.coverPosition,
        spaces: v.spaces.map((s) => ({ spaceId: s.spaceId, note: s.note })),
        blocks: items.map((i) => i.block),
      };
      const res = await fetch(id ? `/api/admin/editorial/${kind}/${id}` : `/api/admin/editorial/${kind}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인한 뒤 저장해주세요." : data.error ?? "저장하지 못했어요.");
        return false;
      }
      setSavedSnap(snapshot(v, items));
      if (!id && data.id) router.push(`/admin/content/${kind}/${data.id}`);
      else router.refresh();
      return true;
    } catch {
      setError("네트워크 오류로 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <FormSection title="기본 정보">
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <AdminFormField label={c.numberLabel} required help="표시 번호(001 형식)">
            <TextInput type="number" value={v.number} onChange={(x) => set("number", x)} />
          </AdminFormField>
          <AdminFormField label="주소(slug)" required help={`공개 주소: ${c.publicBase}/${v.slug || "..."} — 발행 후 바꾸면 기존 링크가 끊겨요.`}>
            <TextInput value={v.slug} onChange={(x) => set("slug", x)} mono placeholder={kind === "curations" ? "mullae-new-taste" : kind === "thoughts" ? "thought-001" : "people-002"} />
          </AdminFormField>
        </div>
        <AdminFormField label={c.labelField} optional help={c.labelHelp}>
          <TextInput value={v.label} onChange={(x) => set("label", x)} />
        </AdminFormField>
        {kind === "curations" && (
          <AdminFormField label="관점" optional help="CURATION은 지역 + 상황(SITUATION) 또는 지역 + 취향·목적(PURPOSE)으로 운영합니다. 공개 큐레이션 허브의 관점 탭에 쓰여요.">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="큐레이션 관점">
              {([["", "미지정"], ["SITUATION", `${PERSPECTIVE_LABEL.SITUATION.en} · ${PERSPECTIVE_LABEL.SITUATION.ko}`], ["PURPOSE", `${PERSPECTIVE_LABEL.PURPOSE.en} · ${PERSPECTIVE_LABEL.PURPOSE.ko}`]] as const).map(([value, text]) => {
                const on = (v.perspective ?? "") === value;
                return (
                  <button
                    key={value || "none"}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("perspective", value)}
                    className={on ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </AdminFormField>
        )}
        <AdminFormField label="제목" required>
          <TextInput value={v.title} onChange={(x) => set("title", x)} placeholder={c.titlePlaceholder} />
        </AdminFormField>
        <AdminFormField label="요약" required help="목록 카드와 상세 상단에 보이는 짧은 소개입니다.">
          <TextArea value={v.summary} onChange={(x) => set("summary", x)} rows={3} />
        </AdminFormField>
      </FormSection>

      <FormSection title="대표 이미지">
        <ImageField value={v.coverImage} onChange={(url) => set("coverImage", url)} />
      </FormSection>

      <FormSection title={c.spacesTitle} description={c.spacesHelp}>
        <SpacePicker options={spaceOptions} value={v.spaces} onChange={(s) => set("spaces", s)} />
      </FormSection>

      <FormSection title="본문" description="블록을 쌓아 글을 구성합니다. 본문에 '공간 카드' 블록이 없으면 상세 페이지 하단에 연결 공간이 카드로 표시됩니다.">
        <BlockEditor value={items} onChange={setItems} spaceOptions={spaceOptions} />
      </FormSection>

      <EditorialSaveBar
        kind={kind}
        id={id}
        status={status}
        publicHref={id ? `${c.publicBase}/${JSON.parse(savedSnap).val.slug}` : undefined}
        dirty={dirty}
        saving={saving}
        onSave={save}
        error={error}
      />
    </div>
  );
}
