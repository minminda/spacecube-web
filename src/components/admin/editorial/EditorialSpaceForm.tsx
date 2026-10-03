"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField } from "@/components/admin/ui";
import type { EditorialBlock, EditorialStatusValue } from "@/lib/editorial/types";
import BlockEditor, { toBlockItems, type BlockItem } from "./BlockEditor";
import { ImageField, ImageListField } from "./ImageFields";
import { EditorialSaveBar } from "./EditorialControls";
import { FormSection, TextArea, TextInput } from "./FormBits";

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
  /** 태그 어휘 제안 — 운영 태그(Tag) 이름. 같은 어휘를 쓰면 방문·저장 취향이 이 공간 추천으로 이어진다. */
  tagSuggestions?: string[];
}

function splitTags(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

/** 공간 콘텐츠 등록/편집 — 공개 공간 상세(/spaces/[slug])에 쓰이는 공간(운영 공간과 별개). */
export default function EditorialSpaceForm({ id, status, initial, tagSuggestions = [] }: Props) {
  const router = useRouter();
  const [v, setV] = useState<SpaceFormValue>(initial);
  const [storyItems, setStoryItems] = useState<BlockItem[]>(() => toBlockItems(initial.story));
  const [saved, setSaved] = useState<SpaceFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useMemo(() => ({ ...v, story: storyItems.map((i) => i.block) }), [v, storyItems]);
  const dirty = useMemo(() => JSON.stringify(current) !== JSON.stringify(saved), [current, saved]);
  const chosenTags = splitTags(v.tags);
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
          <AdminFormField label="지역" required help="예: 연남동, 문래동">
            <TextInput value={v.area} onChange={(x) => set("area", x)} />
          </AdminFormField>
          <AdminFormField label="공간 종류" required help="예: 독립서점, LP카페">
            <TextInput value={v.category} onChange={(x) => set("category", x)} />
          </AdminFormField>
        </div>
        <AdminFormField label="한 줄 소개" optional>
          <TextInput value={v.summary} onChange={(x) => set("summary", x)} placeholder="나만의 작은 공간 하나" />
        </AdminFormField>
      </FormSection>

      <FormSection title="소개" description="공간 상세 페이지 본문입니다. 빈 줄로 문단을 나눕니다. 공간에 대한 사실은 직접 확인한 내용만 적어주세요.">
        <AdminFormField label="공간 소개" optional>
          <TextArea value={v.description} onChange={(x) => set("description", x)} rows={8} />
        </AdminFormField>
        <AdminFormField label="태그" optional help="쉼표로 구분 (예: 책, 혼자, 조용한). 아래 기존 태그와 같은 이름을 쓰면 방문·저장한 사람의 취향 추천에 이 공간이 연결돼요.">
          <TextInput value={v.tags} onChange={(x) => set("tags", x)} />
          {tagSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2" aria-label="기존 태그 제안">
              {tagSuggestions.map((name) => {
                const on = chosenTags.includes(name);
                return (
                  <button key={name} type="button" onClick={() => toggleTag(name)} aria-pressed={on} className={on ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>
                    {name}
                  </button>
                );
              })}
            </div>
          )}
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
          description="웹에서 읽는 전체 이야기 — 시작, 선택, 고민, 기억. 현장 Cube의 에피소드(그 자리에서만 의미 있는 1~2분 디테일)와 겹치지 않게 써주세요. 인스타그램에는 이 중 한 장면·한 문장만."
        >
          <BlockEditor value={storyItems} onChange={setStoryItems} spaceOptions={[]} />
        </FormSection>
      )}

      <EditorialSaveBar kind="spaces" id={id} status={status} publicHref={id ? `/spaces/${saved.slug}` : undefined} dirty={dirty} saving={saving} onSave={save} error={error} />
    </div>
  );
}
