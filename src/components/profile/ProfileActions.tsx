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

  const sizeClass = size === "lg" ? "w-full sm:w-auto sm:min-w-[168px]" : "ed-btn-sm";
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        className={`ed-btn ${following ? "" : "ed-btn-primary"} ${sizeClass}`}
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
      <div className="pt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start">
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

/** 화면 아래 짧은 안내(토스트) — 버튼 줄의 레이아웃을 밀지 않는다. 몇 초 뒤 사라진다. */
function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-4 px-4 py-3 text-sm" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * 공유 — Web Share API가 있으면 시스템 공유, 없으면 주소 복사 후 "링크를 복사했어요." 토스트.
 * 주소는 공개 프로필 /@handle로 고정(닉네임이 바뀌어도 링크 유지, 내부 사용자 id는 쓰지 않는다).
 * 공개 여부와 상관없이 공유할 수 있다 — 비공개면 받는 사람에게 "비공개 아카이브입니다."가 보인다(공개를 강요하지 않음).
 */
export function ShareProfileButton({ path, name, label = "공유", variant = "outline", fill }: { path: string; name: string; label?: string; /** seg: 추천 세그먼트와 같은 크기의 전체 폭 Secondary(내 아카이브 상단) */ variant?: "outline" | "solid" | "text" | "seg"; /** 칸을 꽉 채운다(버튼 그리드) */ fill?: boolean }) {
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

  const size = fill ? "w-full" : "w-full sm:w-auto sm:min-w-[120px]";
  return (
    <>
      <button type="button" onClick={share} className={variant === "text" ? TEXT_ACTION : variant === "seg" ? "ed-btn ed-btn-seg w-full" : variant === "solid" ? `ed-btn ed-btn-primary ${size}` : `ed-btn ${size}`}>
        {label}
      </button>
      {copied && <Toast>링크를 복사했어요.</Toast>}
    </>
  );
}

/** 작은 행동(공유 · 프로필 보기) — 글자 링크 모양이지만 터치 영역은 40px */
const TEXT_ACTION = "inline-flex items-center min-h-10 text-[13px] font-semibold underline underline-offset-4 whitespace-nowrap";

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
        <p className="text-xs" style={{ color: "var(--ed-dim)" }}>공개 프로필이 아직 꺼져 있어 지금은 아무에게도 보이지 않아요. <a href="/settings" className="underline underline-offset-4">설정</a>에서 켤 수 있어요.</p>
      )}
      {st.public && profilePublic && recordHref && (
        <a href={recordHref} className="inline-block text-xs underline underline-offset-4">다른 사람에게 보이는 모습 보기 →</a>
      )}
      {error && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{error}</p>}
    </div>
  );
}
