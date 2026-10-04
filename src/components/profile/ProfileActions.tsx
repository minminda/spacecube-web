"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 취향 따라가기 — "이 사람의 공간 취향을 계속 참고한다". 프로필의 Primary CTA(검정 채움, 충분한 크기).
 * 따라가는 중이면 테두리 버튼 "따라가는 중 ✓", 다시 누르면 해제. 비로그인이면 로그인 후 이 프로필로 돌아온다.
 * size="sm"은 사람 찾기·목록 카드용(같은 의미, 작은 크기).
 */
export function FollowTasteButton({ handle, initialFollowing, loggedIn, size = "lg", returnTo, onChange }: {
  handle: string;
  initialFollowing: boolean;
  loggedIn: boolean;
  size?: "lg" | "sm";
  /** 로그인 후 돌아올 주소(기본: 이 사람 프로필) */
  returnTo?: string;
  /** 서버 확인 후 최종 상태 — 같은 화면의 관계 수를 함께 맞출 때 */
  onChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();

  async function toggle() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(returnTo ?? `/@${handle}`)}`);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    const prev = following;
    setFollowing(!prev);
    setError(null);
    try {
      const res = await fetch("/api/profile/follow", {
        method: prev ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFollowing(prev);
        setError(data.error ?? "잠시 후 다시 시도해주세요.");
      } else {
        // 화면 새로고침(router.refresh)에 기대지 않는다 — /@handle rewrite 경로에서 새로고침 요청이 취소되는 경우가 있어
        // 관계 수는 이 결과로 직접 맞춘다(ProfileFollowArea).
        setFollowing(!!data.following);
        onChange?.(!!data.following);
      }
    } catch {
      setFollowing(prev);
      setError("네트워크 오류로 처리하지 못했어요.");
    } finally {
      inFlight.current = false;
    }
  }

  const sizeClass = size === "lg" ? "h-12 px-7 text-[15px] min-w-[168px]" : "h-9 px-4 text-[13px]";
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors ${sizeClass}`}
        style={following ? { border: "1px solid var(--ed-fg)", color: "var(--ed-fg)", background: "var(--ed-bg)" } : { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" }}
      >
        {following ? "따라가는 중 ✓" : "취향 따라가기"}
      </button>
      {error && <span className="text-xs" style={{ color: "var(--ed-dim)" }}>{error}</span>}
    </span>
  );
}

/**
 * 다른 사람 프로필의 관계 영역 — 관계 수(작은 보조 문구, 각 목록으로 이동) + [취향 따라가기][공유].
 * 따라가기/해제하면 "나를 따라가는 사람" 수를 서버 결과에 맞춰 바로 고친다.
 */
export function ProfileFollowArea({ handle, path, name, followingCount, followerCount, common, initialFollowing, loggedIn }: {
  handle: string;
  path: string;
  name: string;
  followingCount: number;
  followerCount: number;
  /** 함께 좋아하는 공간 수(보는 사람 기준) */
  common: number;
  initialFollowing: boolean;
  loggedIn: boolean;
}) {
  // 서버가 센 수에서 "내가 따라가는지"를 뺀 기준값 — 토글 결과만 더한다
  const base = followerCount - (initialFollowing ? 1 : 0);
  const [following, setFollowing] = useState(initialFollowing);
  return (
    <>
      <RelationLine path={path} followingCount={followingCount} followerCount={base + (following ? 1 : 0)} common={common} />
      <div className="pt-7 flex flex-wrap items-start gap-2">
        <FollowTasteButton handle={handle} initialFollowing={initialFollowing} loggedIn={loggedIn} onChange={setFollowing} />
        <ShareProfileButton path={path} name={name} />
      </div>
    </>
  );
}

/** 관계 수 한 줄 — 큰 KPI가 아니라 작은 보조 문구. 누르면 각 목록. */
export function RelationLine({ path, followingCount, followerCount, common }: { path: string; followingCount: number; followerCount: number; common: number }) {
  return (
    <p className="pt-4 text-xs" style={{ color: "var(--ed-dim)" }}>
      <a href={`${path}/following`} className="hover:underline underline-offset-4">따라가는 취향 <span className="tabular-nums">{followingCount}</span></a>
      <span aria-hidden> · </span>
      <a href={`${path}/followers`} className="hover:underline underline-offset-4">나를 따라가는 사람 <span className="tabular-nums">{followerCount}</span></a>
      {common > 0 && <span> · 함께 좋아하는 공간 {common}곳</span>}
    </p>
  );
}

/**
 * 공유 — Web Share API가 있으면 시스템 공유, 없으면 주소 복사 후 "링크가 복사되었습니다."
 * 주소는 /@handle로 고정(닉네임이 바뀌어도 링크 유지).
 */
export function ShareProfileButton({ path, name, label = "공유", variant = "outline" }: { path: string; name: string; label?: string; variant?: "outline" | "solid" }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name}의 공간 아카이브 — 공간큐브`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // 사용자가 공유 창을 닫음
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt("이 주소를 복사해주세요", url);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold whitespace-nowrap"
        style={variant === "solid" ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-fg)", color: "var(--ed-fg)" }}
      >
        {label}
      </button>
      <span role="status" className="text-xs h-4" style={{ color: "var(--ed-dim)" }}>{copied ? "링크가 복사되었습니다." : ""}</span>
    </span>
  );
}

/** 공유하려는데 아직 공개 프로필이 없을 때 — 무엇을 해야 하는지 바로 알려준다(설정 패널에서 켠다). */
export function ShareNeedsProfileButton({ label }: { label: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={() => setShown(true)} className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold whitespace-nowrap" style={{ border: "1px solid var(--ed-fg)", color: "var(--ed-fg)" }}>
        {label}
      </button>
      <span role="status" className="text-xs min-h-4 max-w-[260px]" style={{ color: "var(--ed-dim)" }}>
        {shown ? "공유하려면 오른쪽 위 설정(⚙)에서 공개 프로필을 먼저 켜주세요. 공개한 공간만 보여요." : ""}
      </span>
    </span>
  );
}

interface ToggleState {
  public: boolean;
  showPhotos: boolean;
  showMemo: boolean;
  showVisitDate: boolean;
}

/**
 * 아카이브 공간 상세의 "공개 프로필에 보이기" — 공간 단위 공개. 사진 · 나의 한 줄 · 방문 시기는 각각 따로(기본 꺼짐).
 * 프로필 자체가 꺼져 있으면 골라 둘 수는 있지만 아무에게도 보이지 않는다고 알려준다.
 */
export function ProfileSpaceToggle({ spaceId, initial, hasPhotos, hasMemo, hasVisitDate, profilePublic, recordHref }: {
  spaceId: string;
  initial: ToggleState;
  hasPhotos: boolean;
  hasMemo: boolean;
  hasVisitDate: boolean;
  profilePublic: boolean;
  /** 공개 기록 상세 주소(/@handle/s/slug) — 주소가 있을 때만 */
  recordHref: string | null;
}) {
  const [st, setSt] = useState<ToggleState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(next: ToggleState) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/spaces", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId, ...next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "저장하지 못했어요.");
        return;
      }
      setSt(next.public ? next : { public: false, showPhotos: false, showMemo: false, showVisitDate: false });
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const sub = (key: "showPhotos" | "showMemo" | "showVisitDate", label: string) => (
    <label className="flex items-center justify-between gap-4 cursor-pointer pl-3" style={{ borderLeft: "2px solid var(--ed-line)" }}>
      <span className="text-xs">{label}</span>
      <input type="checkbox" checked={st[key]} disabled={busy} onChange={(e) => save({ ...st, [key]: e.target.checked })} className="w-4 h-4 shrink-0" />
    </label>
  );

  return (
    <div className="py-4 space-y-2.5" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)" }}>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="space-y-0.5">
          <span className="block text-sm font-semibold">공개 프로필에 보이기</span>
          <span className="block text-xs" style={{ color: "var(--ed-dim)" }}>기본은 공간 이름과 공간 사진만. 내 사진·한 줄·방문 시기는 아래에서 따로 골라요.</span>
        </span>
        <input type="checkbox" checked={st.public} disabled={busy} onChange={(e) => save({ ...st, public: e.target.checked })} className="w-5 h-5 shrink-0" />
      </label>
      {st.public && (
        <div className="space-y-2">
          {hasPhotos && sub("showPhotos", "내 사진도 보이기 — 카드에 내 사진이 먼저 보여요")}
          {hasMemo && sub("showMemo", "나의 한 줄도 보이기")}
          {hasVisitDate && sub("showVisitDate", "방문 시기(월)도 보이기")}
        </div>
      )}
      {st.public && !profilePublic && (
        <p className="text-xs" style={{ color: "var(--ed-dim)" }}>공개 프로필이 아직 꺼져 있어 지금은 아무에게도 보이지 않아요. 설정(⚙)에서 켤 수 있어요.</p>
      )}
      {st.public && profilePublic && recordHref && (
        <a href={recordHref} className="inline-block text-xs underline underline-offset-4">다른 사람에게 보이는 모습 보기 →</a>
      )}
      {error && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{error}</p>}
    </div>
  );
}
