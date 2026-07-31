"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type SpaceInfo = { id: string; name: string; isFullyBooked: boolean };

export default function WaitlistPage() {
  const { slug } = useParams<{ slug: string }>();

  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/spaces/by-slug/${slug}`)
      .then((r) => r.json())
      .then((data) => setSpace(data))
      .catch(() => setError("공간 정보를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [slug]);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!space) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId: space.id, name: name.trim(), phone: phone.trim() }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("등록에 실패했습니다. 다시 시도해 주세요");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center px-6">
        <p className="text-sm" style={{ color: "var(--dim)" }}>불러오는 중…</p>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center px-6">
        <p className="text-sm" style={{ color: "var(--dim)" }}>공간을 찾을 수 없습니다</p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-12 gap-8 max-w-sm mx-auto">
        <div style={{ color: "var(--dim)" }}>
          <p className="text-xs uppercase tracking-widest">공간큐브 / 대기 등록</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{space.name}</p>
          <h1 className="text-xl font-bold">대기 등록 완료</h1>
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        <div className="space-y-3">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            자리가 생기면 운영자가 직접 연락드립니다
          </p>
          <div className="space-y-1 text-sm">
            <p><span style={{ color: "var(--dim)" }}>이름</span>&nbsp;&nbsp;{name}</p>
            <p><span style={{ color: "var(--dim)" }}>연락처</span>&nbsp;&nbsp;{phone}</p>
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--border)" }}>
          잠시 주변에 계시다가 연락을 기다려 주세요
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 gap-8 max-w-sm mx-auto">
      <div style={{ color: "var(--dim)" }}>
        <p className="text-xs uppercase tracking-widest">공간큐브 / 대기 등록</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{space.name}</p>
        <h1 className="text-xl font-bold">
          {space.isFullyBooked ? "현재 만석입니다" : "대기 등록"}
        </h1>
        {space.isFullyBooked && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            이름과 연락처를 남기시면 자리가 나는 대로 연락드립니다
          </p>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            required
            className="w-full bg-transparent border px-3 py-3 text-sm outline-none focus:border-[var(--fg)] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
            연락처
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            required
            className="w-full bg-transparent border px-3 py-3 text-sm outline-none focus:border-[var(--fg)] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !phone.trim()}
          className="tap-target w-full py-3 text-sm font-medium border transition-colors disabled:opacity-40"
          style={{
            borderColor: "var(--fg)",
            background: "var(--fg)",
            color: "var(--bg)",
          }}
        >
          {submitting ? "등록 중…" : "대기 등록"}
        </button>
      </form>

      <p className="text-xs" style={{ color: "var(--border)" }}>
        연락처는 이 공간의 운영자에게만 전달되며, 대기 완료 후 삭제됩니다
      </p>
    </main>
  );
}
