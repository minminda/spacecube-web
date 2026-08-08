import type { ReportEmailData, ReportKpiCard } from "@/lib/monthlyReport";
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

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ISO 문자열을 KST 달력일 기준 "YYYY.MM.DD"로 표시한다. Date의 로컬 getter(getFullYear 등)를
 *  쓰면 서버 프로세스가 UTC로 도는 배포 환경에서 자정 근처 날짜가 하루 밀려 보일 수 있어
 *  (실제로 admin/[id]/report의 이전 리포트 목록 라벨에서 이 패턴의 버그가 발견된 적 있다),
 *  KST_OFFSET_MS를 더한 뒤 UTC getter로 읽는 방식만 쓴다. */
function formatKstDate(iso: string): string {
  const k = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return `${k.getUTCFullYear()}.${String(k.getUTCMonth() + 1).padStart(2, "0")}.${String(k.getUTCDate()).padStart(2, "0")}`;
}

function formatDateRangeLabel(periodStart: string, periodEnd: string): string {
  const endInclusiveIso = new Date(new Date(periodEnd).getTime() - 86400000).toISOString();
  return `${formatKstDate(periodStart)} – ${formatKstDate(endInclusiveIso)}`;
}

interface Props {
  data: ReportEmailData;
  /** 헤드라인(①)·공간 경험 요약(⑥) — 규칙 기반 해석 문장, 사실 기반 설명이라 파일럿에서도 노출한다.
      기본값 false — 호출부가 명시적으로 켜야 노출된다. */
  showHeadline?: boolean;
  /** 이번 기간 변화(③) — 전월 대비 비교 문장. previous 데이터가 의미 있는 월간 자동 리포트
      맥락에서만 켠다(파일럿의 자유 기간 조회는 "전월" 개념이 없어 기본 false). */
  showComparison?: boolean;
  /** 다음 제안(⑦) — 운영 조언 성격의 문장. 파일럿에서는 "과한 운영 조언"을 피하기 위해
      기본 false로 둔다(comparison과 별개 플래그 — 이전 기간 유무와 무관하게 독립적으로 켤 수 있다). */
  showSuggestions?: boolean;
}

export default function ReportEmail({ data, showHeadline = false, showComparison = false, showSuggestions = false }: Props) {
  return (
    <div style={{ background: COLOR.bg, color: COLOR.fg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
      <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: COLOR.dim, margin: "0 0 4px" }}>공간큐브 / 운영 리포트</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 }}>{data.spaceName} 운영 리포트</h1>
      <p style={{ fontSize: 12, color: COLOR.dim, margin: "0 0 28px" }}>{formatDateRangeLabel(data.periodStart, data.periodEnd)}</p>

      {/* ① 이번 기간 한눈에 보기 (규칙 기반 해설) */}
      {showHeadline && (
        <Section>
          <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{data.headline}</p>
        </Section>
      )}

      {/* ② 핵심 KPI */}
      <Section title="핵심 KPI">
        <KpiCardGrid cards={data.kpiCards} />
      </Section>

      {/* 공간 이야기 — "이야기를 끝까지 읽는가"를 확인하기 위한 최소 계측(스토리 조회/완독률/평균 체류시간).
          규칙 기반 해설이 아니라 원자료 KPI이므로 별도 게이팅 없이 항상 노출한다. */}
      <Section title="공간 이야기">
        <KpiCardGrid cards={data.storyCards} />
      </Section>

      {/* ③ 이번 기간 변화 (전월 대비 비교 — 자유 기간 조회에선 비교 대상이 없어 기본 숨김) */}
      {showComparison && data.changeInsights.length > 0 && (
        <Section title="이번 기간 변화">
          {data.changeInsights.map((text, i) => (
            <p key={i} style={{ fontSize: 13, lineHeight: 1.7, margin: i === 0 ? 0 : "10px 0 0", paddingLeft: 12, borderLeft: `2px solid ${COLOR.border}` }}>
              {text}
            </p>
          ))}
        </Section>
      )}

      {/* ④ 이번 기간의 방문자 흔적 — 공감 TOP3. 개인정보(작성자 이메일 등)는 애초에
          ReportEmailData에 담기지 않으므로(featuredPosts에는 content/reactionCount/clusterType만
          존재) 여기서 따로 가릴 필요가 없다. */}
      <Section title="이번 기간의 방문자 흔적">
        {data.featuredPosts.length > 0 ? (
          data.featuredPosts.map((post, i) => (
            <div
              key={i}
              style={{ border: `1px solid ${COLOR.border}`, padding: "12px 14px", marginTop: i === 0 ? 0 : 10, breakInside: "avoid" }}
            >
              <p style={{ fontSize: 10, color: COLOR.dim, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>
                {CLUSTER_LABELS[post.clusterType] ?? post.clusterType} · 공감 {post.reactionCount}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, wordBreak: "keep-all", overflowWrap: "anywhere" }}>&ldquo;{post.content}&rdquo;</p>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 13, color: COLOR.dim, margin: 0 }}>이번 기간에는 아직 공감이 쌓인 흔적이 없습니다.</p>
        )}
      </Section>

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

      {/* ⑥ 공간 경험 요약 (규칙 기반 해설) */}
      {showHeadline && (
        <Section title="공간 경험 요약">
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>{data.usageSummary}</p>
        </Section>
      )}

      {/* ⑦ 다음 제안 (운영 조언 성격 — 파일럿에서는 기본 숨김) */}
      {showSuggestions && data.suggestions.length > 0 && (
        <Section title="다음 제안">
          {data.suggestions.map((text, i) => (
            <p key={i} style={{ fontSize: 13, lineHeight: 1.7, margin: i === 0 ? 0 : "10px 0 0", paddingLeft: 12, borderLeft: `2px solid ${COLOR.border}` }}>
              {text}
            </p>
          ))}
        </Section>
      )}

      {/* ⑧ 운영 메모 */}
      {data.operatorNote && (
        <Section title="이번 기간 메모">
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: COLOR.dim, whiteSpace: "pre-line" }}>{data.operatorNote}</p>
        </Section>
      )}

      <p style={{ fontSize: 11, color: COLOR.dim, marginTop: 32, paddingTop: 16, borderTop: `1px solid ${COLOR.border}` }}>
        공간큐브 · 이 리포트는 공간에서 수집된 데이터를 기반으로 자동 생성되었습니다.
      </p>
    </div>
  );
}

function KpiCardGrid({ cards }: { cards: ReportKpiCard[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {chunk(cards, 2).map((row, i) => (
          <tr key={i}>
            {row.map((card) => (
              <td key={card.key} style={{ width: "50%", padding: 4, verticalAlign: "top" }}>
                <div style={{ border: `1px solid ${COLOR.border}`, padding: "12px 14px", breakInside: "avoid" }}>
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
