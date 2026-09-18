import Link from "next/link";

interface Props {
  spaceId: string;
  active: "core" | "story";
  from: string;
  to: string;
}

const TABS = [
  { key: "core" as const, label: "핵심 리포트", path: "report" },
  { key: "story" as const, label: "스토리 분석", path: "report/story" },
];

/**
 * "핵심 리포트"(운영 퍼널/KPI 요약)와 "스토리 분석"(Scene 단위 Story Depth) 사이를
 * 오가는 최소 탭 — 기존 관리자 화면에 별도 탭 컴포넌트가 없어 텍스트 링크 형태로 새로
 * 만들었다. 현재 선택된 기간(from/to)을 그대로 유지한 채 이동해야 §14(기존 KPI 필터
 * 재사용) 원칙이 지켜진다.
 */
export default function ReportTabs({ spaceId, active, from, to }: Props) {
  const qs = `?from=${from}&to=${to}`;
  return (
    <div className="no-print flex gap-5" style={{ borderBottom: "1px solid var(--border)" }}>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/${spaceId}/${tab.path}${qs}`}
          className="text-xs uppercase tracking-widest pb-2 transition-opacity"
          style={{
            color: active === tab.key ? "var(--fg)" : "var(--dim)",
            fontWeight: active === tab.key ? 600 : 400,
            borderBottom: active === tab.key ? "2px solid var(--fg)" : "2px solid transparent",
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
