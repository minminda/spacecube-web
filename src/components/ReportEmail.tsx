import type { ReportEmailData } from "@/lib/monthlyReport";
import { CLUSTER_LABELS } from "@/lib/guestbookClusterStyle";

/* ── 월간 운영 리포트 — 관리자 Preview와 실제 메일이 공유하는 단일 컴포넌트 ──────────
   이메일 클라이언트는 Tailwind/외부 스타일시트/CSS 변수를 신뢰할 수 없으므로 전부 인라인
   style로만 작성한다(이 프로젝트의 나머지 화면과는 다른 관례지만, 이 컴포넌트에 한해서는
   의도적인 예외). 관리자 페이지(브라우저에서 그대로 렌더)와 실제 메일 발송 경로
   (react-dom/server의 renderToStaticMarkup으로 HTML 문자열 추출) 양쪽에서 이 파일 하나만
   쓴다 — 디자인이 두 곳에서 갈라지지 않는다. ─────────────────────────────────── */

const COLOR = {
  fg: "#141414",
  dim: "#8c8c8c",
  border: "#e5e5e5",
  bg: "#ffffff",
  tagBg: "#f5f5f3",
  up: "#1a7f37",
  down: "#c0392b",
};

const CHANGE_ARROW: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "—",
};

function formatDateRangeLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart);
  const endInclusive = new Date(new Date(periodEnd).getTime() - 86400000);
  const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(start)} – ${fmt(endInclusive)}`;
}

interface Props {
  data: ReportEmailData;
  /** 자동 생성 해설/제안 문구(headline·이번 달 변화·공간 경험 요약·다음 달 제안)를 보여줄지.
      파일럿 기간(ENABLE_REPORT_AI_ANALYSIS=false)에는 원자료 섹션만 남기고 이 문구들은 숨긴다.
      기본값 false — 서버가 명시적으로 켜야 노출된다. */
  showAnalysis?: boolean;
}

export default function ReportEmail({ data, showAnalysis = false }: Props) {
  return (
    <div style={{ background: COLOR.bg, color: COLOR.fg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
      <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: COLOR.dim, margin: "0 0 4px" }}>공간큐브 / 운영 리포트</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 }}>{data.spaceName} {data.periodLabel} 운영 리포트</h1>
      <p style={{ fontSize: 12, color: COLOR.dim, margin: "0 0 28px" }}>{formatDateRangeLabel(data.periodStart, data.periodEnd)}</p>

      {/* ① 이번 달 한눈에 보기 (자동 생성 해설 — 파일럿 기간 숨김) */}
      {showAnalysis && (
        <Section>
          <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{data.headline}</p>
        </Section>
      )}

      {/* ② 핵심 KPI */}
      <Section title="핵심 KPI">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {chunk(data.kpiCards, 2).map((row, i) => (
              <tr key={i}>
                {row.map((card) => (
                  <td key={card.key} style={{ width: "50%", padding: 4, verticalAlign: "top" }}>
                    <div style={{ border: `1px solid ${COLOR.border}`, padding: "12px 14px" }}>
                      <p style={{ fontSize: 11, color: COLOR.dim, margin: "0 0 6px" }}>{card.label}</p>
                      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{card.value}</p>
                      {card.change && (
                        <p style={{ fontSize: 11, margin: "6px 0 0", color: card.change.direction === "up" ? COLOR.up : card.change.direction === "down" ? COLOR.down : COLOR.dim }}>
                          {CHANGE_ARROW[card.change.direction]} {card.change.deltaLabel}
                        </p>
                      )}
                    </div>
                  </td>
                ))}
                {row.length === 1 && <td style={{ width: "50%" }} />}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ③ 이번 달 변화 (자동 생성 해설 — 파일럿 기간 숨김) */}
      {showAnalysis && data.changeInsights.length > 0 && (
        <Section title="이번 달 변화">
          {data.changeInsights.map((text, i) => (
            <p key={i} style={{ fontSize: 13, lineHeight: 1.7, margin: i === 0 ? 0 : "10px 0 0", paddingLeft: 12, borderLeft: `2px solid ${COLOR.border}` }}>
              {text}
            </p>
          ))}
        </Section>
      )}

      {/* ④ 이번 달 방문자들이 남긴 흔적 */}
      {data.featuredPosts.length > 0 && (
        <Section title="이번 달 함께 공감한 흔적">
          {data.featuredPosts.map((post, i) => (
            <div key={i} style={{ border: `1px solid ${COLOR.border}`, padding: "12px 14px", marginTop: i === 0 ? 0 : 10 }}>
              <p style={{ fontSize: 10, color: COLOR.dim, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>
                {CLUSTER_LABELS[post.clusterType] ?? post.clusterType} · 공감 {post.reactionCount}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>&ldquo;{post.content}&rdquo;</p>
            </div>
          ))}
        </Section>
      )}

      {/* ⑤ 질문별 참여 */}
      {data.questionParticipation.length > 0 && (
        <Section title="질문별 참여">
          {data.questionParticipation.map((q, i) => (
            <div key={q.type} style={{ marginTop: i === 0 ? 0 : 12 }}>
              <p style={{ fontSize: 11, color: COLOR.dim, margin: "0 0 2px" }}>{CLUSTER_LABELS[q.type] ?? q.type}</p>
              <p style={{ fontSize: 14, margin: "0 0 4px" }}>{q.label}</p>
              <p style={{ fontSize: 13, color: COLOR.dim, margin: 0 }}>응답 {q.count}개 ({q.percent}%)</p>
            </div>
          ))}
        </Section>
      )}

      {/* ⑥ 공간 경험 요약 (자동 생성 해설 — 파일럿 기간 숨김) */}
      {showAnalysis && (
        <Section title="공간 경험 요약">
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>{data.usageSummary}</p>
        </Section>
      )}

      {/* ⑦ 다음 달 제안 (자동 생성 해설 — 파일럿 기간 숨김) */}
      {showAnalysis && data.suggestions.length > 0 && (
        <Section title="다음 달 제안">
          {data.suggestions.map((text, i) => (
            <p key={i} style={{ fontSize: 13, lineHeight: 1.7, margin: i === 0 ? 0 : "10px 0 0", paddingLeft: 12, borderLeft: `2px solid ${COLOR.border}` }}>
              {text}
            </p>
          ))}
        </Section>
      )}

      {/* ⑧ 운영 메모 */}
      {data.operatorNote && (
        <Section title="이번 달 메모">
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: COLOR.dim, whiteSpace: "pre-line" }}>{data.operatorNote}</p>
        </Section>
      )}

      <p style={{ fontSize: 11, color: COLOR.dim, marginTop: 32, paddingTop: 16, borderTop: `1px solid ${COLOR.border}` }}>
        공간큐브 · 이 리포트는 공간에서 수집된 데이터를 기반으로 자동 생성되었습니다.
      </p>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${COLOR.border}`, paddingTop: 20, marginTop: 20 }}>
      {title && <p style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: COLOR.dim, margin: "0 0 12px" }}>{title}</p>}
      {children}
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
