"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { normalizeArea, sameArea } from "@/lib/editorial/area";
import { hasCoord, isSinglePoint, regionOptions, spacesInRegion } from "@/lib/adminCoverage";

export interface MapSpace {
  id: string;
  name: string;
  district: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  status: "public" | "private" | "demo";
  typeLabel: string;
}

export interface MapRegion {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

type Selected = { kind: "space"; space: MapSpace } | { kind: "region"; region: MapRegion };

const STATUS_LABEL = { public: "공개", private: "비공개", demo: "시연" } as const;
const REGION_COLOR = "#1d4ed8";
const SPACE_COLOR = "#dc2626";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao?: any;
  }
}

function loadKakao(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.load) return window.kakao.maps.load(() => resolve(window.kakao));
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    s.async = true;
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

function spaceDot(title: string, onClick: () => void): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.title = title;
  el.setAttribute("aria-label", title);
  el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${SPACE_COLOR};border:2px solid #fff;box-shadow:0 0 0 1px rgba(127,29,29,.5),0 1px 3px rgba(0,0,0,.35);cursor:pointer;padding:0;`;
  el.onclick = onClick;
  return el;
}

function regionPin(label: string, active: boolean, onClick: () => void): HTMLElement {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.setAttribute("aria-label", `${label} 지역`);
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:0;padding:0;cursor:pointer;";
  const dot = document.createElement("span");
  dot.style.cssText = `width:${active ? 36 : 30}px;height:${active ? 36 : 30}px;border-radius:50%;background:${REGION_COLOR};border:3px solid #fff;box-shadow:0 0 0 ${active ? 5 : 2}px ${REGION_COLOR}55,0 2px 6px rgba(0,0,0,.3);`;
  const text = document.createElement("span");
  text.textContent = label;
  text.style.cssText = `font-size:13px;font-weight:700;color:${REGION_COLOR};background:#fff;padding:1px 6px;border-radius:9px;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap;`;
  wrap.append(dot, text);
  wrap.onclick = onClick;
  return wrap;
}

export default function AdminSpaceMap({
  spaces, regions, jsKey, focusRegion, onSelectRegion,
}: {
  spaces: MapSpace[];
  regions: MapRegion[];
  jsKey: string;
  /** 지역 관리 목록의 "지도에서 보기" — nonce가 바뀔 때마다 해당 지역으로 이동·강조 */
  focusRegion?: { id: string; nonce: number } | null;
  /** 지도에서 지역 마커를 눌렀을 때 — 지역 관리 항목 강조용 */
  onSelectRegion?: (id: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState(""); // normalizeArea 키
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [mapError, setMapError] = useState(jsKey ? "" : "NO_KEY");
  const [ready, setReady] = useState(false);

  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const fitted = useRef(false);

  const regionKeys = useMemo(() => regionOptions(regions, spaces), [regions, spaces]);
  const types = useMemo(() => [...new Set(spaces.map((s) => s.typeLabel).filter(Boolean))].sort(), [spaces]);

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return spaces.filter((s) => {
      if (!showDemo && s.status === "demo") return false;
      if (region && normalizeArea(s.district) !== region) return false;
      if (type && s.typeLabel !== type) return false;
      if (status && s.status !== status) return false;
      if (needle && !(s.name.toLowerCase().includes(needle) || s.address.toLowerCase().includes(needle) || (s.district ?? "").toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [spaces, region, type, status, showDemo, needle]);

  // 지역 마커: 지역 선택 시 그 지역만, 검색 중에는 이름이 맞거나 결과 공간이 있는 지역만, 그 외엔 전부(빈 지역도 보여야 공백을 알 수 있다)
  const visibleRegions = useMemo(() => regions.filter((r) => {
    if (region) return normalizeArea(r.name) === region;
    if (needle) return r.name.toLowerCase().includes(needle) || filtered.some((s) => sameArea(s.district, r.name));
    return true;
  }), [regions, region, needle, filtered]);

  const onMap = filtered.filter(hasCoord);
  const noLocation = filtered.filter((s) => !hasCoord(s));
  const regionsOnMap = visibleRegions.filter(hasCoord);
  const regionsNoLocation = regions.filter((r) => !hasCoord(r));

  const baseSpaces = useMemo(() => spaces.filter((s) => showDemo || s.status !== "demo"), [spaces, showDemo]);
  const countIn = (r: MapRegion) => spacesInRegion(r.name, baseSpaces).length;

  // SDK + 지도 초기화
  useEffect(() => {
    if (!jsKey || !el.current) return;
    let cancelled = false;
    loadKakao(jsKey)
      .then((kakao) => {
        if (cancelled || !el.current) return;
        map.current = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 8 });
        setReady(true);
      })
      .catch(() => { if (!cancelled) setMapError("LOAD"); });
    return () => { cancelled = true; };
  }, [jsKey]);

  function fit() {
    const kakao = window.kakao;
    const pts = [...onMap, ...regionsOnMap];
    if (!map.current || pts.length === 0) return;
    if (isSinglePoint(pts)) {
      map.current.setLevel(4);
      map.current.setCenter(new kakao.maps.LatLng(pts[0].lat, pts[0].lng));
      return;
    }
    const b = new kakao.maps.LatLngBounds();
    pts.forEach((p) => b.extend(new kakao.maps.LatLng(p.lat, p.lng)));
    map.current.setBounds(b, 60, 60, 60, 60);
    if (map.current.getLevel() < 3) map.current.setLevel(3);
  }

  // 필터 결과 → 오버레이(지역은 더 크고 위에, 공간은 작게)
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    onMap.forEach((s) => {
      const o = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(s.lat, s.lng),
        content: spaceDot(s.name, () => setSelected({ kind: "space", space: s })),
        zIndex: 1,
      });
      o.setMap(map.current);
      overlays.current.push(o);
    });
    regionsOnMap.forEach((r) => {
      const o = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(r.lat, r.lng),
        content: regionPin(r.name, selected?.kind === "region" && selected.region.id === r.id, () => { setSelected({ kind: "region", region: r }); onSelectRegion?.(r.id); }),
        yAnchor: 0.35,
        zIndex: 5,
      });
      o.setMap(map.current);
      overlays.current.push(o);
    });
    if (!fitted.current && (onMap.length > 0 || regionsOnMap.length > 0)) {
      fit();
      fitted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filtered, visibleRegions, selected]);

  // 필터를 바꾸면 결과 전체가 보이도록 다시 맞춘다(검색어 입력 중에는 지도를 흔들지 않음)
  useEffect(() => { fitted.current = false; }, [region, type, status, showDemo]);

  // 지역 관리 목록 → 지도 이동·강조
  useEffect(() => {
    if (!focusRegion || !ready) return;
    const r = regions.find((x) => x.id === focusRegion.id);
    if (!r || !hasCoord(r)) return;
    setSelected({ kind: "region", region: r });
    map.current.setLevel(5);
    map.current.panTo(new window.kakao.maps.LatLng(r.lat, r.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRegion?.nonce, ready]);

  function focusSpace(s: MapSpace) {
    setSelected({ kind: "space", space: s });
    if (!ready || !hasCoord(s)) return;
    map.current.setLevel(3);
    map.current.panTo(new window.kakao.maps.LatLng(s.lat, s.lng));
  }

  function pickRegion(r: MapRegion) {
    setRegion(normalizeArea(r.name) ?? "");
    setQ("");
    setSelected(null);
  }

  const ctl = "text-sm px-3 py-2 border bg-transparent";
  const border = { borderColor: "var(--a-line)" };
  const matchedRegions = needle ? regions.filter((r) => r.name.toLowerCase().includes(needle)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="지역·공간명·주소 검색" className={`${ctl} w-64`} style={border} />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={ctl} style={border}>
          <option value="">지역 전체</option>
          {regionKeys.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={ctl} style={border}>
          <option value="">유형 전체</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={ctl} style={border}>
          <option value="">상태 전체</option>
          <option value="public">공개</option>
          <option value="private">비공개</option>
          <option value="demo">시연</option>
        </select>
        <label className="text-sm flex items-center gap-1.5">
          <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} /> 시연 공간 포함
        </label>
        <button type="button" onClick={() => { setRegion(""); setQ(""); fitted.current = false; fit(); }} className={ctl} style={border}>전체 보기</button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <p className="text-sm tabular-nums" style={{ color: "var(--a-dim)" }}>
          공간 {filtered.length} · 지역 {visibleRegions.length} · 지도 표시 공간 {onMap.length} · 위치 미연결 {noLocation.length}
        </p>
        <p className="text-xs flex items-center gap-3" style={{ color: "var(--a-dim)" }} aria-label="범례">
          <span className="flex items-center gap-1.5"><span style={{ width: 16, height: 16, borderRadius: "50%", background: REGION_COLOR, display: "inline-block" }} />지역</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 11, height: 11, borderRadius: "50%", background: SPACE_COLOR, display: "inline-block" }} />공간</span>
        </p>
      </div>

      {needle && (matchedRegions.length > 0 || onMap.length > 0) && (
        <ul className="flex flex-wrap gap-2">
          {matchedRegions.slice(0, 4).map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => pickRegion(r)} className="text-xs px-2.5 py-1.5 border hover:opacity-70" style={{ ...border, color: REGION_COLOR }}>
                지역 — {r.name}
              </button>
            </li>
          ))}
          {onMap.slice(0, 8).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => focusSpace(s)} className="text-xs px-2.5 py-1.5 border hover:opacity-70" style={border}>
                공간 — {s.name} <span style={{ color: "var(--a-faint)" }}>{s.district}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative border" style={{ ...border, height: "68vh", minHeight: 420 }}>
        {mapError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-6 text-sm" style={{ color: "var(--a-dim)" }}>
            {mapError === "NO_KEY"
              ? "지도 키(NEXT_PUBLIC_KAKAO_MAP_JS_KEY)가 설정되지 않아 지도를 표시할 수 없어요. 아래 목록은 그대로 사용할 수 있어요."
              : "카카오 지도를 불러오지 못했어요. JavaScript 키와 Kakao 콘솔의 Web 사이트 도메인 등록을 확인해주세요."}
          </div>
        ) : (
          <div ref={el} className="absolute inset-0" />
        )}
        {selected && (
          <div className="absolute left-3 top-3 z-10 w-64 p-4 space-y-1.5 shadow-lg" style={{ background: "#fff", color: "#111", border: "1px solid var(--a-line)" }}>
            <button type="button" onClick={() => setSelected(null)} className="absolute right-2 top-1 text-lg leading-none opacity-60" aria-label="닫기">×</button>
            {selected.kind === "space" ? (
              <>
                <p className="font-semibold pr-4">{selected.space.name}</p>
                <p className="text-xs">{selected.space.district ?? "지역 없음"} · {STATUS_LABEL[selected.space.status]}</p>
                {selected.space.address && <p className="text-xs opacity-70">{selected.space.address}</p>}
                <Link href={`/admin/${selected.space.id}/edit`} className="inline-block text-xs underline underline-offset-4 pt-1">공간 관리 열기</Link>
              </>
            ) : (
              <>
                <p className="font-semibold pr-4" style={{ color: REGION_COLOR }}>{selected.region.name}</p>
                <p className="text-xs">등록된 공간 {countIn(selected.region)}곳</p>
                <button type="button" onClick={() => pickRegion(selected.region)} className="inline-block text-xs underline underline-offset-4 pt-1">이 지역만 보기</button>
              </>
            )}
          </div>
        )}
      </div>

      {regionsNoLocation.length > 0 && (
        <p className="text-xs" style={{ color: "var(--a-dim)" }}>
          지도 위치가 없는 지역 {regionsNoLocation.length}곳({regionsNoLocation.map((r) => r.name).join(", ")}) —{" "}
          <a href="#region-panel" className="underline underline-offset-4">아래 지역 관리에서 위치 연결</a>
        </p>
      )}

      {noLocation.length > 0 && (
        <details className="text-sm" open>
          <summary className="cursor-pointer">위치 정보 없음 {noLocation.length}곳</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {noLocation.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Link href={`/admin/${s.id}/edit`} className="hover:underline underline-offset-4">{s.name}</Link>
                <span className="text-xs" style={{ color: "var(--a-faint)" }}>{s.district ?? "—"}</span>
                <Link href={`/admin/${s.id}/edit`} className="text-xs underline underline-offset-4 ml-auto" style={{ color: REGION_COLOR }}>위치 연결</Link>
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2" style={{ color: "var(--a-dim)" }}>주소를 저장하면 지도 위치가 자동으로 연결돼요. 이 목록은 과거 공간(수정 화면에서 한 번 저장하면 연결)이나 주소를 못 찾은 공간이에요.</p>
        </details>
      )}
    </div>
  );
}
