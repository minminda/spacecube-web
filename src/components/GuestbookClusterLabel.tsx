/* ── 방명록 군집 라벨(자유/질문1/질문2) 공용 렌더러 ──────────────────────
   방문자 무한 캔버스(GuestbookCanvas.tsx)와 관리자 배치 미리보기(GuestbookSessionPreview.tsx)
   양쪽에서 재사용한다 — "같은 스타일 계산 로직을 화면마다 따로 구현하지 않는다"는 요구사항의
   핵심 해결책. 위치(left/top/transform) 지정은 각 호출부가 소유하고, 이 컴포넌트는 라벨
   내부 마크업/스타일만 담당한다. ──────────────────────────────────────── */

import { CLUSTER_LABEL_WIDTH } from "@/lib/postitCollision";

export interface StyledClusterLabel {
  type: "FREE" | "QUESTION_1" | "QUESTION_2";
  label: string;
  fontSize: number;
  color: string;
}

interface Props {
  cluster: StyledClusterLabel;
  widthPx?: number;
}

export default function GuestbookClusterLabel({ cluster, widthPx = CLUSTER_LABEL_WIDTH }: Props) {
  const questionNumber = cluster.type === "QUESTION_1" ? "01" : cluster.type === "QUESTION_2" ? "02" : null;
  const isQuestion = questionNumber !== null;

  return (
    <div
      className="flex flex-col items-center gap-2 px-4 py-3.5"
      style={{
        width: widthPx,
        textAlign: "center",
        background: isQuestion ? "rgba(255,255,255,0.07)" : "transparent",
        border: isQuestion ? "1px solid rgba(255,255,255,0.16)" : "none",
        backdropFilter: isQuestion ? "blur(3px)" : undefined,
      }}
    >
      {isQuestion && (
        <span className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          QUESTION {questionNumber}
        </span>
      )}
      <p
        className="leading-snug break-keep whitespace-pre-line font-semibold"
        style={{ color: cluster.color, fontSize: cluster.fontSize }}
      >
        {cluster.label}
      </p>
    </div>
  );
}
