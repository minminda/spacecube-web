"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageCropDialog from "@/components/ImageCropDialog";
import { normalizeSlug, isValidSlug } from "@/lib/slug";

interface SpaceData {
  id: string;
  name: string;
  slug: string;
  district: string;
  location: string;
  tagline: string;
  openingHours: string;
  naverMapUrl: string;
  description: string;
  imageUrl?: string;
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  ownerName?: string;
  ownerPhotoUrl?: string;
  ownerBio?: string;
  hasOperatorPin?: boolean;
}

type SelectionType = "SINGLE" | "MULTI";

interface CategoryOption {
  id: string;
  name: string;
  selectionType: SelectionType;
  tags: { id: string; name: string }[];
}

interface ExistingTagLink {
  tagId: string;
  weight: number;
  isPrimary: boolean;
  visibleToUsers: boolean;
}

interface Props {
  mode: "new" | "edit";
  space?: SpaceData;
  categories: CategoryOption[];
  existingTagLinks?: ExistingTagLink[];
}

const WEAK_PIN_PATTERN = /^(\d)\1{3}$/;
function isSequentialPin(pin: string): boolean {
  const digits = pin.split("").map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return ascending || descending;
}
function isWeakPin(pin: string): boolean {
  return WEAK_PIN_PATTERN.test(pin) || isSequentialPin(pin);
}

// 공간 상세 페이지 Hero 이미지 비율(space/[slug]/page.tsx와 동일) — 대표사진 crop box의 고정 비율.
const HERO_ASPECT_RATIO = 16 / 11;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(file: File): Promise<string | null> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
    const result = await res.json();
    return result.secure_url ?? null;
  } catch {
    return null;
  }
}

export default function SpaceForm({ mode, space, categories, existingTagLinks }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 운영자 한마디
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState(space?.ownerPhotoUrl ?? "");
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState(space?.ownerPhotoUrl ?? "");
  const [ownerPhotoUploading, setOwnerPhotoUploading] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    ownerName: space?.ownerName ?? "",
    ownerBio: space?.ownerBio ?? "",
  });

  // 대표 이미지 — 파일 선택 직후 ImageCropDialog로 가로 Hero 영역을 실제로 잘라내고,
  // 잘린 결과만 업로드한다(예전의 "업로드 후 프레임 안에서 드래그/확대" 방식은 더 이상 안 씀).
  const [heroImageUrl, setHeroImageUrl] = useState(space?.imageUrl ?? "");
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);

  async function handleHeroCropConfirm(croppedFile: File) {
    setPendingHeroFile(null);
    setHeroUploading(true);
    const url = await uploadToCloudinary(croppedFile);
    setHeroUploading(false);
    if (url) setHeroImageUrl(url);
    else setError("대표 이미지 업로드에 실패했어요. 다시 시도해주세요.");
  }

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set((existingTagLinks ?? []).map((l) => l.tagId))
  );

  // 운영 접근 설정 — 새 PIN을 입력하지 않으면 기존 PIN이 그대로 유지된다(빈 값은 전송 안 함).
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [form, setForm] = useState({
    name: space?.name ?? "",
    slug: space?.slug ?? "",
    district: space?.district ?? "",
    location: space?.location ?? "",
    tagline: space?.tagline ?? "",
    openingHours: space?.openingHours ?? "",
    naverMapUrl: space?.naverMapUrl ?? "",
    description: space?.description ?? "",
  });

  function handleOwnerChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setOwnerForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleOwnerPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOwnerPhotoPreview(URL.createObjectURL(file));
    setOwnerPhotoUploading(true);
    const url = await uploadToCloudinary(file);
    setOwnerPhotoUploading(false);
    if (url) {
      setOwnerPhotoUrl(url);
      setOwnerPhotoPreview(url);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "name" && mode === "new") {
        next.slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return next;
    });
  }

  function toggleTag(category: CategoryOption, tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (category.selectionType === "SINGLE") {
        // 같은 카테고리 안의 다른 선택은 해제 — 필수 항목이라 다시 눌러도 해제되지 않는다.
        category.tags.forEach((t) => next.delete(t.id));
        next.add(tagId);
      } else if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  function buildTagLinks() {
    const existingByTagId = new Map((existingTagLinks ?? []).map((l) => [l.tagId, l]));
    return [...selectedTagIds].map((tagId) => {
      const existing = existingByTagId.get(tagId);
      return {
        tagId,
        weight: existing?.weight ?? 1,
        isPrimary: existing?.isPrimary ?? false,
        visibleToUsers: existing?.visibleToUsers ?? true,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setError("");

    for (const category of categories) {
      if (category.selectionType !== "SINGLE") continue;
      const hasSelection = category.tags.some((t) => selectedTagIds.has(t.id));
      if (!hasSelection) {
        setError(`${category.name}을(를) 선택해주세요.`);
        return;
      }
    }

    const normalizedSlug = normalizeSlug(form.slug);
    if (!isValidSlug(normalizedSlug)) {
      setError("공간 주소는 영문 소문자, 숫자, 하이픈만 사용할 수 있어요.");
      return;
    }

    if (newPin || confirmPin) {
      if (!/^\d{4}$/.test(newPin)) {
        setPinError("비밀번호는 숫자 4자리로 입력해주세요.");
        return;
      }
      if (newPin !== confirmPin) {
        setPinError("두 비밀번호가 일치하지 않습니다.");
        return;
      }
    }

    setLoading(true);
    setError("");

    const url = mode === "new" ? "/api/spaces" : `/api/spaces/${space!.id}`;
    const method = mode === "new" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug: normalizedSlug,
        // 대표 이미지는 이미 ImageCropDialog에서 가로 Hero 비율로 실제로 잘려 업로드된
        // 결과이므로(자동 중앙 crop 아님) 위치/확대는 기본값으로 저장한다.
        imageUrl: heroImageUrl || null,
        imageZoom: 1,
        imagePositionX: 0.5,
        imagePositionY: 0.5,
        tagLinks: buildTagLinks(),
        ...ownerForm,
        ownerPhotoUrl: ownerPhotoUrl || null,
        ...(newPin ? { newOperatorPin: newPin } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "오류가 발생했어요.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  const inputStyle = { background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)", outline: "none" };

  // 파일럿 콘텐츠 제작 단순화 — 실제 파일럿 제작에 쓰지 않는 입력을 관리자 화면에서 숨긴다.
  // 상태(form.tagline/description, ownerForm)는 그대로 두고 기존 값을 그대로 재저장하므로
  // DB 필드·기존 데이터는 전혀 손대지 않는다. true로 바꾸면 즉시 원상복구.
  const SHOW_TAGLINE_INPUT = false;
  const SHOW_DESCRIPTION_INPUT = false;
  const SHOW_OWNER_NOTE_INPUTS = false;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="flex justify-between items-center">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          {mode === "new" ? "새 공간 등록" : "공간 수정"}
        </p>
        <button onClick={() => router.back()} className="text-xs" style={{ color: "var(--dim)" }}>← 뒤로</button>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* 대표 이미지 — 파일 선택 직후 가로 Hero 비율(16:11) crop box로 실제 잘라내기 */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>대표 이미지 (선택)</p>
          {heroImageUrl && (
            <div className="relative w-full overflow-hidden border" style={{ borderColor: "var(--border)", aspectRatio: "16 / 11" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex gap-3">
            <label className="text-xs py-2 px-3 text-center border cursor-pointer transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              {heroUploading ? "업로드 중..." : heroImageUrl ? "이미지 교체" : "사진 선택"}
              <input
                type="file"
                accept="image/*"
                disabled={heroUploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPendingHeroFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            {heroImageUrl && (
              <button
                type="button"
                onClick={() => setHeroImageUrl("")}
                className="text-xs px-3 py-2 border transition-colors hover:border-red-500 hover:text-red-500"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                삭제
              </button>
            )}
          </div>
        </div>

        {pendingHeroFile && (
          <ImageCropDialog
            file={pendingHeroFile}
            fixedAspect={HERO_ASPECT_RATIO}
            onConfirm={handleHeroCropConfirm}
            onCancel={() => setPendingHeroFile(null)}
          />
        )}

        {/* 기본 정보 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>기본 정보</p>

        <Field label="공간 이름 *">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="북성로 헌책방"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="공간 주소 (영문, 하이픈만) *">
          <input name="slug" value={form.slug} onChange={handleChange} required placeholder="bukseong-books"
            className="w-full text-sm px-3 py-2.5 border font-mono" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>/space/{form.slug || "..."}</p>
        </Field>

        {categories.map((category) => (
          <Field key={category.id} label={`${category.name}${category.selectionType === "SINGLE" ? " *" : " (선택)"}`}>
            <div className="flex flex-wrap gap-2">
              {category.tags.map((tag) => {
                const selected = selectedTagIds.has(tag.id);
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(category, tag.id)}
                    className="px-3 py-1.5 text-xs border transition-colors"
                    style={selected
                      ? { borderColor: "var(--fg)", background: "var(--fg)", color: "var(--bg)" }
                      : { borderColor: "var(--border)", color: "var(--dim)" }}>
                    {tag.name}
                  </button>
                );
              })}
              {category.tags.length === 0 && (
                <p className="text-xs" style={{ color: "var(--dim)" }}>아직 태그가 없어요 — 태그 관리에서 먼저 추가해주세요.</p>
              )}
            </div>
          </Field>
        ))}

        <Field label="지역 *">
          <input name="district" value={form.district} onChange={handleChange} required placeholder="예: 망원동"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="상세 위치 *">
          <input name="location" value={form.location} onChange={handleChange} required placeholder="서울 마포구 망원동"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="네이버 지도 링크 (선택)">
          <input name="naverMapUrl" value={form.naverMapUrl} onChange={handleChange} placeholder="https://naver.me/..."
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="운영 시간 (선택)">
          <input name="openingHours" value={form.openingHours} onChange={handleChange} placeholder="화~일 12:00–21:00 / 월 휴무"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        {SHOW_TAGLINE_INPUT && (
          <Field label="핵심 한 줄 (선택)">
            <input name="tagline" value={form.tagline} onChange={handleChange} placeholder="생각이 많아지는 날, 글을 쓰는 공간"
              className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
          </Field>
        )}

        {SHOW_DESCRIPTION_INPUT && (
          <>
            {/* 기본 소개 */}
            <div style={{ borderTop: "1px solid var(--border)" }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>기본 소개</p>

            <Field label="간단 소개 (검색 결과·공유 링크에 노출됩니다)">
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="이 공간을 한두 문장으로 짧게 소개해줘."
                rows={3} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
            </Field>
          </>
        )}

        {mode === "edit" && space && (
          <a
            href={`/admin/${space.id}/episodes`}
            className="block text-xs py-2.5 px-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            방문자에게 보여줄 이야기는 에피소드에서 관리해 →
          </a>
        )}

        {SHOW_OWNER_NOTE_INPUTS && (
          <>
            {/* 운영자 한마디 */}
            <div style={{ borderTop: "1px solid var(--border)" }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자 한마디</p>

            <Field label="운영자 이름/닉네임 (선택)">
              <input name="ownerName" value={ownerForm.ownerName} onChange={handleOwnerChange}
                placeholder="김책방" className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
            </Field>

            <Field label="운영자 사진 (선택)">
              <label className="block cursor-pointer">
                <div className="w-20 h-20 rounded-full border flex items-center justify-center overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
                  {ownerPhotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ownerPhotoPreview} alt="owner" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-center" style={{ color: "var(--dim)" }}>사진</span>
                  )}
                  {ownerPhotoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <span className="text-xs" style={{ color: "var(--fg)" }}>...</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleOwnerPhotoChange} className="hidden" />
              </label>
            </Field>

            <Field label="운영자 한마디 (선택)">
              <textarea name="ownerBio" value={ownerForm.ownerBio} onChange={handleOwnerChange}
                placeholder="방문객에게 남기고 싶은 짧은 한마디 (예: 오늘도 편하게 머물다 가셨으면 좋겠습니다.)"
                rows={2} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
            </Field>
          </>
        )}

        {/* 운영 접근 설정 */}
        {mode === "edit" && space && (
          <>
            <div style={{ borderTop: "1px solid var(--border)" }} />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영 접근 설정</p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {space.hasOperatorPin ? "운영 비밀번호가 등록되어 있습니다." : "운영 비밀번호가 등록되어 있지 않습니다."}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
                이 비밀번호는 해당 공간 운영자가 /operator에서 관리 페이지에 접속할 때 사용합니다.
              </p>

              <Field label={space.hasOperatorPin ? "새 비밀번호 (변경 시에만 입력)" : "새 비밀번호 등록"}>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="숫자 4자리"
                  className="w-full text-sm px-3 py-2.5 border"
                  style={inputStyle}
                />
              </Field>

              <Field label="비밀번호 확인">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="숫자 4자리 재입력"
                  className="w-full text-sm px-3 py-2.5 border"
                  style={inputStyle}
                />
              </Field>

              {newPin.length === 4 && isWeakPin(newPin) && (
                <p className="text-xs" style={{ color: "#e0a030" }}>너무 쉬운 비밀번호예요. 다른 조합을 권장해요.</p>
              )}
              {pinError && <p className="text-xs text-red-400">{pinError}</p>}
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
          style={{ borderColor: "var(--fg)" }}>
          {loading ? "저장 중..." : mode === "new" ? "공간 등록하기" : "수정 완료"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{label}</label>
      {children}
    </div>
  );
}
