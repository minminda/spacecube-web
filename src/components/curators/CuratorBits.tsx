import Link from "next/link";
import Image from "next/image";
import EdImage from "@/components/editorial/EdImage";
import PartnerMark from "@/components/editorial/PartnerMark";
import SaveButton from "@/components/editorial/SaveButton";
import { spaceCoverImage, spaceHref, type SpaceView } from "@/lib/editorial/types";

/** 프로필 이미지 — 없으면 이름 첫 글자(가상 큐레이터는 얼굴 사진을 쓰지 않는다). */
export function CuratorAvatar({ name, imageUrl, size = 56 }: { name: string; imageUrl: string | null; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden" style={{ width: size, height: size, background: "var(--ed-soft)", borderRadius: "50%" }}>
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span aria-hidden className="font-bold" style={{ fontSize: size * 0.4, color: "var(--ed-fg)" }}>{name.slice(0, 1)}</span>
      )}
    </span>
  );
}

/** 프로토타입 표시 — 가상 데이터가 보이는 화면 맨 위에 항상. */
export function PrototypeBanner({ demo }: { demo: boolean }) {
  return (
    <div style={{ background: "#fff6e6", borderBottom: "1px solid #f0dcb0" }}>
      <p className="ed-container py-2.5 text-xs leading-relaxed" style={{ color: "#8a5a00" }}>
        <strong className="font-semibold">PROTOTYPE</strong>
        <span className="ml-2">
          {demo
            ? "큐레이터 기능 검증용 화면입니다. 큐레이터와 일부 공간은 가상으로 만든 것이며, 관리자에게만 보입니다."
            : "큐레이터 기능을 검증하는 중인 화면입니다."}
        </span>
      </p>
    </div>
  );
}

export function TasteChips({ tags, size = "sm" }: { tags: string[]; size?: "sm" | "md" }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {tags.map((t) => (
        <li key={t} className={size === "md" ? "text-sm font-semibold" : "text-xs"} style={size === "md" ? undefined : { color: "var(--ed-dim)" }}>
          #{t}
        </li>
      ))}
    </ul>
  );
}

export interface PickCardProps {
  space: SpaceView;
  /** 큐레이터 한 줄 코멘트 */
  comment?: { text: string; by: string } | null;
  /** "민지님과 공간큐브가 추천한 곳" */
  curatorsLine?: string;
  /** 왜 이 결과에 나왔는지(실제 조건으로만) */
  reason?: string | null;
  save: { saved: boolean; loggedIn: boolean };
  priority?: boolean;
}

/**
 * 큐레이터가 고른 공간 카드 — 객관적 정보보다 "왜 골랐는지"가 먼저 보이도록 코멘트를 크게.
 * 가로형(사진 왼쪽, 글 오른쪽)으로 한 화면에 여러 후보를 빠르게 훑을 수 있게 한다. 별점·순위 없음.
 */
export function PickCard({ space, comment, curatorsLine, reason, save, priority }: PickCardProps) {
  const href = spaceHref(space.slug);
  const traits = [space.category, ...(space.tags ?? [])].filter(Boolean).slice(0, 4);
  return (
    <article className="grid grid-cols-[112px_1fr] md:grid-cols-[220px_1fr] gap-4 md:gap-8 py-6 md:py-8" style={{ borderBottom: "1px solid var(--ed-line)" }}>
      <Link href={href} tabIndex={-1} aria-hidden>
        <EdImage image={spaceCoverImage(space)} ratio="4 / 5" sizes="(min-width: 768px) 220px, 112px" priority={priority} />
      </Link>
      <div className="min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="group min-w-0">
            <p className="flex items-baseline gap-2 text-lg md:text-xl font-bold leading-snug">
              <span className="group-hover:underline underline-offset-4">{space.name}</span>
              {space.cubeAvailable && <PartnerMark size={14} />}
            </p>
            <p className="pt-0.5 text-xs" style={{ color: "var(--ed-dim)" }}>
              {space.area}
              {space.isDemo && <span className="ml-2">· 가상 공간</span>}
            </p>
          </Link>
          <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={save.saved} loggedIn={save.loggedIn} />
        </div>
        {traits.length > 0 && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{traits.join(" · ")}</p>}
        {comment && (
          <blockquote className="pt-1 text-[15px] md:text-base leading-relaxed break-keep">
            “{comment.text}”
            <span className="block pt-1 text-xs" style={{ color: "var(--ed-dim)" }}>— {comment.by}</span>
          </blockquote>
        )}
        {curatorsLine && <p className="text-xs font-semibold">{curatorsLine}</p>}
        {reason && <p className="text-xs leading-relaxed" style={{ color: "var(--ed-dim)" }}>{reason}</p>}
        <div className="flex gap-4 pt-1 text-xs">
          <Link href={href} className="font-semibold hover:underline underline-offset-4">공간 보기 →</Link>
          {space.mapUrl && <a href={space.mapUrl} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">지도 ↗</a>}
        </div>
      </div>
    </article>
  );
}

/** 컬렉션 카드 — 제목 · 큐레이터 · 지역 · 키워드 · 공간 수. */
export function CollectionCard({
  c,
  showCurator = true,
}: {
  c: { slug: string; title: string; description: string; area: string | null; keywords: string[]; cover: { src: string | null; alt: string; position?: string }; curator: { name: string; isOfficial: boolean }; picks: unknown[] };
  showCurator?: boolean;
}) {
  return (
    <Link href={`/collections/${c.slug}`} className="group block">
      <EdImage image={c.cover} ratio="4 / 3" sizes="(min-width: 768px) 33vw, 100vw" />
      <div className="pt-4 space-y-1.5">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>
          {showCurator ? `${c.curator.isOfficial ? c.curator.name : `${c.curator.name}의 컬렉션`}` : "Collection"}
          {c.area ? ` · ${c.area}` : ""} · {c.picks.length} spaces
        </p>
        <p className="text-lg md:text-xl font-bold leading-snug break-keep group-hover:underline underline-offset-4">{c.title}</p>
        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--ed-dim)" }}>{c.description}</p>
        <TasteChips tags={c.keywords} />
      </div>
    </Link>
  );
}
