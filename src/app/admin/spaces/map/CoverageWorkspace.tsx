"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DistrictManager, { type RegionRow, type UnregisteredRow } from "@/app/admin/districts/DistrictManager";
import AdminSpaceMap, { type MapSpace, type MapRegion } from "./AdminSpaceMap";

/** 공간 지도 + 지역 관리를 한 화면에서 — 지역 목록과 지도가 서로 연동된다. */
export default function CoverageWorkspace({
  spaces, initialRegions, unregistered, jsKey, scrollToRegions,
}: {
  spaces: MapSpace[];
  initialRegions: RegionRow[];
  unregistered: UnregisteredRow[];
  jsKey: string;
  scrollToRegions: boolean;
}) {
  const [regions, setRegions] = useState<MapRegion[]>(initialRegions.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })));
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const panel = useRef<HTMLElement>(null);

  const onRegionsChange = useCallback((rows: RegionRow[]) => {
    setRegions(rows.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })));
  }, []);

  useEffect(() => {
    if (scrollToRegions) panel.current?.scrollIntoView({ block: "start" });
  }, [scrollToRegions]);

  function viewOnMap(row: RegionRow) {
    setHighlightId(row.id);
    setFocus((f) => ({ id: row.id, nonce: (f?.nonce ?? 0) + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectFromMap(id: string | null) {
    setHighlightId(id);
    if (id) document.getElementById(`region-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      <AdminSpaceMap spaces={spaces} regions={regions} jsKey={jsKey} focusRegion={focus} onSelectRegion={selectFromMap} />
      <section id="region-panel" ref={panel} className="space-y-3 scroll-mt-4">
        <h2 className="text-base font-semibold">지역 관리</h2>
        <DistrictManager
          initialRegions={initialRegions}
          unregistered={unregistered}
          highlightId={highlightId}
          onViewOnMap={viewOnMap}
          onRegionsChange={onRegionsChange}
        />
      </section>
    </div>
  );
}
