"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 취향 따라가기 — "이 사람의 공간 취향을 계속 참고한다". 팔로우·팔로워 같은 SNS 용어와 숫자는 쓰지 않는다.
 * 비로그인이면 로그인 후 이 프로필로 돌아온다. 따라가는 중일 때 누르면 해제.
 */
export function FollowTasteButton({ handle, initialFollowing, loggedIn }: { handle: string; initialFollowing: boolean; loggedIn: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();

  async function toggle() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/@${handle}`)}`);
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
        setFollowing(!!data.following);
        router.refresh();
      }
    } catch {
      setFollowing(prev);
      setError("네트워크 오류로 처리하지 못했어요.");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        className="tap-target inline-flex items-center justify-center px-5 text-sm font-semibold transition-colors"
        style={following ? { border: "1px solid var(--ed-line)", color: "var(--ed-fg)" } : { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" }}
      >
        {following ? "따라가는 중 ✓" : "취향 따라가기"}
      </button>
      {following && !error && <span className="text-[11px]" style={{ color: "var(--ed-dim)" }}>다시 누르면 해제돼요</span>}
      {error && <span className="text-xs" style={{ color: "var(--ed-dim)" }}>{error}</span>}
    </span>
  );
}

/** 공유하기 — Web Share API가 있으면 시스템 공유, 없으면 주소 복사. 주소는 /@handle로 고정. */
export function ShareProfileButton({ path, name }: { path: string; name: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name}의 공간 취향 — 공간큐브`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // 사용자가 공유 창을 닫음
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("이 주소를 복사해주세요", url);
    }
  }

  return (
    <button type="button" onClick={share} className="tap-target inline-flex items-center justify-center px-5 text-sm" style={{ border: "1px solid var(--ed-line)" }}>
      {copied ? "주소 복사됨 ✓" : "공유하기"}
    </button>
  );
}

/**
 * 아카이브 공간 상세의 "공개 프로필에 보이기" — 공간 단위 공개. 사진은 별도 체크(기본 꺼짐), 메모·날짜는 공개 대상이 아니다.
 * 프로필 자체가 꺼져 있으면 골라 둘 수는 있지만 아무에게도 보이지 않는다고 알려준다.
 */
export function ProfileSpaceToggle({ spaceId, initialPublic, initialShowPhotos, hasPhotos, profilePublic, profileHref }: {
  spaceId: string;
  initialPublic: boolean;
  initialShowPhotos: boolean;
  hasPhotos: boolean;
  profilePublic: boolean;
  profileHref: string | null;
}) {
  const [isPublic, setPublic] = useState(initialPublic);
  const [showPhotos, setShowPhotos] = useState(initialShowPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(next: { public: boolean; showPhotos?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/spaces", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId, ...next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "저장하지 못했어요.");
        return;
      }
      setPublic(next.public);
      if (next.showPhotos !== undefined) setShowPhotos(next.showPhotos);
      if (!next.public) setShowPhotos(false);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-4 space-y-2.5" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)" }}>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="space-y-0.5">
          <span className="block text-sm font-semibold">공개 프로필에 보이기</span>
          <span className="block text-xs" style={{ color: "var(--ed-dim)" }}>공간 이름과 다녀옴/가보고 싶음만 보여요. 메모·방문 날짜는 공개되지 않아요.</span>
        </span>
        <input type="checkbox" checked={isPublic} disabled={busy} onChange={(e) => save({ public: e.target.checked })} className="w-5 h-5 shrink-0" />
      </label>
      {isPublic && hasPhotos && (
        <label className="flex items-center justify-between gap-4 cursor-pointer pl-3" style={{ borderLeft: "2px solid var(--ed-line)" }}>
          <span className="text-xs">내 사진도 함께 보이기 <span style={{ color: "var(--ed-dim)" }}>(기본 꺼짐)</span></span>
          <input type="checkbox" checked={showPhotos} disabled={busy} onChange={(e) => save({ public: true, showPhotos: e.target.checked })} className="w-4 h-4 shrink-0" />
        </label>
      )}
      {isPublic && !profilePublic && (
        <p className="text-xs" style={{ color: "var(--ed-dim)" }}>공개 프로필이 아직 꺼져 있어 지금은 아무에게도 보이지 않아요. 설정에서 켤 수 있어요.</p>
      )}
      {isPublic && profilePublic && profileHref && (
        <a href={profileHref} className="inline-block text-xs underline underline-offset-4">내 공개 프로필에서 보기 →</a>
      )}
      {error && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{error}</p>}
    </div>
  );
}
