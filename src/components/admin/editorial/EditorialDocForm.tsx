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
import { StageControl } from "./PipelineControls";
import { LivePreviewPane, LivePreviewSheet } from "./LivePreview";
import type { PreviewPayload } from "@/components/editorial/EditorialPreviewFrame";
import type { SpaceView } from "@/lib/editorial/types";
import { EDITORIAL_PRIORITIES, PRIORITY_LABEL, type EditorialPriorityValue, type EditorialStageValue } from "@/lib/editorial/pipeline";

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
  /* ── 피플 전용: 인터뷰이 ── */
  subjectRole?: string;
  subjectLink?: string;
  /* ── 제작 관리(내부 전용) ── */
  priority: EditorialPriorityValue;
  assignee: string;
  /** "YYYY-MM-DD"(KST) 또는 "" */
  scheduledAt: string;
  /** 한 줄에 하나 */
  referenceLinks: string;
  internalNote: string;
  instagramSummary: string;
}

interface Props {
  kind: "curations" | "people" | "thoughts";
  id?: string;
  status?: EditorialStatusValue;
  initial: DocFormValue;
  spaceOptions: SpaceOption[];
  /** 현재 제작 단계(보관이면 null) — 서버가 내려준다(effectiveStage) */
  stage?: EditorialStageValue | null;
  /** 큐레이션 지역 선택지 — canonical 공간(EditorialSpace)의 정규화된 지역 */
  areaOptions?: string[];
  /** 담당자 입력 제안 */
  assigneeOptions?: string[];
  /** 실시간 미리보기용 공개 공간 정보(발행 공간, 공개 렌더러의 SpaceView) */
  previewSpaces?: Record<string, SpaceView>;
  /** 발행된 글이면 공개 화면의 날짜 표기 */
  publishedDate?: string;
}

const COPY = {
  curations: {
    numberLabel: "CURATION 번호",
    labelField: "지역",
    labelHelp: "공간 콘텐츠에 등록된 지역(정규화된 이름)에서 고릅니다. 발행할 때 필수예요.",
    labelKey: "area",
    titlePlaceholder: "오래된 시간 위에 새로운 취향이 쌓이는 동네",
    spacesTitle: "포함 공간",
    spacesHelp: "공간큐브 공간(canonical)에서 검색해 고릅니다 — 이름을 직접 입력하지 않아요. 순서대로 표시되고, 공간마다 선정 이유를 한 줄 적어주세요. 발행하려면 1곳 이상.",
    publicBase: "/curation",
  },
  people: {
    numberLabel: "PEOPLE 번호",
    labelField: "인터뷰이",
    labelHelp: "이름 또는 호칭(선택).",
    labelKey: "subject",
    titlePlaceholder: "한 사람을 이해하기 위해 그 사람이 머문 공간을 따라갑니다",
    spacesTitle: "이 사람이 머문 공간",
    spacesHelp: "공간큐브 공간(canonical)에서 검색해 고릅니다(0곳도 가능). 집·학교처럼 개인적인 장소는 본문의 '이미지 + 텍스트' 블록으로 소개합니다.",
    publicBase: "/people",
  },
  thoughts: {
    numberLabel: "THOUGHT 번호",
    labelField: "시작 장면",
    labelHelp: "이 생각이 시작된 실제 장면·장소(선택). 예: 비 오는 오후의 서점",
    labelKey: "scene",
    titlePlaceholder: "왜 어떤 공간은 오래 기억에 남을까",
    spacesTitle: "이 생각이 시작된 공간",
    spacesHelp: "글의 출발점이 된 공간을 공간큐브 공간(canonical)에서 검색해 연결하세요(0곳도 가능). 추상적인 글이 아니라 장면 → 경험 → 질문 → 생각의 순서로 읽히도록 실제 장면에서 시작합니다.",
    publicBase: "/thought",
  },
} as const;

/** 저장 여부 비교용 스냅샷(블록은 내용만, 편집용 key 제외). */
function snapshot(val: Omit<DocFormValue, "blocks">, its: BlockItem[]): string {
  return JSON.stringify({ val, blocks: its.map((i) => i.block) });
}

/** 큐레이션 / PEOPLE / THOUGHT 등록·편집 — 기본 정보 + 대표 이미지 + 연결 공간 + 본문 블록. */
export default function EditorialDocForm({ kind, id, status, initial, spaceOptions, stage = null, areaOptions = [], assigneeOptions = [], previewSpaces = {}, publishedDate }: Props) {
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
        ...(kind === "people" ? { subjectRole: v.subjectRole ?? "", subjectLink: v.subjectLink ?? "" } : {}),
        priority: v.priority,
        assignee: v.assignee,
        scheduledAt: v.scheduledAt,
        referenceLinks: v.referenceLinks.split(/\s+/).filter(Boolean),
        internalNote: v.internalNote,
        instagramSummary: v.instagramSummary,
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

  // 실시간 미리보기 — 저장하지 않은 폼 상태를 그대로 공개 렌더러에 넘긴다(DB에 임시 저장하지 않음).
  // Instagram 요약·내부 메모 같은 운영 정보는 공개 화면 요소가 아니므로 보내지 않는다.
  const previewPayload = useMemo<PreviewPayload>(() => {
    const blocks = items.map((i) => i.block);
    const ids = new Set([...v.spaces.map((s) => s.spaceId), ...blocks.flatMap((b) => (b.type === "SPACE_CARD" ? [b.spaceId] : []))]);
    return {
      draft: {
        kind, number: v.number, label: v.label, perspective: v.perspective, subjectRole: v.subjectRole,
        title: v.title, summary: v.summary, coverImage: v.coverImage, coverPosition: v.coverPosition,
        spaces: v.spaces, blocks, date: status === "PUBLISHED" ? publishedDate : undefined,
      },
      views: Object.fromEntries([...ids].flatMap((sid) => (previewSpaces[sid] ? [[sid, previewSpaces[sid]]] : []))),
    };
  }, [kind, v, items, status, publishedDate, previewSpaces]);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] lg:gap-8 lg:items-start">
    <div className="flex flex-col gap-8 max-w-3xl lg:max-w-none min-w-0">
      <LivePreviewSheet payload={previewPayload} published={status === "PUBLISHED"} />
      <FormSection title="제작 관리" description="내부 전용 — 공개 화면에는 나오지 않아요. 공개 여부는 “발행” 단계(또는 아래 발행하기)로만 바뀝니다.">
        <AdminFormField label="제작 단계">
          <StageControl kind={kind} id={id} stage={stage} archived={status === "ARCHIVED"} dirty={dirty} onSave={save} />
        </AdminFormField>
        <div className="grid gap-5 sm:grid-cols-3">
          <AdminFormField label="우선순위">
            <div className="flex gap-1.5" role="radiogroup" aria-label="우선순위">
              {EDITORIAL_PRIORITIES.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={v.priority === p} onClick={() => set("priority", p)} className={v.priority === p ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </AdminFormField>
          <AdminFormField label="담당자" optional>
            <input value={v.assignee} onChange={(e) => set("assignee", e.target.value)} list="editorial-assignees" className="a-input" placeholder="이름" />
            <datalist id="editorial-assignees">{assigneeOptions.map((a) => <option key={a} value={a} />)}</datalist>
          </AdminFormField>
          <AdminFormField label="발행 예정일" optional help="자동 발행은 없어요 — 날짜가 지나면 백로그에 표시됩니다.">
            <input type="date" value={v.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} className="a-input" />
          </AdminFormField>
        </div>
        <AdminFormField label="참고 링크" optional help="한 줄에 하나(Instagram, 웹사이트, 기사, 공간 홈페이지). 최대 10개.">
          <TextArea value={v.referenceLinks} onChange={(x) => set("referenceLinks", x)} rows={2} placeholder="https://" />
        </AdminFormField>
        <AdminFormField label="내부 메모" optional help={kind === "people" ? "섭외 진행 상황, 인터뷰 예정일, 인터뷰이 검수 상태 등." : "제작 메모, 검수 의견 등."}>
          <TextArea value={v.internalNote} onChange={(x) => set("internalNote", x)} rows={3} />
        </AdminFormField>
      </FormSection>

      <FormSection title="기본 정보">
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <AdminFormField label={c.numberLabel} required help="표시 번호(001 형식)">
            <TextInput type="number" value={v.number} onChange={(x) => set("number", x)} />
          </AdminFormField>
          <AdminFormField label="주소(slug)" required help={`공개 주소: ${c.publicBase}/${v.slug || "..."} — 발행 후 바꾸면 기존 링크가 끊겨요.`}>
            <TextInput value={v.slug} onChange={(x) => set("slug", x)} mono placeholder={kind === "curations" ? "mullae-new-taste" : kind === "thoughts" ? "thought-001" : "people-002"} />
          </AdminFormField>
        </div>
        {kind === "curations" ? (
          <AdminFormField label={c.labelField} required help={c.labelHelp}>
            <select value={v.label} onChange={(e) => set("label", e.target.value)} className="a-input max-w-xs">
              <option value="">지역 선택</option>
              {[...new Set([...areaOptions, ...(v.label ? [v.label] : [])])].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </AdminFormField>
        ) : (
          <AdminFormField label={c.labelField} optional help={c.labelHelp}>
            <TextInput value={v.label} onChange={(x) => set("label", x)} />
          </AdminFormField>
        )}
        {kind === "people" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminFormField label="역할 · 직함" optional>
              <TextInput value={v.subjectRole ?? ""} onChange={(x) => set("subjectRole", x)} placeholder="북눅 연남 운영자" />
            </AdminFormField>
            <AdminFormField label="Instagram · 외부 링크" optional>
              <TextInput value={v.subjectLink ?? ""} onChange={(x) => set("subjectLink", x)} placeholder="https://www.instagram.com/..." />
            </AdminFormField>
          </div>
        )}
        {kind === "curations" && (
          <AdminFormField label="관점" optional help="REGION(지역만) · 지역 × 상황(SITUATION) · 지역 × 취향·목적(PURPOSE). 공개 큐레이션 허브의 관점 탭에 쓰여요.">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="큐레이션 관점">
              {([["", "REGION · 지역만"], ["SITUATION", `${PERSPECTIVE_LABEL.SITUATION.en} · ${PERSPECTIVE_LABEL.SITUATION.ko}`], ["PURPOSE", `${PERSPECTIVE_LABEL.PURPOSE.en} · ${PERSPECTIVE_LABEL.PURPOSE.ko}`]] as const).map(([value, text]) => {
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
        <AdminFormField
          label={kind === "curations" ? "한 줄 선정 기준" : "한 줄 소개"}
          required
          help={kind === "curations" ? "이 공간들을 고른 기준 한 문장 — 목록 카드·상세 상단에 보입니다. 예: 사람이 많아도 혼자 있는 시간이 어색하지 않은 곳" : "목록 · 홈 · SNS 소개에 쓰는 짧은 문장. 발행할 때 필수예요."}
        >
          <TextArea value={v.summary} onChange={(x) => set("summary", x)} rows={2} />
        </AdminFormField>
      </FormSection>

      <FormSection title="대표 이미지" description="발행할 때 필수예요.">
        <ImageField value={v.coverImage} onChange={(url) => set("coverImage", url)} />
      </FormSection>

      <FormSection title={c.spacesTitle} description={c.spacesHelp}>
        <SpacePicker options={spaceOptions} value={v.spaces} onChange={(s) => set("spaces", s)} notePlaceholder={kind === "curations" ? "선정 이유 한 줄 (예: 예약제라 혼자 머무는 시간이 방해받지 않아요)" : undefined} />
      </FormSection>

      <FormSection title="본문" description="블록을 쌓아 글을 구성합니다. 본문에 '공간 카드' 블록이 없으면 상세 페이지 하단에 연결 공간이 카드로 표시됩니다.">
        <BlockEditor value={items} onChange={setItems} spaceOptions={spaceOptions} />
      </FormSection>

      <FormSection title="Instagram 요약" description="웹 원문을 발행한 뒤 인스타그램 게시용 초안을 여기에 보관합니다(자동 업로드 없음 · 내부 전용).">
        <TextArea value={v.instagramSummary} onChange={(x) => set("instagramSummary", x)} rows={5} placeholder="캡션 초안" />
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
    <LivePreviewPane payload={previewPayload} published={status === "PUBLISHED"} />
    </div>
  );
}
