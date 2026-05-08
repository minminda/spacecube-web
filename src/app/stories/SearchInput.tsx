"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (q) {
      next.set("q", q);
    } else {
      next.delete("q");
    }
    router.push(`/stories${next.toString() ? `?${next.toString()}` : ""}`);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    next.delete("page");
    router.push(`/stories${next.toString() ? `?${next.toString()}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          defaultValue={defaultValue}
          placeholder="이야기 검색…"
          className="w-full text-sm px-3 py-2 border bg-transparent outline-none focus:border-[var(--fg)] transition-colors pr-8"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        {defaultValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--dim)" }}
            aria-label="검색 초기화"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        검색
      </button>
    </form>
  );
}
