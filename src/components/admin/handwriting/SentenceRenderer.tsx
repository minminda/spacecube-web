/* EXPERIMENTAL ONLY — 생성된 glyph 이미지(문자별 PNG) 또는 기본 손글씨 폰트로 문장을
   화면에 조합한다. TTF/WOFF 변환 없이, 각 글자를 <img> 또는 <span>으로 나란히 배치하는
   방식(1차 PoC 범위, 스펙 10번 참고).
   글자가 "따로 노는" 문제를 줄이기 위해 아주 작은 회전/기준선/크기/자간 variation을
   글자마다 결정론적으로 부여한다(스펙 5·6번, deterministicJitter.ts). results를 생략하면
   순수 기본 폰트 텍스트로 렌더링된다(Hybrid 비교의 "D. Base" 모드). */
import { charJitter } from "@/lib/handwriting/deterministicJitter";

export interface CharResult {
  status: "generated" | "fallback" | "space" | "error";
  image?: string;
  reason?: string;
}

interface Props {
  text: string;
  results?: Record<string, CharResult>;
  glyphSize?: number;
  ink?: string;
  baseFontClassName?: string;
  jitter?: boolean;
}

const NO_JITTER = { rotateDeg: 0, baselineOffsetPx: 0, scale: 1, spacingPx: 0 };

export default function SentenceRenderer({
  text,
  results,
  glyphSize = 34,
  ink = "#3d3524",
  baseFontClassName,
  jitter = true,
}: Props) {
  return (
    <span className="inline-flex flex-wrap items-baseline" style={{ lineHeight: 1.8 }}>
      {[...text].map((ch, i) => {
        if (ch === " ") {
          return <span key={i} style={{ width: glyphSize * 0.45, display: "inline-block" }} />;
        }

        const j = jitter ? charJitter(text, i, ch) : NO_JITTER;
        const wrapStyle: React.CSSProperties = {
          display: "inline-block",
          transform: `translateY(${j.baselineOffsetPx}px) rotate(${j.rotateDeg}deg) scale(${j.scale})`,
          marginRight: j.spacingPx,
        };

        // results가 없으면 "D. Base" 모드 — 생성 결과 없이 기본 손글씨 폰트로 직접 렌더.
        // 커버리지 제약이 없어 어떤 문자든 표시 가능하다.
        if (!results) {
          return (
            <span
              key={i}
              className={baseFontClassName}
              style={{ ...wrapStyle, fontSize: glyphSize * 0.8, color: ink }}
            >
              {ch}
            </span>
          );
        }

        const r = results[ch];
        if (!r || r.status === "space") {
          return <span key={i} style={{ width: glyphSize * 0.45, display: "inline-block" }} />;
        }
        if (r.status === "generated" && r.image) {
          return (
            <span key={i} style={wrapStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.image}
                alt={ch}
                title={ch}
                style={{
                  width: glyphSize,
                  height: glyphSize,
                  objectFit: "contain",
                  // 모델 출력이 흰 배경 검정 잉크라, mix-blend로 흰 배경을 지우고 잉크만 얹는다.
                  mixBlendMode: "multiply",
                }}
              />
            </span>
          );
        }
        // fallback(비한글) / error — 기본 폰트로 표시
        return (
          <span
            key={i}
            title={r?.reason}
            className={baseFontClassName}
            style={{ ...wrapStyle, fontSize: glyphSize * 0.62, color: ink }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
