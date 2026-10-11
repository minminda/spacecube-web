"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField } from "@/components/admin/ui";
import type { EditorialBlock, EditorialStatusValue } from "@/lib/editorial/types";
import BlockEditor, { toBlockItems, type BlockItem } from "./BlockEditor";
import { ImageField, ImageListField } from "./ImageFields";
import { EditorialSaveBar } from "./EditorialControls";
import { FormSection, TextArea, TextInput } from "./FormBits";
import { sameArea } from "@/lib/editorial/area";
import { adviseTags, missingSpaceInfo, RECOMMENDED_TAGS } from "@/lib/editorial/spaceQuality";

export interface SpaceFormValue {
  slug: string;
  name: string;
  area: string;
  category: string;
  summary: string;
  description: string;
  coverImage: string | null;
  coverPosition: string | null;
  images: string[];
  tags: string;
  address: string;
  openingHours: string;
  mapUrl: string;
  instagram: string;
  website: string;
  cubeAvailable: boolean;
  /** 함께한 공간의 운영자 전체 이야기(블록) */
  story: EditorialBlock[];
}

export const EMPTY_SPACE: SpaceFormValue = {
  slug: "", name: "", area: "", category: "", summary: "", description: "",
  coverImage: null, coverPosition: null, images: [], tags: "",
  address: "", openingHours: "", mapUrl: "", instagram: "", website: "", cubeAvailable: false, story: [],
};

interface Props {
  id?: string;
  status?: EditorialStatusValue;
  initial: SpaceFormValue;
  /** 선택 가능한 태그 — 관리자 태그 관리(정본)의 활성 태그를 분류별로. 같은 태그를 쓰면 방문·저장 취향이 이 공간 추천으로 이어진다. */
  tagGroups?: { category: string; tags: string[] }[];
  /** 관리자에 등록된 지역 이름들 */
  regionSuggestions?: string[];
  /** 유형 제안 — 이미 등록된 공간의 유형. 새 유형을 늘리기 전에 기존 말을 먼저 고르게 한다. */
  typeSuggestions?: string[];
}

function splitTags(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

/** 공간 등록/편집 — 공개 공간 상세(/spaces/[slug])에 쓰이는 공간(운영 공간과 별개). */
export default function EditorialSpaceForm({ id, status, initial, tagGroups = [], regionSuggestions = [], typeSuggestions = [] }: Props) {
  const router = useRouter();
  const [v, setV] = useState<SpaceFormValue>(initial);
  const [storyItems, setStoryItems] = useState<BlockItem[]>(() => toBlockItems(initial.story));
  const [saved, setSaved] = useState<SpaceFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useMemo(() => ({ ...v, story: storyItems.map((i) => i.block) }), [v, storyItems]);
  const dirty = useMemo(() => JSON.stringify(current) !== JSON.stringify(saved), [current, saved]);
  const chosenTags = splitTags(v.tags);
  const tagSuggestions = useMemo(() => [...new Set(tagGroups.flatMap((g) => g.tags))], [tagGroups]);
  const tagAdvice = adviseTags(chosenTags, tagSuggestions);
  const [tagQuery, setTagQuery] = useState("");
  // 정본 목록에 없는 기존 태그 — 지우지 않고 보여주되 해제만 할 수 있다
  const legacyTags = chosenTags.filter((t) => !tagSuggestions.includes(t));
  const areaTrim = v.area.trim();
  const areaKnown = regionSuggestions.length === 0 || !areaTrim || regionSuggestions.some((r) => sameArea(r, areaTrim));
  const missing = missingSpaceInfo({ ...v, tags: chosenTags });
  const newType = !!v.category.trim() && typeSuggestions.length > 0 && !typeSuggestions.includes(v.category.trim());
  const publishAdvice = missing.length > 0 ? `이 공간은 검색 · 추천 품질을 위해 다음 정보를 보완하는 것을 권장합니다: ${missing.join(", ")}` : null;
  const toggleTag = (name: string) => {
    const has = chosenTags.includes(name);
    set("tags", (has ? chosenTags.filter((t) => t !== name) : [...chosenTags, name]).join(", "));
  };

  const set = <K extends keyof SpaceFormValue>(key: K, value: SpaceFormValue[K]) => setV((prev) => ({ ...prev, [key]: value }));

  async function save(): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...current, tags: splitTags(v.tags) };
      const res = await fetch(id ? `/api/admin/editorial/spaces/${id}` : "/api/admin/editorial/spaces", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인한 뒤 저장해주세요." : data.error ?? "저장하지 못했어요.");
        return false;
      }
      setSaved(current);
      if (!id && data.id) router.push(`/admin/content/spaces/${data.id}`);
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
        <AdminFormField label="공간 이름" required>
          <TextInput value={v.name} onChange={(x) => set("name", x)} placeholder="북눅 연남" />
        </AdminFormField>
        <AdminFormField label="주소(slug)" required help={`공개 주소: /spaces/${v.slug || "..."} — 영문 소문자·숫자·하이픈. 발행 후 바꾸면 기존 링크가 끊겨요.`}>
          <TextInput value={v.slug} onChange={(x) => set("slug", x)} placeholder="booknook-yeonnam" mono />
        </AdminFormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <AdminFormField label="지역" required help="지역 관리에 등록된 지역을 고르세요.">
            <TextInput value={v.area} onChange={(x) => set("area", x)} />
            {regionSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2" aria-label="등록된 지역">
                {regionSuggestions.map((name) => {
                  const on = sameArea(name, areaTrim);
                  return (
                    <button key={name} type="button" onClick={() => set("area", name)} aria-pressed={on} className={on ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>{name}</button>
                  );
                })}
              </div>
            )}
            {!areaKnown && <p className="pt-1.5 text-[11px]" style={{ color: "#b54708" }}>지역 관리에 없는 지역이에요. 위에서 고르거나 지역 관리에서 먼저 추가해주세요.</p>}
          </AdminFormField>
          <AdminFormField label="공간 종류" required help="예: 독립서점, LP카페">
            <TextInput value={v.category} onChange={(x) => set("category", x)} />
            {typeSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2" aria-label="기존 유형 제안">
                {typeSuggestions.map((name) => (
                  <button key={name} type="button" onClick={() => set("category", name)} aria-pressed={v.category.trim() === name} className={v.category.trim() === name ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>
                    {name}
                  </button>
                ))}
              </div>
            )}
            {newType && <p className="pt-1.5 text-[11px]" style={{ color: "#b54708" }}>기존에 없는 새 유형이에요. 비슷한 유형이 있다면 위에서 골라 통일해주세요.</p>}
          </AdminFormField>
        </div>
        <AdminFormField label="한 줄 소개" optional>
          <TextInput value={v.summary} onChange={(x) => set("summary", x)} placeholder="나만의 작은 공간 하나" />
        </AdminFormField>
      </FormSection>

      <FormSection title="소개" description="빈 줄로 문단 구분 · 확인한 사실만">
        <AdminFormField label="공간 소개" optional>
          <TextArea value={v.description} onChange={(x) => set("description", x)} rows={8} />
        </AdminFormField>
        <AdminFormField label="태그" optional help={`${RECOMMENDED_TAGS.min}~${RECOMMENDED_TAGS.max}개 권장 · 눌러서 선택 / 해제. 새 태그는 태그 관리에서 먼저 추가해주세요.`}>
          <p className="text-xs pb-2" aria-live="polite" style={{ color: chosenTags.length >= RECOMMENDED_TAGS.min && chosenTags.length <= RECOMMENDED_TAGS.max ? "#1f6b43" : "var(--a-dim)" }}>
            선택됨 {chosenTags.length}개{chosenTags.length > 0 && `: ${chosenTags.join(", ")}`}
          </p>
          {tagSuggestions.length > 8 && (
            <input value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="태그 검색" aria-label="태그 검색" className="a-input mb-3" style={{ maxWidth: 220 }} />
          )}
          <div className="space-y-3">
            {tagGroups.map((g) => {
              const shown = g.tags.filter((t) => !tagQuery.trim() || t.includes(tagQuery.trim()));
              if (shown.length === 0) return null;
              return (
                <div key={g.category} className="space-y-1.5">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--a-dim)" }}>{g.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {shown.map((name) => {
                      const on = chosenTags.includes(name);
                      return (
                        <button key={name} type="button" onClick={() => toggleTag(name)} aria-pressed={on} className={on ? "a-btn a-btn-primary" : "a-btn"} style={{ height: 36 }}>
                          {on && "✓ "}{name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {tagGroups.length === 0 && <p className="text-xs" style={{ color: "#b54708" }}>선택할 수 있는 태그가 없어요. 태그 관리에서 먼저 태그를 추가해주세요.</p>}
          </div>
          {legacyTags.length > 0 && (
            <div className="pt-3 space-y-1.5">
              <p className="text-[11px] font-semibold" style={{ color: "#b54708" }}>태그 목록에 없는 기존 태그 (눌러서 해제)</p>
              <div className="flex flex-wrap gap-1.5">
                {legacyTags.map((name) => (
                  <button key={name} type="button" onClick={() => toggleTag(name)} aria-pressed className="a-btn a-btn-sm" style={{ borderColor: "#e0a030" }}>{name} ✕</button>
                ))}
              </div>
            </div>
          )}
          <ul className="pt-2 space-y-0.5 text-[11px]" style={{ color: "#b54708" }} aria-live="polite">
            {tagAdvice.count === "few" && <li>태그가 {chosenTags.length}개예요. {RECOMMENDED_TAGS.min}~{RECOMMENDED_TAGS.max}개를 권장해요.</li>}
            {tagAdvice.count === "many" && <li>태그가 {chosenTags.length}개예요. {RECOMMENDED_TAGS.max}개 이하로 줄이면 선반 · 검색 품질이 좋아져요.</li>}
            {tagAdvice.duplicates.length > 0 && <li>같은 태그가 두 번 들어 있어요: {tagAdvice.duplicates.join(", ")}</li>}
          </ul>
        </AdminFormField>
      </FormSection>

      <FormSection title="이미지">
        <AdminFormField label="대표 이미지" optional help="목록 카드와 상세 상단에 쓰입니다.">
          <ImageField value={v.coverImage} onChange={(url) => set("coverImage", url)} />
        </AdminFormField>
        <AdminFormField label="사진" optional help="상세 페이지 하단 사진 묶음(최대 20장).">
          <ImageListField value={v.images} onChange={(urls) => set("images", urls)} />
        </AdminFormField>
      </FormSection>

      <FormSection title="방문 정보">
        <AdminFormField label="주소" optional>
          <TextInput value={v.address} onChange={(x) => set("address", x)} />
        </AdminFormField>
        <AdminFormField label="운영 시간" optional>
          <TextInput value={v.openingHours} onChange={(x) => set("openingHours", x)} placeholder="매일 12:00 - 21:00" />
        </AdminFormField>
        <div className="grid gap-5 sm:grid-cols-3">
          <AdminFormField label="지도 링크" optional>
            <TextInput value={v.mapUrl} onChange={(x) => set("mapUrl", x)} placeholder="https://naver.me/..." />
          </AdminFormField>
          <AdminFormField label="Instagram" optional>
            <TextInput value={v.instagram} onChange={(x) => set("instagram", x)} placeholder="https://instagram.com/..." />
          </AdminFormField>
          <AdminFormField label="웹사이트" optional>
            <TextInput value={v.website} onChange={(x) => set("website", x)} placeholder="https://" />
          </AdminFormField>
        </div>
      </FormSection>

      <FormSection title="GONGGANCUBE · 함께한 공간" description="현장 운영 데이터(운영 공간·큐브)와는 연결되지 않습니다. 켜면 '함께한 공간' 목록에 들어가고 공개 페이지에 큐브 표시가 붙어요. Cube 회수·교체 시 함께 바꿔주세요.">
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" checked={v.cubeAvailable} onChange={(e) => set("cubeAvailable", e.target.checked)} className="w-4 h-4" />
          이 공간에 GONGGANCUBE가 설치되어 있어요(또는 공식 협업 공간이에요)
        </label>
      </FormSection>

      {v.cubeAvailable && (
        <FormSection
          title="운영자의 이야기"
          description="웹 정본 · 현장 에피소드와 겹치지 않게"
        >
          <BlockEditor value={storyItems} onChange={setStoryItems} spaceOptions={[]} />
        </FormSection>
      )}

      {missing.length > 0 && (
        <div className="a-card px-4 py-3 text-xs leading-relaxed" role="note" data-testid="space-completeness" style={{ borderColor: "#f0dcb0", background: "#fff9ec", color: "#8a5a00" }}>
          이 공간은 검색 · 추천 품질을 위해 다음 정보를 보완하는 것을 권장합니다: <strong className="font-semibold">{missing.join(" · ")}</strong>
          <span className="block pt-0.5" style={{ color: "var(--a-dim)" }}>비어 있어도 공개할 수는 있어요.</span>
        </div>
      )}

      <EditorialSaveBar kind="spaces" id={id} status={status} publicHref={id ? `/spaces/${saved.slug}` : undefined} dirty={dirty} saving={saving} onSave={save} error={error} publishAdvice={publishAdvice} />
    </div>
  );
}
