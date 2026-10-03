import Link from "next/link";
import EdImage from "./EdImage";
import { curationEyebrow, type CurationView } from "@/lib/editorial/types";

/** 큐레이션 카드 — 대표 이미지 · 번호/지역/관점 · 제목 · 요약 · 공간 수. */
export default function CurationCard({ c, ratio = "4 / 5", sizes = "(min-width: 768px) 33vw, 100vw" }: { c: CurationView; ratio?: string; sizes?: string }) {
  return (
    <Link href={`/curation/${c.slug}`} className="group block">
      <EdImage image={c.cover} ratio={ratio} sizes={sizes} />
      <div className="pt-4 space-y-2">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{curationEyebrow(c)}</p>
        <p className="text-xl md:text-2xl font-bold leading-snug tracking-tight break-keep group-hover:underline underline-offset-4">{c.title}</p>
        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--ed-dim)" }}>{c.summary}</p>
        <p className="text-xs pt-1" style={{ color: "var(--ed-dim)" }}>공간 {c.spaces.length}곳</p>
      </div>
    </Link>
  );
}
