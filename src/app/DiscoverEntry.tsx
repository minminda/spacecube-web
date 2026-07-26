"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SeoulMapBackdrop, { SEOUL_MAP_VIEWBOX } from "@/components/SeoulMapBackdrop";
import DistrictMapMarker from "@/components/DistrictMapMarker";

/* ── 공간 둘러보기 SVG 지역 선택 지도 ──────────────────────────────
   지도 API/외부 라이브러리 없이 순수 SVG + CSS transform으로만 구현한다.
   배경(격자+한강)은 코드에 고정, 지역 마커 위치·줌 설정·노출 상태는
   관리자(/admin/districts)가 편집한 값을 그대로 쓴다(discover/page.tsx가
   DB에서 조회해 내려줌). ACTIVE 지역을 누르면 그 지역의 줌 중심으로
   SVG 전체가 확대된 뒤 지역 페이지로 이동하고, COMING_SOON 지역은
   이동 없이 안내 문구만 보여준다. ──────────────────────────────── */

export interface DiscoverDistrict {
  name: string;
  status: "ACTIVE" | "COMING_SOON";
  tagline: string | null;
  markerX: number;
  markerY: number;
  zoomX: number;
  zoomY: number;
  zoomScale: number;
}

const ZOOM_MS = 750;
const COMING_SOON_MS = 2600;

export default function DiscoverEntry({ districts }: { districts: DiscoverDistrict[] }) {
  const router = useRouter();
  const [zooming, setZooming] = useState<DiscoverDistrict | null>(null);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (navigateTimer.current) clearTimeout(navigateTimer.current);
  }, []);

  function handleSelect(d: DiscoverDistrict) {
    if (zooming) return; // 확대 중 재클릭 방지

    if (d.status === "ACTIVE") {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setComingSoon(null);
      setZooming(d);
      navigateTimer.current = setTimeout(() => {
        router.push(`/discover?district=${encodeURIComponent(d.name)}`);
      }, ZOOM_MS);
      return;
    }

    setComingSoon(d.name);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setComingSoon(null), COMING_SOON_MS);
  }

  if (districts.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--dim)" }}>
        지금은 둘러볼 수 있는 지역이 없어요. 조금 기다려봐.
      </p>
    );
  }

  const originX = zooming ? Math.round((zooming.zoomX / 310) * 100) : 50;
  const originY = zooming ? Math.round((zooming.zoomY / 390) * 100) : 50;

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: "var(--dim)" }}>지도를 눌러 지역을 선택하세요.</p>

      <p
        className="text-xs"
        style={{
          color: "var(--dim)",
          minHeight: "1rem",
          opacity: comingSoon ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      >
        {comingSoon ? "아직 공간을 준비하고 있습니다." : ""}
      </p>

      <div style={{ overflow: "hidden" }}>
        <div
          className="seoul-map-zoom"
          style={{
            transform: zooming ? `scale(${zooming.zoomScale})` : "scale(1)",
            transformOrigin: `${originX}% ${originY}%`,
            transition: `transform ${ZOOM_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          }}
        >
          <svg
            viewBox={SEOUL_MAP_VIEWBOX}
            width="100%"
            style={{ display: "block", color: "var(--fg)" }}
          >
            <SeoulMapBackdrop />

            {districts.map((d) => {
              const isActive = d.status === "ACTIVE";
              return (
                <g
                  key={d.name}
                  role="button"
                  tabIndex={0}
                  aria-label={isActive ? d.name : `${d.name} (준비 중)`}
                  className="district-marker"
                  onClick={() => handleSelect(d)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(d);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* 터치 히트영역 확대 — 마커보다 넉넉한 투명 원(시각적으로는 보이지 않음) */}
                  <circle cx={d.markerX} cy={d.markerY} r={26} fill="transparent" />
                  <DistrictMapMarker name={d.name} x={d.markerX} y={d.markerY} status={d.status} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <style>{`
        .district-marker { outline: none; }
        .district-marker:focus-visible { filter: drop-shadow(0 0 2.5px currentColor); }
        @media (prefers-reduced-motion: reduce) {
          .seoul-map-zoom { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
