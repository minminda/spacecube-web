"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ArchiveSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultValue);
  const [value, setValue] = useState(defaultValue ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/archive?q=${encodeURIComponent(value.trim())}`);
    } else {
      router.push("/archive");
    }
  }

  function handleClear() {
    setValue("");
    setOpen(false);
    router.push("/archive");
  }

  return (
    <div className="flex items-center gap-2">
      {open ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="공간 이름..."
            className="text-xs bg-transparent border-b outline-none px-1"
            style={{ borderColor: "var(--dim)", color: "var(--fg)", width: "110px" }}
          />
          <button type="button" onClick={handleClear} className="text-xs" style={{ color: "var(--dim)" }}>
            [✕]
          </button>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="text-xs" style={{ color: "var(--dim)" }}>
          [⌕]
        </button>
      )}
    </div>
  );
}
