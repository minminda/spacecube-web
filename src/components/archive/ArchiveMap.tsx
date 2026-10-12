"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadKakaoMaps } from "@/lib/kakaoMapsSdk";
import type { MapMissing, MapPoint, MapState } from "@/lib/archive/libraryMap";

/** 내 공간 지도 — 내 Archive(저장 · 다녀온 · 재방문)만 보여주는 보기. 주변 검색 · 현재 위치 · 장소 검색은 없다. */

const LABEL: Record<MapState, string> = { saved: "저장", visited: "다녀온 곳", revisit: "또 간 곳" };
const STATUS_TEXT = (p: MapPoint) =>
  p.state === "saved" ? "가보고 싶은 곳" : p.state === "revisit" ? `또 간 곳 · ${p.visitCount}번 방문` : "다녀온 곳";

// 색만으로 구분하지 않는다 — 저장: 속이 빈 원 / 다녀온 곳: 채운 원 / 또 간 곳: 채운 원 + 바깥 링 + 가운데 점
const SVG: Record<MapState, string> = {
  saved: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="7" fill="#fff" stroke="#111" stroke-width="2.2"/></svg>',
  visited: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="8" fill="#111" stroke="#fff" stroke-width="2"/></svg>',
  revisit: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12" fill="none" stroke="#111" stroke-width="1.6"/><circle cx="14" cy="14" r="8" fill="#111" stroke="#fff" stroke-width="1.6"/><circle cx="14" cy="14" r="2.4" fill="#fff"/></svg>',
};

function markerEl(p: MapPoint, active: boolean, onClick: () => void): HTMLElement {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("aria-label", `${p.name} — ${STATUS_TEXT(p)}`);
  b.innerHTML = SVG[p.state]; // 고정 문자열(사용자 입력 없음)
  b.style.cssText = `display:block;width:28px;height:28px;padding:0;border:0;background:none;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));transform:scale(${active ? 1.3 : 1});transition:transform .12s;`;
  b.onclick = onClick;
  return b;
}

export default function ArchiveMap({ points, missing, jsKey }: { points: MapPoint[]; missing: MapMissing[]; jsKey: string }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<"" | "NO_KEY" | "LOAD">(jsKey ? "" : "NO_KEY");
  const [ready, setReady] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const fitted = useRef(false);

  const selected = useMemo(() => points.find((p) => p.key === selectedKey) ?? null, [points, selectedKey]);

  useEffect(() => {
    if (!jsKey || points.length === 0 || !el.current) return;
    let cancelled = false;
    loadKakaoMaps(jsKey)
      .then((kakao) => {
        if (cancelled || !el.current) return;
        map.current = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(points[0].lat, points[0].lng), level: 5 });
        map.current.setMaxLevel(10); // 전국 단위로 너무 멀어지지 않게
        setReady(true);
      })
      .catch(() => { if (!cancelled) setError("LOAD"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsKey, points.length === 0]);

  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    // 선택된 마커가 위로 오도록 재방문 > 방문 > 저장 순으로 z-index
    const z = { saved: 1, visited: 2, revisit: 3 } as const;
    for (const p of points) {
      const o = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        content: markerEl(p, p.key === selectedKey, () => setSelectedKey(p.key)),
        zIndex: p.key === selectedKey ? 10 : z[p.state],
      });
      o.setMap(map.current);
      overlays.current.push(o);
    }
    if (!fitted.current && points.length > 0) {
      fitted.current = true;
      if (points.length === 1 || points.every((p) => p.lat === points[0].lat && p.lng === points[0].lng)) {
        map.current.setLevel(4);
        map.current.setCenter(new kakao.maps.LatLng(points[0].lat, points[0].lng));
      } else {
        const b = new kakao.maps.LatLngBounds();
        points.forEach((p) => b.extend(new kakao.maps.LatLng(p.lat, p.lng)));
        map.current.setBounds(b, 70, 50, 70, 50);
        if (map.current.getLevel() < 3) map.current.setLevel(3);
      }
    }
  }, [ready, points, selectedKey]);

  const legend = (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs" aria-label="범례" style={{ color: "var(--ed-dim)" }}>
      {(["saved", "visited", "revisit"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1">
          <span className="inline-block" style={{ width: 22, height: 22, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: SVG[s].replace('width="28" height="28"', 'width="22" height="22"') }} />
          {LABEL[s]}
        </li>
      ))}
    </ul>
  );

  if (points.length === 0) {
    return (
      <div className="py-12 space-y-3">
        {missing.length === 0 ? (
          <p className="text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            아직 지도에 남은 공간이 없어요.<br />마음에 드는 공간을 저장하거나, 직접 다녀온 공간이 생기면 여기에 쌓입니다.
          </p>
        ) : (
          <p className="text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            기록된 공간은 있지만<br />아직 지도에서 보여드릴 위치 정보가 준비되지 않았어요.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {legend}
      <div className="relative w-full overflow-hidden" style={{ border: "1px solid var(--ed-line)", height: "calc(100dvh - 300px)", minHeight: 380, maxHeight: 720, background: "var(--ed-soft)" }}>
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-6 text-sm break-keep" style={{ color: "var(--ed-dim)" }}>
            지도를 불러오지 못했어요. 잠시 뒤 다시 시도하거나 ‘리스트’에서 확인해주세요.
          </div>
        ) : (
          <div ref={el} className="absolute inset-0" />
        )}
        {selected && (
          <div className="absolute left-3 right-3 bottom-3 z-10 md:right-auto md:w-80 p-4 space-y-1" style={{ background: "#fff", color: "#111", border: "1px solid #111" }} role="dialog" aria-label={selected.name}>
            <button type="button" onClick={() => setSelectedKey(null)} className="absolute right-1 top-0 w-10 h-10 text-xl leading-none opacity-60" aria-label="닫기">×</button>
            <p className="font-semibold pr-8 break-keep">{selected.name}</p>
            {selected.area && <p className="text-xs">{selected.area}</p>}
            <p className="text-xs tabular-nums" style={{ color: "#555" }}>{STATUS_TEXT(selected)}</p>
            <Link href={selected.href} className="inline-flex items-center min-h-11 text-sm font-semibold underline underline-offset-4">
              {selected.state === "saved" ? "공간 보기" : "내 기록 보기"}
            </Link>
          </div>
        )}
      </div>
      {missing.length > 0 && (
        <details className="text-xs" style={{ color: "var(--ed-dim)" }}>
          <summary className="cursor-pointer min-h-8 inline-flex items-center">지도에 표시되지 않은 공간 {missing.length}곳</summary>
          <p className="pt-1">일부 공간은 지도 위치가 준비 중이에요.</p>
          <ul className="pt-1 space-y-0.5">{missing.map((m) => <li key={m.key}>{m.name}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
