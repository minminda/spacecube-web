import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "추천 방식 — 공간큐브",
  description: "공간큐브는 평점이나 인기순이 아니라, 사용자가 공간에서 남긴 태그를 바탕으로 취향과 닮은 공간을 찾습니다.",
};

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)" }} />;
}

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
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {/* 타이틀 */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>추천 방식</p>
        <h1 className="text-2xl font-bold leading-snug">
          공간큐브는 어떻게<br />공간을 추천할까요?
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          공간큐브는 평점이나 인기순이 아니라,<br />
          사용자가 공간에서 남긴 태그를 바탕으로<br />
          취향과 닮은 공간을 찾습니다.
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
            <p className="text-base font-semibold">공간을 기록합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            사용자는 공간을 방문한 뒤,<br />
            그 공간에서 느낀 태그를 최대 2개 선택합니다.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["조용한", "영감 있는", "편안한", "독특한", "다시 오고 싶은", "감각 있는", "따뜻한", "집중되는"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 2 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="02" />
            <p className="text-base font-semibold">취향을 집계합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            공간 3곳 이상을 기록하면,<br />
            선택한 태그가 누적되어 사용자의 취향 프로파일이 만들어집니다.
          </p>
          <div className="space-y-1.5 py-2 px-3 border" style={{ borderColor: "var(--border)" }}>
            {[["조용한", "3"], ["집중되는", "2"], ["감각 있는", "1"]].map(([tag, count]) => (
              <div key={tag} className="flex justify-between text-xs" style={{ color: "var(--dim)" }}>
                <span>{tag}</span>
                <span style={{ color: "var(--fg)" }}>{count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            이 값은 사용자가 어떤 분위기의 공간을<br />
            반복해서 좋아했는지 보여줍니다.
          </p>
        </div>

        {/* 3 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="03" />
            <p className="text-base font-semibold">공간 태그와 비교합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            각 공간은 그 공간에 어울리는 태그를 가지고 있습니다.<br />
            사용자의 취향 태그와 공간 태그가 얼마나 겹치는지 비교합니다.
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
        </div>

        {/* 4 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="04" />
            <p className="text-base font-semibold">취향과 닮은 공간을 보여줍니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            겹치는 태그가 많을수록,<br />
            그리고 사용자가 자주 선택한 태그와 일치할수록<br />
            취향에 더 가까운 공간으로 판단합니다.
          </p>
          <p
            className="text-xs px-3 py-2 border-l-2 leading-relaxed"
            style={{ borderColor: "var(--fg)", color: "var(--dim)" }}
          >
            &ldquo;조용한, 집중되는 태그가 최근 기록과 비슷합니다.&rdquo;
          </p>
        </div>

        {/* 5 */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="05" />
            <p className="text-base font-semibold">지역 안에서 먼저 추천합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            공간큐브는 지역 기반 서비스이기 때문에,<br />
            사용자가 선택한 지역 안에서 먼저 취향과 가까운 공간을 보여줍니다.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            망원을 선택한 경우, 망원 안에 있는 공간 중<br />
            사용자의 취향 태그와 가까운 공간이 먼저 표시됩니다.<br /><br />
            멀리 있는 좋은 공간보다,<br />
            지금 갈 수 있는 나와 맞는 공간을 찾기 위한 방식입니다.
          </p>
        </div>
      </section>

      <Divider />

      {/* ── 앞으로의 추천 ────────────────────────── */}
      <section className="space-y-8">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
            // 추천은 더 정교해집니다
          </p>
          <p className="text-xs" style={{ color: "var(--border)" }}>
            현재 구현 중이거나 앞으로 추가될 방향입니다.
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
            앞으로는 사용자의 취향을 조금 넓혀줄 수 있는 공간도 함께 제안할 수 있습니다.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            조용한 / 집중되는 / 편안한 공간을 주로 기록했다면,<br />
            완전히 반대되는 공간이 아니라<br />
            조용하지만 조금 더 감각 있는 공간,<br />
            편안하지만 새로운 대화가 생길 수 있는 공간처럼<br />
            한 걸음 확장된 공간을 제안합니다.
          </p>
          <p
            className="text-xs px-3 py-2 border-l-2 leading-relaxed"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            &ldquo;익숙한 취향에서 조금 넓어질 수 있는 공간입니다.&rdquo;
          </p>
        </div>

        {/* B */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="B" />
            <p className="text-base font-semibold">행동 데이터를 함께 반영합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            단순히 태그만 보는 것이 아니라,<br />
            사용자의 행동 데이터도 함께 반영할 수 있습니다.
          </p>
          <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
            {[
              "어떤 공간을 다시 방문했는지",
              "어떤 공간을 저장했는지",
              "어떤 추천을 실제로 눌렀는지",
              "어떤 공간을 기록까지 남겼는지",
            ].map((item) => (
              <p key={item}>· {item}</p>
            ))}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            이런 행동은 단순한 선택보다 더 강한 취향 신호가 될 수 있습니다.
          </p>
        </div>

        {/* C */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="C" />
            <p className="text-base font-semibold">비슷한 취향의 사용자 흐름을 참고합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            기록이 충분히 쌓이면,<br />
            나와 비슷한 취향을 가진 사람들이 어떤 공간을 좋아했는지도 참고할 수 있습니다.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            단, 공간큐브는 사람을 팔로우하게 만드는 서비스가 아니라,<br />
            공간을 따라 취향을 발견하는 서비스라는 점을 유지합니다.
          </p>
        </div>

        {/* D */}
        <div className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <SectionIndex n="D" />
            <p className="text-base font-semibold">공간 간 연결을 강화합니다</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            단일 공간 추천을 넘어,<br />
            하나의 지역 안에서 이어질 수 있는 공간 흐름도 제안할 수 있습니다.
          </p>
          <div className="space-y-1 text-xs py-2 px-3 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            <p>조용히 책을 읽는 공간</p>
            <p style={{ color: "var(--border)" }}>→</p>
            <p>천천히 차를 마시는 공간</p>
            <p style={{ color: "var(--border)" }}>→</p>
            <p>낮은 대화가 가능한 공간</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            공간을 하나씩 나열하는 것이 아니라,<br />
            사용자의 상태와 취향에 맞는 작은 탐험 흐름을 만들 수 있습니다.
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
            "별점순으로 추천하지 않습니다.",
            "리뷰 수로 추천하지 않습니다.",
            "단순 인기순으로 추천하지 않습니다.",
            "광고비를 기준으로 추천하지 않습니다.",
            "무조건 많은 공간을 보여주지 않습니다.",
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
          공간큐브의 추천은 좋은 공간을 고르는 일이 아니라,<br />
          나와 맞는 공간을 발견하는 과정에 가깝습니다.
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
