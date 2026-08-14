/* EXPERIMENTAL ONLY — 생성된 glyph 이미지(문자별 PNG)를 이용해 문장을 화면에 조합한다.
   TTF/WOFF 변환 없이, 각 글자를 <img>로 나란히 배치하는 방식(1차 PoC 범위, 스펙 10번 참고). */

export interface CharResult {
  status: "generated" | "fallback" | "space" | "error";
  image?: string;
  reason?: string;
}

interface Props {
  text: string;
  results: Record<string, CharResult>;
  glyphSize?: number;
  ink?: string;
}

export default function SentenceRenderer({ text, results, glyphSize = 34, ink = "#3d3524" }: Props) {
  return (
    <span className="inline-flex flex-wrap items-baseline" style={{ lineHeight: 1.6 }}>
      {[...text].map((ch, i) => {
        const r = results[ch];
        if (!r || r.status === "space" || ch === " ") {
          return <span key={i} style={{ width: glyphSize * 0.45, display: "inline-block" }} />;
        }
        if (r.status === "generated" && r.image) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
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
          );
        }
        // fallback(비한글) / error — 기본 폰트로 표시
        return (
          <span key={i} title={r?.reason} style={{ fontSize: glyphSize * 0.62, color: ink }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}
