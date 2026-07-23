"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SpaceResult {
  id: string;
  name: string;
  district: string | null;
  type: string;
}

const inputStyle = { background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)", outline: "none" };

export default function OperatorAccessGate() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SpaceResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 1) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/operator/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.spaces ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (selected) {
    return (
      <PinStep
        space={selected}
        onBack={() => setSelected(null)}
        onSuccess={() => router.refresh()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold">관리할 공간을 찾아주세요.</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          공간 이름을 검색한 뒤 등록된 비밀번호를 입력하면 운영 페이지에 들어갈 수 있습니다.
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="공간 이름 검색"
        autoFocus
        className="w-full text-sm px-3 py-3 border"
        style={inputStyle}
      />

      <div className="space-y-2">
        {searching && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>검색 중...</p>
        )}
        {!searching && results !== null && results.length === 0 && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>검색 결과가 없습니다.</p>
        )}
        {!searching && results !== null && results.length > 0 && (
          <div className="space-y-2">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className="w-full text-left p-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs" style={{ color: "var(--dim)" }}>
                  {[s.district, s.type].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PinStep({ space, onBack, onSuccess }: { space: SpaceResult; onBack: () => void; onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function verify(value: string) {
    if (value.length !== 4 || verifying) return;
    setVerifying(true);
    setError("");
    const res = await fetch("/api/operator/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId: space.id, pin: value }),
    });
    setVerifying(false);

    if (res.ok) {
      onSuccess();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data.error === "NOT_REGISTERED") {
      setError("이 공간에는 운영 비밀번호가 등록되지 않았습니다. 공간큐브 관리자에게 문의해주세요.");
    } else if (data.error === "RATE_LIMITED") {
      setError("잠시 후 다시 시도해주세요.");
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
    setPin("");
  }

  function handlePinChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    setPin(digitsOnly);
    setError("");
    if (digitsOnly.length === 4) verify(digitsOnly);
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-xs" style={{ color: "var(--dim)" }}>
        ← 다른 공간 선택
      </button>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{space.name}</p>
        <h1 className="text-xl font-bold">운영 비밀번호를 입력해주세요.</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          관리자에게 전달받은 4자리 비밀번호를 입력하세요.
        </p>
      </div>

      <input
        type="password"
        inputMode="numeric"
        pattern="\d*"
        maxLength={4}
        value={pin}
        onChange={(e) => handlePinChange(e.target.value)}
        disabled={verifying}
        autoFocus
        placeholder="••••"
        className="w-full text-center text-2xl tracking-[0.5em] px-3 py-3 border"
        style={inputStyle}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="button"
        onClick={() => verify(pin)}
        disabled={pin.length !== 4 || verifying}
        className="w-full text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
        style={{ borderColor: "var(--fg)" }}
      >
        {verifying ? "확인 중..." : "확인"}
      </button>
    </div>
  );
}
