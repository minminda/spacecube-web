"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ─── 지역 데이터 ──────────────────────────────────────────────
   좌표계: 서울 위경도를 SVG viewBox 0 0 310 390 에 매핑
   lat 37.51-37.60  →  y 370-20
   lng 126.86-127.10 →  x 15-295
──────────────────────────────────────────────────────────── */
const DISTRICTS: Record<string, {
  polygon: string;
  cx: number;
  cy: number;
}> = {
  망원:    { polygon: "38,138 68,130 82,148 78,175 55,182 32,170 28,150",    cx: 55,  cy: 157 },
  연남동:  { polygon: "70,118 96,114 106,128 100,146 76,150 60,138 60,122",  cx: 82,  cy: 132 },
  홍대:    { polygon: "74,148 106,142 114,162 106,183 80,188 62,174 63,154", cx: 88,  cy: 165 },
  서촌:    { polygon: "106,70 150,65 164,80 162,108 142,118 106,116 94,100", cx: 130, cy: 92  },
  북촌:    { polygon: "136,52 176,48 190,62 187,90 164,98 136,94 122,76",    cx: 155, cy: 73  },
  익선동:  { polygon: "160,86 190,82 200,96 196,116 168,120 156,106",         cx: 178, cy: 101 },
  이태원:  { polygon: "142,218 184,210 200,226 195,255 170,263 142,255 130,237", cx: 165, cy: 237 },
  한남동:  { polygon: "183,208 224,204 237,218 233,248 207,255 182,248 170,228", cx: 203, cy: 230 },
  가로수길:{ polygon: "173,272 218,265 234,282 228,318 203,325 173,318 160,298", cx: 196, cy: 295 },
  성수:    { polygon: "226,178 276,172 292,192 287,232 257,240 226,235 212,212", cx: 252, cy: 206 },
};

const HAN_RIVER = "M 15,265 Q 90,250 160,264 Q 222,278 295,260";

interface Props {
  selected: string;
  onDone: () => void;
}

export default function DistrictMap({ selected, onDone }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"scan" | "highlight" | "done">("scan");
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    // 1) 스캔 라인 애니메이션 (0 → 390, ~0.6s)
    const start = performance.now();
    const duration = 600;
    const scanAnim = requestAnimationFrame(function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setScanLine(Math.round(progress * 390));
      if (progress < 1) requestAnimationFrame(tick);
      else setPhase("highlight");
    });

    return () => cancelAnimationFrame(scanAnim);
  }, []);

  useEffect(() => {
    if (phase !== "highlight") return;
    // 2) 테두리 드로우 후 이동 (1.4s)
    const timer = setTimeout(() => {
      setPhase("done");
      router.push(`/discover?district=${encodeURIComponent(selected)}`);
      onDone();
    }, 1400);
    return () => clearTimeout(timer);
  }, [phase, selected, router, onDone]);

  const d = DISTRICTS[selected];

  return (
    <div className="space-y-3">
      {/* 상태 텍스트 */}
      <div className="text-xs space-y-1" style={{ color: "var(--dim)" }}>
        {phase === "scan" && <p>&gt; SCANNING AREA...</p>}
        {phase === "highlight" && (
          <>
            <p>&gt; AREA FOUND</p>
            <p style={{ color: "var(--fg)" }}>&gt; {selected.toUpperCase()}</p>
          </>
        )}
        {phase === "done" && <p>&gt; ENTERING...</p>}
      </div>

      {/* SVG 지도 */}
      <div
        className="border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <svg
          viewBox="0 0 310 390"
          width="100%"
          style={{ display: "block" }}
        >
          {/* 격자 배경 */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a1a" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="310" height="390" fill="url(#grid)" />

          {/* 한강 */}
          <path
            d={HAN_RIVER}
            fill="none"
            stroke="#1e2a2a"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d={HAN_RIVER}
            fill="none"
            stroke="#162020"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* 비활성 지역 */}
          {Object.entries(DISTRICTS).map(([name, data]) => (
            name !== selected && (
              <polygon
                key={name}
                points={data.polygon}
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="1"
              />
            )
          ))}

          {/* 비활성 레이블 */}
          {Object.entries(DISTRICTS).map(([name, data]) => (
            name !== selected && (
              <text
                key={`label-${name}`}
                x={data.cx}
                y={data.cy + 4}
                textAnchor="middle"
                fontSize="7"
                fill="#3a3a3a"
                fontFamily="Courier New, monospace"
              >
                {name}
              </text>
            )
          ))}

          {/* 스캔 라인 */}
          {phase === "scan" && (
            <line
              x1="0" y1={scanLine}
              x2="310" y2={scanLine}
              stroke="#1e3a1e"
              strokeWidth="2"
              opacity="0.8"
            />
          )}

          {/* 선택 지역 하이라이트 */}
          {d && phase === "highlight" && (
            <>
              {/* 채우기 */}
              <polygon
                points={d.polygon}
                fill="var(--fg)"
                stroke="none"
                style={{ animation: "fill-flash 1.4s ease-out forwards" }}
              />
              {/* 테두리 드로우 */}
              <polygon
                points={d.polygon}
                fill="none"
                stroke="var(--fg)"
                strokeWidth="1.5"
                style={{
                  strokeDasharray: "600",
                  strokeDashoffset: "600",
                  animation: "draw-border 1.0s ease-out forwards",
                }}
              />
              {/* 레이블 */}
              <text
                x={d.cx}
                y={d.cy + 4}
                textAnchor="middle"
                fontSize="8"
                fill="var(--fg)"
                fontFamily="Courier New, monospace"
                fontWeight="bold"
                style={{ animation: "label-appear 0.4s 0.6s ease-out both" }}
              >
                {selected}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
