"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

const STATUS_LABEL = { public: "공개", private: "비공개", demo: "시연" } as const;

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
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=clusterer&autoload=false`;
    s.async = true;
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

export default function AdminSpaceMap({ spaces, jsKey }: { spaces: MapSpace[]; jsKey: string }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [selected, setSelected] = useState<MapSpace | null>(null);
  const [mapError, setMapError] = useState(jsKey ? "" : "NO_KEY");
  const [ready, setReady] = useState(false);

  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const clusterer = useRef<any>(null);
  const fitted = useRef(false);

  const districts = useMemo(() => [...new Set(spaces.map((s) => s.district).filter(Boolean) as string[])].sort(), [spaces]);
  const types = useMemo(() => [...new Set(spaces.map((s) => s.typeLabel).filter(Boolean))].sort(), [spaces]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return spaces.filter((s) => {
      if (!showDemo && s.status === "demo") return false;
      if (district && s.district !== district) return false;
      if (type && s.typeLabel !== type) return false;
      if (status && s.status !== status) return false;
      if (needle && !(s.name.toLowerCase().includes(needle) || s.address.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [spaces, q, district, type, status, showDemo]);

  const onMap = filtered.filter((s) => s.lat !== null && s.lng !== null);
  const noLocation = filtered.filter((s) => s.lat === null || s.lng === null);

  // SDK + 지도 초기화
  useEffect(() => {
    if (!jsKey || !el.current) return;
    let cancelled = false;
    loadKakao(jsKey)
      .then((kakao) => {
        if (cancelled || !el.current) return;
        map.current = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 8 });
        clusterer.current = new kakao.maps.MarkerClusterer({ map: map.current, averageCenter: true, minLevel: 6 });
        setReady(true);
      })
      .catch(() => { if (!cancelled) setMapError("LOAD"); });
    return () => { cancelled = true; };
  }, [jsKey]);

  // 필터 결과 → 마커
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    clusterer.current.clear();
    const bounds = new kakao.maps.LatLngBounds();
    const list = onMap.map((s) => {
      const pos = new kakao.maps.LatLng(s.lat, s.lng);
      const m = new kakao.maps.Marker({ position: pos, title: s.name });
      kakao.maps.event.addListener(m, "click", () => setSelected(s));
      bounds.extend(pos);
      return m;
    });
    clusterer.current.addMarkers(list);
    if (list.length > 0 && !fitted.current) {
      map.current.setBounds(bounds);
      fitted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filtered]);

  // 필터를 바꾸면 결과 전체가 보이도록 다시 맞춘다(검색어 입력 중에는 지도를 흔들지 않음)
  useEffect(() => { fitted.current = false; }, [district, type, status, showDemo]);

  function focus(s: MapSpace) {
    setSelected(s);
    if (!ready || s.lat === null || s.lng === null) return;
    map.current.setLevel(3);
    map.current.panTo(new window.kakao.maps.LatLng(s.lat, s.lng));
  }

  function refit() {
    if (!ready || onMap.length === 0) return;
    const b = new window.kakao.maps.LatLngBounds();
    onMap.forEach((s) => b.extend(new window.kakao.maps.LatLng(s.lat, s.lng)));
    map.current.setBounds(b);
  }

  const ctl = "text-sm px-3 py-2 border bg-transparent";
  const border = { borderColor: "var(--a-line)" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공간명 또는 주소 검색" className={`${ctl} w-64`} style={border} />
        <select value={district} onChange={(e) => setDistrict(e.target.value)} className={ctl} style={border}>
          <option value="">지역 전체</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
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
        <button type="button" onClick={refit} className={ctl} style={border}>전체 보기</button>
      </div>

      <p className="text-sm tabular-nums" style={{ color: "var(--a-dim)" }}>
        전체 {filtered.length}곳 · 지도 표시 {onMap.length}곳 · 위치 정보 없음 {noLocation.length}곳
      </p>

      {q.trim() && onMap.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {onMap.slice(0, 8).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => focus(s)} className="text-xs px-2.5 py-1.5 border hover:opacity-70" style={border}>
                {s.name} <span style={{ color: "var(--a-faint)" }}>{s.district}</span>
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
            <p className="font-semibold pr-4">{selected.name}</p>
            <p className="text-xs">{selected.district ?? "지역 없음"} · {STATUS_LABEL[selected.status]}</p>
            {selected.address && <p className="text-xs opacity-70">{selected.address}</p>}
            <Link href={`/admin/${selected.id}/edit`} className="inline-block text-xs underline underline-offset-4 pt-1">공간 관리 열기</Link>
          </div>
        )}
      </div>

      {noLocation.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer">위치 정보 없음 {noLocation.length}곳</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {noLocation.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/${s.id}/edit`} className="hover:underline underline-offset-4">{s.name}</Link>
                <span className="text-xs ml-2" style={{ color: "var(--a-faint)" }}>{s.district ?? "—"}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2" style={{ color: "var(--a-dim)" }}>공간 수정 화면의 “위치 검색”에서 장소를 선택하면 지도에 나타나요.</p>
        </details>
      )}
    </div>
  );
}
