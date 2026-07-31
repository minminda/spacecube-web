import Link from "next/link";
import type { Metadata } from "next";
import Divider from "@/components/Divider";
import CubeGlyph from "@/components/CubeGlyph";

export const metadata: Metadata = {
  title: "공간큐브 소개",
  description: "검색해도 나오지 않는 사람의 이야기를 통해 공간을 다르게 보게 만드는 서비스입니다.",
};

const ICON_SIZE = 18;

function DiscoverIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <CubeGlyph outlineWidth={1.3} edgeWidth={1.1} />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14 V9.5 a1 1 0 0 1 1-1 H14" />
      <path d="M32 14 V9.5 a1 1 0 0 0 -1-1 H26" />
      <path d="M8 26 V30.5 a1 1 0 0 0 1 1 H14" />
      <path d="M32 26 V30.5 a1 1 0 0 1 -1 1 H26" />
      <rect x="16" y="16" width="8" height="8" rx="1" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M20 13 C17 10.5 12 10 8 10.5 V28.5 C12 28 17 28.5 20 31" />
      <path d="M20 13 C23 10.5 28 10 32 10.5 V28.5 C28 28 23 28.5 20 31" />
      <line x1="20" y1="13" x2="20" y2="31" />
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M20 8 L23.5 16 L32 17 L25.5 23 L27.5 32 L20 27 L12.5 32 L14.5 23 L8 17 L16.5 16 Z" />
    </svg>
  );
}

function GuestbookIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <rect x="9" y="9" width="18" height="22" rx="1.5" />
      <line x1="13" y1="15" x2="21" y2="15" />
      <line x1="13" y1="20" x2="19" y2="20" />
      <path d="M24 25 L31 18 a1.6 1.6 0 0 1 2.2 2.2 L26 27 L23 28 Z" />
    </svg>
  );
}

function RecommendIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <circle cx="20" cy="20" r="12" />
      <path d="M24.5 15.5 L21.5 21.5 L15.5 24.5 L18.5 18.5 Z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <rect x="8" y="11" width="24" height="6" rx="1" />
      <path d="M10 17 V29 a1.5 1.5 0 0 0 1.5 1.5 h17 a1.5 1.5 0 0 0 1.5-1.5 V17" />
      <line x1="17" y1="22.5" x2="23" y2="22.5" />
    </svg>
  );
}

const STEPS = [
  { Icon: DiscoverIcon, title: "공간 발견" },
  { Icon: ScanIcon, title: "QR 스캔" },
  { Icon: StoryIcon, title: "공간 이야기" },
  { Icon: ScoreIcon, title: "취향 점수" },
  { Icon: GuestbookIcon, title: "방명록" },
  { Icon: RecommendIcon, title: "공간 추천" },
  { Icon: ArchiveIcon, title: "공간 아카이브" },
];

export default function AboutPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-6 pt-10 pb-6">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <span className="text-xs" style={{ color: "var(--border)" }}>ABOUT</span>
      </div>

      <Divider />

      <section className="px-6 py-16 space-y-8">
        <p className="text-2xl font-bold leading-snug">
          공간을 만든 사람을 이해하면,
          <br />
          같은 공간도
          <br />
          조금 다르게 보입니다
        </p>
        <div className="space-y-4">
          <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
            공간큐브는 검색으로는 알기 어려운
            <br />
            공간과 사람의 이야기를
            <br />
            발견하게 하는 서비스입니다
          </p>
          <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
            메뉴, 영업시간, 평점보다
            <br />
            그 공간이 어떤 시간을 지나
            <br />
            지금의 모습이 되었는지를 기록합니다
          </p>
        </div>
      </section>

      <Divider />

      <section className="px-6 py-16 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>왜 공간큐브를 만들었나요?</p>
        <div className="space-y-4">
          <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
            우리는 많은 공간을 검색하지만,
            <br />
            그 공간을 만든 사람의 시간까지는
            <br />
            알기 어렵습니다
          </p>
          <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
            멋진 결과만 보면
            <br />
            공간은 감탄의 대상이 되지만,
            <br />
            그 뒤의 선택과 실패, 반복된 시간을 알게 되면
            <br />
            공간은 한 사람의 이야기로 기억됩니다
          </p>
        </div>
      </section>

      <Divider />

      <section className="px-6 py-16 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>무엇을 담나요?</p>
        <ul className="space-y-3">
          {[
            "처음 이 일을 좋아하게 된 순간",
            "작게 시작했던 시절",
            "포기하지 못했던 선택",
            "매일 지키는 작은 습관",
            "아직 버리지 못한 물건",
            "오래 기억하는 손님",
            "그 시간이 현재 공간에 남은 방식",
          ].map((s, i) => (
            <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>· {s}</li>
          ))}
        </ul>
      </section>

      <Divider />

      <section className="px-6 py-16 space-y-8">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>어떻게 경험하나요?</p>
          <div className="space-y-4">
            <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
              공간에 놓인 큐브를 발견하고 QR을 인식하면,
              <br />
              그 장소에서만 만날 수 있는 이야기가 열립니다
            </p>
            <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
              이야기를 읽고 나면
              <br />
              사진 속 공간이 아니라
              <br />
              지금 눈앞의 자리와 물건, 사람을
              <br />
              다시 바라보게 됩니다
            </p>
          </div>
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-x-2 gap-y-5 pt-1">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center text-center gap-1">
              <span className="text-[10px] tabular-nums" style={{ color: "var(--border)" }}>{i + 1}</span>
              <div style={{ color: "var(--dim)" }}><s.Icon /></div>
              <p className="text-xs font-medium leading-tight break-keep" style={{ color: "var(--dim)" }}>
                {s.title}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Divider />

      <section className="px-6 py-16 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브가 하지 않는 것</p>
        <ul className="space-y-2.5">
          {[
            "검색 가능한 정보를 반복하지 않습니다",
            "운영자를 완벽한 사람처럼 포장하지 않습니다",
            "억지 감동이나 성공담을 만들지 않습니다",
            "별점과 인기순으로 공간의 가치를 정하지 않습니다",
          ].map((item, i) => (
            <li key={i} className="text-sm leading-relaxed pl-3" style={{ color: "var(--dim)", borderLeft: "1px solid var(--border)" }}>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <Divider />

      <section className="px-6 py-16 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브는</p>
        <div className="space-y-4 pl-4" style={{ borderLeft: "2px solid var(--fg)" }}>
          <p className="text-xl font-bold leading-snug">
            공간을 완벽하게 설명하는
            <br />
            서비스가 아니라,
          </p>
          <p className="text-xl font-bold leading-snug">
            그 공간을 조금 더
            <br />
            인간적으로 기억하게
            <br />
            만드는 서비스입니다
          </p>
        </div>
      </section>

      <Divider />

      <div className="px-6 py-10">
        <Link
          href="/discover"
          className="tap-target flex items-center justify-center w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          공간 둘러보기 →
        </Link>
      </div>
    </main>
  );
}
