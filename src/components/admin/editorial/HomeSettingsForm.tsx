"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, adminButtonClass } from "@/components/admin/ui";
import type { EditorialStatusValue, HomeFeedItem } from "@/lib/editorial/types";
import { EditorialStatusBadge } from "./EditorialControls";
import { FormSection } from "./FormBits";

export interface HomeOption {
  id: string;
  label: string;
  status: EditorialStatusValue;
}

interface Props {
  initial: { heroSpaceId: string | null; featuredCurationId: string | null; featuredSpaceIds: string[]; feed: HomeFeedItem[] };
  spaces: HomeOption[];
  curations: HomeOption[];
  people: HomeOption[];
}

const KIND_LABEL = { curation: "CURATION", person: "PEOPLE", space: "SPACE" } as const;

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * 홈 노출 설정 — 홈 레이아웃은 코드에 그대로 두고 "어떤 콘텐츠를 노출할지"만 고른다.
 * 초안 콘텐츠도 미리 지정해 둘 수 있지만, 공개 홈에는 발행된 콘텐츠만 나온다.
 */
export default function HomeSettingsForm({ initial, spaces, curations, people }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const dirty = useMemo(() => JSON.stringify(v) !== saved, [v, saved]);

  const maps = useMemo(
    () => ({ space: new Map(spaces.map((o) => [o.id, o])), curation: new Map(curations.map((o) => [o.id, o])), person: new Map(people.map((o) => [o.id, o])) }),
    [spaces, curations, people],
  );
  const [feedKind, setFeedKind] = useState<HomeFeedItem["kind"]>("curation");
  const feedOptions = feedKind === "space" ? spaces : feedKind === "curation" ? curations : people;

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/admin/editorial/home", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인한 뒤 저장해주세요." : data.error ?? "저장하지 못했어요.");
        return;
      }
      setSaved(JSON.stringify(v));
      setOk(true);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  const optionLabel = (o: HomeOption) => `${o.label}${o.status !== "PUBLISHED" ? ` (${o.status === "DRAFT" ? "초안" : "보관"})` : ""}`;
  const Status = ({ o }: { o?: HomeOption }) => (o && o.status !== "PUBLISHED" ? <EditorialStatusBadge status={o.status} /> : null);

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <FormSection title="히어로 사진" description="첫 화면 오른쪽 큰 사진으로 쓸 공간 콘텐츠의 대표 이미지.">
        <div className="flex items-center gap-3">
          <select value={v.heroSpaceId ?? ""} onChange={(e) => setV({ ...v, heroSpaceId: e.target.value || null })} className="a-input max-w-md">
            <option value="">(없음)</option>
            {spaces.filter((o) => o.status !== "ARCHIVED" || o.id === v.heroSpaceId).map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
          </select>
          <Status o={v.heroSpaceId ? maps.space.get(v.heroSpaceId) : undefined} />
        </div>
      </FormSection>

      <FormSection title="대표 큐레이션" description="FEATURED CURATION 섹션에 크게 노출됩니다.">
        <div className="flex items-center gap-3">
          <select value={v.featuredCurationId ?? ""} onChange={(e) => setV({ ...v, featuredCurationId: e.target.value || null })} className="a-input max-w-md">
            <option value="">(없음 — 섹션 숨김)</option>
            {curations.filter((o) => o.status !== "ARCHIVED" || o.id === v.featuredCurationId).map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
          </select>
          <Status o={v.featuredCurationId ? maps.curation.get(v.featuredCurationId) : undefined} />
        </div>
      </FormSection>

      <FormSection title="최근 이야기" description="LATEST STORIES — CURATION·PEOPLE·SPACE를 섞어 위에서부터 순서대로(최대 12개). 첫 항목이 가장 크게 보입니다.">
        {v.feed.length > 0 && (
          <ol className="a-card divide-y">
            {v.feed.map((f, i) => {
              const o = maps[f.kind].get(f.id);
              return (
                <li key={`${f.kind}-${f.id}`} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center" style={{ borderColor: "var(--a-line)" }}>
                  <span className="w-6 text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{i + 1}</span>
                  <span className="a-eyebrow w-20" style={{ fontSize: 10 }}>{KIND_LABEL[f.kind]}</span>
                  <p className="text-sm flex-1 min-w-0 flex items-center gap-2">{o?.label ?? "(삭제된 콘텐츠)"} <Status o={o} /></p>
                  {f.kind === "space" && (
                    <input
                      value={f.headline ?? ""}
                      onChange={(e) => setV({ ...v, feed: v.feed.map((x, k) => (k === i && x.kind === "space" ? { ...x, headline: e.target.value || undefined } : x)) })}
                      placeholder="카드 문구(선택)"
                      className="a-input sm:max-w-[220px]"
                      style={{ height: 32, fontSize: 13 }}
                    />
                  )}
                  <span className="flex gap-0.5 shrink-0">
                    <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => setV({ ...v, feed: move(v.feed, i, -1) })} disabled={i === 0}>↑</button>
                    <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => setV({ ...v, feed: move(v.feed, i, 1) })} disabled={i === v.feed.length - 1}>↓</button>
                    <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => setV({ ...v, feed: v.feed.filter((_, k) => k !== i) })}>✕</button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select value={feedKind} onChange={(e) => setFeedKind(e.target.value as HomeFeedItem["kind"])} className="a-input w-auto">
            <option value="curation">CURATION</option>
            <option value="person">PEOPLE</option>
            <option value="space">SPACE</option>
          </select>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setV({ ...v, feed: [...v.feed, { kind: feedKind, id: e.target.value } as HomeFeedItem] });
            }}
            className="a-input max-w-xs"
            disabled={v.feed.length >= 12}
          >
            <option value="">+ 항목 추가</option>
            {feedOptions
              .filter((o) => o.status !== "ARCHIVED" && !v.feed.some((f) => f.kind === feedKind && f.id === o.id))
              .map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
          </select>
        </div>
      </FormSection>

      <FormSection title="공간 둘러보기" description="EXPLORE SPACE에 보일 공간 콘텐츠(순서대로).">
        {v.featuredSpaceIds.length > 0 && (
          <ol className="a-card divide-y">
            {v.featuredSpaceIds.map((id, i) => {
              const o = maps.space.get(id);
              return (
                <li key={id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderColor: "var(--a-line)" }}>
                  <span className="w-6 text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{i + 1}</span>
                  <p className="text-sm flex-1 min-w-0 flex items-center gap-2">{o?.label ?? "(삭제된 공간)"} <Status o={o} /></p>
                  <span className="flex gap-0.5">
                    <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => setV({ ...v, featuredSpaceIds: move(v.featuredSpaceIds, i, -1) })} disabled={i === 0}>↑</button>
                    <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => setV({ ...v, featuredSpaceIds: move(v.featuredSpaceIds, i, 1) })} disabled={i === v.featuredSpaceIds.length - 1}>↓</button>
                    <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => setV({ ...v, featuredSpaceIds: v.featuredSpaceIds.filter((_, k) => k !== i) })}>✕</button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <AdminFormField label="공간 추가">
          <select
            value=""
            onChange={(e) => e.target.value && setV({ ...v, featuredSpaceIds: [...v.featuredSpaceIds, e.target.value] })}
            className="a-input max-w-md"
          >
            <option value="">+ 공간 선택</option>
            {spaces.filter((o) => o.status !== "ARCHIVED" && !v.featuredSpaceIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
          </select>
        </AdminFormField>
      </FormSection>

      <div className="sticky bottom-0 z-30 -mx-4 md:mx-0 px-4 md:px-0 py-3 flex flex-wrap items-center justify-between gap-3" style={{ background: "var(--a-bg)", borderTop: "1px solid var(--a-line)" }}>
        <p className="text-xs" style={{ color: error ? "var(--a-danger)" : "var(--a-dim)" }}>
          {error ?? (ok && !dirty ? "저장했어요. 공개 홈에는 발행된 콘텐츠만 표시됩니다." : dirty ? "저장하지 않은 변경사항" : "초안 콘텐츠는 발행 전까지 홈에 나오지 않아요.")}
        </p>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className={adminButtonClass("ghost")}>홈 보기 ↗</a>
          <button type="button" onClick={save} disabled={saving || !dirty} className={adminButtonClass("primary")}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

