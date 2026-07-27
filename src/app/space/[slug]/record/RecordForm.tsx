"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TagKey } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";
import TagChip from "@/components/TagChip";
import { ENABLE_RECORD_TAG_SELECTION } from "@/lib/features";

const MAX_TAGS = 2;

const SCORE_LABELS: Record<number, string> = {
  1: "전혀 맞지 않음",
  2: "조금 아쉬움",
  3: "보통",
  4: "잘 맞음",
  5: "매우 잘 맞음",
};

interface Props {
  space: { id: string; name: string; slug: string; tagline?: string | null };
  spaceTags: TagKey[];
  /** 관리자가 이 공간에 연결한 활성 태그를 카테고리별로 묶은 목록 (있으면 이걸 우선 표시, 없으면 spaceTags로 폴백) */
  displayTagGroups?: { category: string; names: string[] }[] | null;
  visitCount: number;
  previousRecord: { tags: TagKey[]; tasteScore: number | null } | null;
  /** 이번 방문(재방문 인정 간격 내)에 이미 저장된 Record. 있으면 폼을 이 값으로 프리필하고 재입력을 강요하지 않는다. */
  currentVisitRecord: { id: string; tasteScore: number | null } | null;
  /** unlock: "방문자들의 이야기 보기"에서 진입한 1회성 입장 화면 (기록 카운트 없이 가볍게) */
  intent?: "record" | "unlock";
}

export default function RecordForm({ space, spaceTags, displayTagGroups, visitCount, previousRecord, currentVisitRecord, intent = "record" }: Props) {
  const isUnlock = intent === "unlock";
  const tagsToShow = spaceTags.length > 0 ? spaceTags : ALL_TAGS;
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<TagKey[]>([]);
  const [tasteScore, setTasteScore] = useState<number | null>(currentVisitRecord?.tasteScore ?? null);
  const [loading, setLoading] = useState(false);

  const isRevisit = !isUnlock && visitCount > 0;
  const visitNumber = visitCount + 1;
  const hasSavedThisVisit = currentVisitRecord !== null;
  const isDirty = hasSavedThisVisit && tasteScore !== currentVisitRecord!.tasteScore;

  // 브라우저 bfcache 복원(모바일 뒤로가기 등) 시 이 컴포넌트의 React 상태와 함께
  // 서버 컴포넌트(record/page.tsx)가 다시 실행되지 않을 수 있으므로, pageshow에서
  // event.persisted를 확인해 서버 상태를 강제로 재조회한다.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  // 레거시 태그 선택 (ENABLE_RECORD_TAG_SELECTION 켜졌을 때만 사용)
  function toggleTag(tag: TagKey) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }

  const canSubmit = ENABLE_RECORD_TAG_SELECTION
    ? selectedTags.length > 0
    : tasteScore !== null;

  async function handleSubmit() {
    if (!canSubmit) return;

    // 이번 방문에 이미 저장된 점수를 그대로 두고 있다면(수정하지 않았다면) 다시
    // 저장을 시도하지 않고 방명록으로 바로 이동한다 — 같은 페이지에서 재제출을
    // 유도하지 않기 위함.
    if (hasSavedThisVisit && !isDirty && currentVisitRecord) {
      const visitParam = `visit=${currentVisitRecord.id}`;
      const query = isUnlock ? visitParam : ["mode=write", visitParam].join("&");
      router.push(`/space/${space.slug}/guestbook?${query}`);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceId: space.id,
        tasteScore,
        ...(ENABLE_RECORD_TAG_SELECTION ? { tags: selectedTags } : {}),
      }),
    });
    if (res.ok) {
      const saved = await res.json().catch(() => null);
      // 이번 방문에서 생성/갱신된 Record를 방명록이 식별할 수 있게 id를 넘긴다(점수 값 자체는 넘기지 않음).
      const visitParam = saved?.id ? `visit=${saved.id}` : "";
      // unlock: 흔적을 보러 감(view) / record: 흔적을 남기러 감(write)
      const query = isUnlock ? visitParam : ["mode=write", visitParam].filter(Boolean).join("&");
      router.push(`/space/${space.slug}/guestbook${query ? `?${query}` : ""}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / {isUnlock ? "GUESTBOOK" : "RECORD"}</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <button onClick={() => router.back()} className="text-xs" style={{ color: "var(--dim)" }}>&lt; back</button>
        <p className="text-base">&gt; {space.name}</p>
      </div>

      {isUnlock ? (
        <div className="space-y-2">
          <p className="text-base font-medium leading-relaxed whitespace-pre-line">
            {"이 공간에는\n다른 사람들의 흔적이 남아 있습니다."}
          </p>
          {space.tagline && (
            <p className="text-sm italic leading-relaxed" style={{ color: "var(--dim)" }}>{space.tagline}</p>
          )}
        </div>
      ) : hasSavedThisVisit ? (
        <div className="space-y-1.5 p-3 border" style={{ borderColor: "var(--fg)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--fg)" }}>// 이미 이번 방문에 취향 점수를 저장했어요</p>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            저장된 취향 점수 {currentVisitRecord?.tasteScore ?? "-"}/5 — 그대로 방명록으로 이동하거나, 아래에서 바꿀 수 있어요
          </p>
        </div>
      ) : (
        isRevisit && (
          <div className="space-y-1.5 p-3 border" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--fg)" }}>// {visitNumber}번째 방문입니다</p>
            {previousRecord?.tasteScore != null && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                지난번 취향 적합도: {previousRecord.tasteScore}/5
              </p>
            )}
          </div>
        )
      )}

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* 공간 취향 태그 — 선택 불가, 공간의 결 설명용 (unlock 화면에서는 생략, 태그 없이 담백하게).
          관리자가 연결한 활성 태그(displayTagGroups)가 있으면 카테고리별로 묶어 보여주고,
          없으면 레거시 spaceTags를 한 줄로 폴백 표시한다. */}
      {!ENABLE_RECORD_TAG_SELECTION && !isUnlock && ((displayTagGroups?.length ?? 0) > 0 || spaceTags.length > 0) && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>// 이 공간은 이런 결을 가지고 있어요</p>
          {displayTagGroups ? (
            <div className="space-y-2.5">
              {displayTagGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <p className="text-xs" style={{ color: "var(--border)" }}>{group.category}</p>
                  <p className="text-sm" style={{ color: "var(--dim)" }}>{group.names.join(" · ")}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {spaceTags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 border select-none"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {TAG_LABELS[t]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 취향 적합도 평가 (필수) */}
      {!ENABLE_RECORD_TAG_SELECTION && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            {isUnlock ? "// 먼저, 이 공간이 당신과 얼마나 잘 맞았나요?" : "// 이 공간은 당신의 취향과 얼마나 가까웠나요?"}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = tasteScore === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTasteScore(n)}
                  className="flex-1 py-3 text-sm border transition-colors"
                  style={{
                    borderColor: active ? "var(--fg)" : "var(--border)",
                    background: active ? "var(--fg)" : "transparent",
                    color: active ? "var(--bg)" : "var(--dim)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--border)" }}>
            <span>전혀 맞지 않음</span>
            <span>매우 잘 맞음</span>
          </div>
          {tasteScore !== null && (
            <p className="text-xs" style={{ color: "var(--fg)" }}>
              &gt; {tasteScore}점 — {SCORE_LABELS[tasteScore]}
            </p>
          )}
        </div>
      )}

      {/* 레거시: 태그 2개 선택 (ENABLE_RECORD_TAG_SELECTION = true 로 복구) */}
      {ENABLE_RECORD_TAG_SELECTION && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// {isRevisit ? "이번엔 어땠나요?" : "이 공간 어땠나요?"}</p>
            <p className="text-xs" style={{ color: selectedTags.length >= MAX_TAGS ? "var(--fg)" : "var(--dim)" }}>{selectedTags.length}/{MAX_TAGS}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagsToShow.map((tag) => (
              <TagChip key={tag} label={TAG_LABELS[tag]} selected={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)} disabled={!selectedTags.includes(tag) && selectedTags.length >= MAX_TAGS} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
        {isUnlock ? (
          <>
            당신의 경험을 먼저 남기면,
            <br />
            이 공간에 쌓인 다른 사람들의 흔적도 함께 열립니다.
          </>
        ) : (
          <>
            저장하면 이 공간의 방명록에서
            <br />
            원하는 위치에 흔적을 남길 수 있어요.
          </>
        )}
      </p>

      <button onClick={handleSubmit} disabled={!canSubmit || loading}
        className="w-full text-sm py-3 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
        style={{ borderColor: "var(--fg)" }}>
        {loading
          ? "// 저장 중..."
          : hasSavedThisVisit && !isDirty
          ? "[[ 방명록 다시 보기 ]]"
          : hasSavedThisVisit && isDirty
          ? "[[ 변경한 점수로 업데이트 ]]"
          : isUnlock
          ? "[[ 흔적 보러가기 ]]"
          : "[[ 취향 저장하고 흔적 남기기 ]]"}
      </button>
    </main>
  );
}
