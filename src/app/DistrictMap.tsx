"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ── 지역 데이터 ────────────────────────────────────────────────
   좌표계: 서울 위경도를 SVG viewBox 0 0 310 390 에 매핑
   lat 37.51-37.60  →  y 370-20
   lng 126.86-127.10 →  x 15-295
   pins: 지역 내 공간 위치를 표현하는 추상 좌표 (3-5개)
────────────────────────────────────────────────────────────── */
const DISTRICT_DATA: Record<string, {
  polygon: string;
  cx: number;
  cy: number;
  pins: [number, number][];
}> = {
  망원:    {
    polygon: "38,138 68,130 82,148 78,175 55,182 32,170 28,150",
    cx: 55, cy: 157,
    pins: [[42,145],[65,152],[50,168],[70,163],[44,172]],
  },
  연남동:  {
    polygon: "70,118 96,114 106,128 100,146 76,150 60,138 60,122",
    cx: 82, cy: 132,
    pins: [[75,124],[90,130],[82,142],[96,136]],
  },
  홍대:    {
    polygon: "74,148 106,142 114,162 106,183 80,188 62,174 63,154",
    cx: 88, cy: 165,
    pins: [[78,156],[96,162],[84,176],[106,170]],
  },
  서촌:    {
    polygon: "106,70 150,65 164,80 162,108 142,118 106,116 94,100",
    cx: 130, cy: 92,
    pins: [[112,80],[140,78],[152,96],[120,106]],
  },
  북촌:    {
    polygon: "136,52 176,48 190,62 187,90 164,98 136,94 122,76",
    cx: 155, cy: 73,
    pins: [[142,60],[165,66],[176,78],[148,86]],
  },
  익선동:  {
    polygon: "160,86 190,82 200,96 196,116 168,120 156,106",
    cx: 178, cy: 101,
    pins: [[164,92],[180,96],[190,108],[170,112]],
  },
  이태원:  {
    polygon: "142,218 184,210 200,226 195,255 170,263 142,255 130,237",
    cx: 165, cy: 237,
    pins: [[148,228],[165,238],[178,248],[155,252]],
  },
  한남동:  {
    polygon: "183,208 224,204 237,218 233,248 207,255 182,248 170,228",
    cx: 203, cy: 230,
    pins: [[188,220],[206,226],[220,240],[196,248]],
  },
  가로수길: {
    polygon: "173,272 218,265 234,282 228,318 203,325 173,318 160,298",
    cx: 196, cy: 295,
    pins: [[178,282],[198,290],[210,306],[186,314]],
  },
  성수:    {
    polygon: "226,178 276,172 292,192 287,232 257,240 226,235 212,212",
    cx: 252, cy: 206,
    pins: [[232,192],[254,198],[272,212],[244,228]],
  },
};

const HAN_RIVER = "M 15,265 Q 90,250 160,264 Q 222,278 295,260";

type Phase = "map" | "focus" | "pins" | "enter";

interface Props {
  selected: string;
  onDone: () => void;
}

function getMessage(phase: Phase, district: string): string {
  switch (phase) {
    case "map":   return `${district}의 공간들을 불러오는 중`;
    case "focus": return `${district} 골목 위에 공간을 표시하고 있어요`;
    case "pins":  return "취향과 닮은 공간을 찾고 있어요";
    case "enter": return `${district}의 공간들이 준비됐어요`;
  }
}

export default function DistrictMap({ selected, onDone }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("map");
  const [visible, setVisible] = useState(false);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisible(true),       40),   // 지도 fade-in
      setTimeout(() => setPhase("focus"),      450),  // 줌인 + 외곽선 드로우
      setTimeout(() => setPhase("pins"),       1050), // 핀 등장 시작
      setTimeout(() => setDotCount(1),         1100),
      setTimeout(() => setDotCount(2),         1270),
      setTimeout(() => setDotCount(3),         1440),
      setTimeout(() => setDotCount(4),         1570),
      setTimeout(() => {
        setPhase("enter");
        router.push(`/discover?district=${encodeURIComponent(selected)}`);
        onDone();
      }, 1850),
    ];
    return () => timers.forEach(clearTimeout);
  }, [selected, router, onDone]);

  const d = DISTRICT_DATA[selected];
  const pins = d?.pins ?? [];

  // 줌 transform-origin: 선택 지역 중심을 기준으로 확대
  const originX = d ? Math.round((d.cx / 310) * 100) : 50;
  const originY = d ? Math.round((d.cy / 390) * 100) : 50;
  const isZoomed = phase === "focus" || phase === "pins" || phase === "enter";

  return (
    <div className="space-y-3">

      {/* ── 상태 텍스트 ── */}
      <p
        key={phase}
        className="text-xs"
        style={{
          color: "var(--dim)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.35s ease-out",
          minHeight: "1rem",
          animation: visible ? "msgFadeIn 0.35s ease-out" : "none",
        }}
      >
        {getMessage(phase, selected)}
      </p>

      {/* ── 지도 컨테이너 (overflow:hidden 으로 줌 클리핑) ── */}
      <div
        style={{
          overflow: "hidden",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s ease-out",
        }}
      >
        {/* 줌 래퍼 */}
        <div
          style={{
            transform: isZoomed ? "scale(1.72)" : "scale(1)",
            transformOrigin: `${originX}% ${originY}%`,
            transition: "transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          <svg viewBox="0 0 310 390" width="100%" style={{ display: "block" }}>

            {/* 배경: 얇은 격자선 */}
            <defs>
              <pattern id="mapgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="20" y2="0"
                  stroke="currentColor" strokeWidth="0.3" opacity="0.13"/>
                <line x1="0" y1="0" x2="0" y2="20"
                  stroke="currentColor" strokeWidth="0.3" opacity="0.13"/>
              </pattern>
            </defs>
            <rect width="310" height="390" fill="url(#mapgrid)" />

            {/* 한강 */}
            <path d={HAN_RIVER} fill="none" stroke="currentColor"
              strokeWidth="13" opacity="0.07" strokeLinecap="round"/>
            <path d={HAN_RIVER} fill="none" stroke="currentColor"
              strokeWidth="6" opacity="0.1" strokeLinecap="round"/>

            {/* 비활성 지역 */}
            {Object.entries(DISTRICT_DATA).map(([name, data]) =>
              name !== selected ? (
                <g key={name} opacity="0.2">
                  <polygon
                    points={data.polygon}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.7"
                  />
                  <text
                    x={data.cx} y={data.cy + 4}
                    textAnchor="middle" fontSize="6"
                    fill="currentColor"
                    style={{ fontFamily: "system-ui, sans-serif" }}
                  >
                    {name}
                  </text>
                </g>
              ) : null
            )}

            {/* 선택 지역 — 미세 채우기 (항상 표시) */}
            {d && (
              <polygon
                points={d.polygon}
                fill="currentColor"
                opacity="0.05"
              />
            )}

            {/* 선택 지역 — 외곽선 드로우 애니메이션 */}
            {d && (
              <polygon
                points={d.polygon}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{
                  strokeDasharray: 500,
                  strokeDashoffset: phase === "map" ? 500 : 0,
                  opacity: phase === "map" ? 0 : 0.85,
                  transition: "stroke-dashoffset 0.85s ease-out, opacity 0.3s ease-out",
                }}
              />
            )}

            {/* 선택 지역 — 레이블 */}
            {d && phase !== "map" && (
              <text
                x={d.cx} y={d.cy + 4}
                textAnchor="middle" fontSize="7"
                fill="currentColor" opacity="0.75"
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 500,
                  animation: "msgFadeIn 0.4s ease-out",
                }}
              >
                {selected}
              </text>
            )}

            {/* 공간 핀 — 순차 등장 */}
            {pins.slice(0, dotCount).map((pin, i) => (
              <circle
                key={i}
                cx={pin[0]}
                cy={pin[1]}
                r="2.3"
                fill="currentColor"
                opacity="0.9"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "pinPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                }}
              />
            ))}

            {/* 핀 외곽 링 (가장 마지막 핀에 pulse 효과) */}
            {dotCount > 0 && pins[dotCount - 1] && (
              <circle
                cx={pins[dotCount - 1][0]}
                cy={pins[dotCount - 1][1]}
                r="5"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "pinRing 0.6s ease-out forwards",
                }}
              />
            )}

          </svg>
        </div>
      </div>

      {/* ── CSS 키프레임 ── */}
      <style>{`
        @keyframes pinPop {
          from { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.3); }
          to   { transform: scale(1);  opacity: 0.9; }
        }
        @keyframes pinRing {
          from { transform: scale(0.4); opacity: 0.7; }
          to   { transform: scale(2.2); opacity: 0; }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
