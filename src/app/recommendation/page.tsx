import type { Metadata } from "next";
import Link from "next/link";
import Divider from "@/components/Divider";

export const metadata: Metadata = {
  title: "추천 방식 — 공간큐브",
  description: "공간큐브는 인기나 평점보다, 사용자가 실제 공간에서 남긴 경험 데이터를 바탕으로 다음 공간을 찾습니다.",
};

function SectionIndex({ n }: { n: string }) {
  return (
    <span className="text-xs tabular-nums" style={{ color: "var(--border)" }}>{n}</span>
  );
}

export default function RecommendationPage() {
  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-10">

      {/* 헤더 */}
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / 추천 방식</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; 홈</Link>
        </div>
        <Divider />
      </div>

      {/* 타이틀 */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>추천 방식</p>
        <h1 className="text-2xl font-bold leading-snug">
          공간큐브는 어떻게<br />나와 맞는 공간을 찾을까요?
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          공간큐브는 인기나 평점보다,<br />
          사용자가 실제 공간에서 남긴 경험 데이터를 바탕으로<br />
          다음 공간을 찾습니다
        </p>
      </div>

      <Divider />

      {/* ── 현재 추천 방식 ────────────────────────── */}
      <section className="space-y-8">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          // 현재 추천 방식
        </p>

        {/* 1 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="01" />
            <p className="text-base font-semibold">공간을 직접 경험합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            추천은 검색 기록이 아니라,<br />
            실제 공간에서 QR을 인식하고 경험한 기록에서 시작됩니다
          </p>
        </div>

        {/* 2 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="02" />
            <p className="text-base font-semibold">취향 점수를 남깁니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            공간을 경험한 뒤, 이 공간이 나와 얼마나 잘 맞았는지<br />
            1~5점의 취향 점수로 남깁니다
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            방명록 작성은 선택이며, 점수만 저장해도 추천에 반영됩니다
          </p>
        </div>

        {/* 3 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="03" />
            <p className="text-base font-semibold">가장 최근의 평가를 반영합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            같은 공간을 다시 방문해 점수를 남기면,<br />
            이전 점수를 계속 쌓지 않고 가장 최근 평가를 사용합니다
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            취향이 바뀌거나 경험이 달라진 점을 반영하기 위한 방식입니다
          </p>
        </div>

        {/* 4 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="04" />
            <p className="text-base font-semibold">공간 데이터와 비교합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            사용자가 여러 공간에서 남긴 경험과<br />
            각 공간이 가진 특성을 비교해 잘 맞을 가능성이 높은 공간을 찾습니다
          </p>
          <div className="space-y-2">
            {[
              { name: "라이팅룸", tags: ["조용한", "집중되는", "영감 있는"] },
              { name: "뮤직컴플렉스", tags: ["감각 있는", "집중되는", "독특한"] },
            ].map((space) => (
              <div key={space.name} className="flex items-start gap-3 text-xs py-2 px-3 border" style={{ borderColor: "var(--border)" }}>
                <span className="font-medium flex-shrink-0" style={{ color: "var(--fg)" }}>{space.name}</span>
                <span style={{ color: "var(--dim)" }}>{space.tags.join(" · ")}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            공간 3곳 이상을 기록하면 취향과 닮은 공간 추천이 본격적으로 시작됩니다<br />
            공간을 처음 경험한 직후에도, 그 공간과 잘 맞는 다음 한 곳을 바로 보여주는 화면도 있어요
          </p>
        </div>

        {/* 5 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="05" />
            <p className="text-base font-semibold">다음 공간을 제안합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            현재 탐험할 수 있는 지역과 공간 안에서<br />
            사용자의 기록과 가까운 공간을 우선적으로 보여줍니다
          </p>
        </div>

        {/* 6 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="06" />
            <p className="text-base font-semibold">취향이 비슷한 사람도 참고할 수 있습니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            기록이 충분히 쌓이면, 나와 취향이 닮은 다른 사람들이<br />
            어떤 공간을 좋아했는지도 함께 볼 수 있습니다
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            단, 공간큐브는 사람을 팔로우하게 만드는 서비스가 아니라,<br />
            공간을 따라 취향을 발견하는 서비스라는 점을 유지합니다
          </p>
        </div>
      </section>

      <Divider />

      {/* ── 추천과 방명록의 관계 ────────────────────────── */}
      <section className="space-y-3">
        <p
          className="text-sm font-semibold leading-relaxed pl-3 border-l-2"
          style={{ borderColor: "var(--fg)" }}
        >
          추천은 기록의 결과이고, 방명록은 선택 경험입니다
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          취향 점수를 저장하면 추천 데이터가 만들어집니다<br />
          방문자의 이야기를 남기는 방명록은 원할 때만 참여할 수 있습니다
        </p>
      </section>

      <Divider />

      {/* ── 앞으로의 추천 ────────────────────────── */}
      <section className="space-y-8">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
            // 추천은 더 정교해집니다
          </p>
          <p className="text-xs" style={{ color: "var(--border)" }}>
            아직 구현되지 않은, 앞으로 추가될 방향입니다
          </p>
        </div>

        {/* A */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="A" />
            <p className="text-base font-semibold">비슷한 공간만 추천하지 않습니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            취향과 닮은 공간을 먼저 보여주지만,<br />
            앞으로는 사용자의 취향을 조금 넓혀줄 수 있는 공간도 함께 제안할 수 있습니다
          </p>
        </div>

        {/* B */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="B" />
            <p className="text-base font-semibold">행동 데이터를 함께 반영합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            취향 점수만이 아니라,<br />
            재방문·저장 같은 사용자의 다른 행동 데이터도 함께 반영할 수 있습니다
          </p>
        </div>

        {/* C */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="C" />
            <p className="text-base font-semibold">공간 간 연결을 강화합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            단일 공간 추천을 넘어,<br />
            하나의 지역 안에서 이어질 수 있는 공간 흐름도 제안할 수 있습니다
          </p>
        </div>
      </section>

      <Divider />

      {/* ── 추천하지 않는 방식 ───────────────────── */}
      <section className="space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          // 공간큐브는 이렇게 추천하지 않습니다
        </p>
        <div className="space-y-2 text-sm" style={{ color: "var(--dim)" }}>
          {[
            "별점순으로 추천하지 않습니다",
            "리뷰 수로 추천하지 않습니다",
            "단순 인기순으로 추천하지 않습니다",
            "광고비를 기준으로 추천하지 않습니다",
            "방명록 작성량으로 추천하지 않습니다",
          ].map((item) => (
            <p key={item} className="flex gap-3">
              <span style={{ color: "var(--border)" }}>—</span>
              <span>{item}</span>
            </p>
          ))}
        </div>
        <p
          className="text-sm leading-relaxed pt-2 pl-3 border-l-2"
          style={{ borderColor: "var(--fg)", color: "var(--dim)" }}
        >
          공간큐브의 추천은 가장 유명한 공간을 고르는 일이 아니라,<br />
          지금의 나와 잘 맞을 가능성이 있는 공간을 발견하는 과정입니다
        </p>
      </section>

      <Divider />

      {/* 하단 링크 */}
      <div className="flex gap-4 text-xs pb-4">
        <Link href="/discover" style={{ color: "var(--dim)" }}>
          공간 탐색하기 →
        </Link>
        <Link href="/archive" style={{ color: "var(--dim)" }}>
          내 아카이브 →
        </Link>
      </div>

    </main>
  );
}
