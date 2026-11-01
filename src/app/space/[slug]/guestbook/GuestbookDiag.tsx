"use client";

import { useEffect, useState } from "react";

/* ── 방명록 화면 점유 진단(임시 · 주소에 ?gbdiag=1 을 붙였을 때만 렌더) ─────────────────────────
   실제 iPhone에서 "화면 하단이 왜 비는지"를 사이트 내부 영역과 Safari UI로 가르기 위한 도구. 일반 방문자에게는 보이지 않는다.
   - 초록 선: 레이아웃 뷰포트 하단(innerHeight) / 노랑 선: 보이는 영역 하단(visualViewport) — 선 아래가 비어 있으면 Safari UI(웹 콘텐츠가 못 가는 곳)
   - 빨강 테두리: .gb-shell, 파랑: 캔버스, 분홍: 하단 CTA. 사이트 내부 영역은 이 테두리 안이다.
   - lvh / svh / dvh / safe-area 는 프로브 요소로 실측한다.
   진단이 끝나면 이 파일과 GuestbookCanvas의 사용처를 지운다. ── */

type Snap = Record<string, string>;

function measure(): Snap {
  const r = (el: Element | null | undefined) => {
    if (!el) return "-";
    const b = el.getBoundingClientRect();
    return `top ${Math.round(b.top)} · bottom ${Math.round(b.bottom)} · h ${Math.round(b.height)}`;
  };
  const probe = (css: string) => {
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;${css}`;
    document.body.appendChild(d);
    const h = d.getBoundingClientRect().height;
    d.remove();
    return Math.round(h);
  };
  const shell = document.querySelector(".gb-shell");
  const vv = window.visualViewport;
  return {
    "innerHeight": String(window.innerHeight),
    "visualViewport.height": vv ? `${Math.round(vv.height)} (offsetTop ${Math.round(vv.offsetTop)})` : "-",
    "screen.height": String(window.screen.height),
    "100lvh / 100svh / 100dvh": `${probe("height:100lvh")} / ${probe("height:100svh")} / ${probe("height:100dvh")}`,
    "safe-area top / bottom": `${probe("height:env(safe-area-inset-top)")} / ${probe("height:env(safe-area-inset-bottom)")}`,
    "documentElement client/scrollHeight": `${document.documentElement.clientHeight} / ${document.documentElement.scrollHeight}`,
    "scrollY": String(Math.round(window.scrollY)),
    "nav": r(document.querySelector("nav")),
    ".gb-shell": r(shell),
    "header": r(shell?.children[0]),
    "canvas": r(shell?.children[1]),
    "CTA bar": r(shell?.children[2]),
    "dpr": String(window.devicePixelRatio),
  };
}

export default function GuestbookDiag() {
  const [snap, setSnap] = useState<Snap | null>(null);
  const [boxes, setBoxes] = useState<{ top: number; height: number; color: string }[]>([]);
  const [vvBottom, setVvBottom] = useState(0);
  const [innerH, setInnerH] = useState(0);

  useEffect(() => {
    const update = () => {
      setSnap(measure());
      const shell = document.querySelector(".gb-shell");
      const list: { el: Element | null | undefined; color: string }[] = [
        { el: shell, color: "#ff3b30" },
        { el: shell?.children[1], color: "#0a84ff" },
        { el: shell?.children[2], color: "#ff2d92" },
      ];
      setBoxes(list.flatMap(({ el, color }) => { if (!el) return []; const b = el.getBoundingClientRect(); return [{ top: b.top, height: b.height, color }]; }));
      const vv = window.visualViewport;
      setVvBottom(vv ? vv.offsetTop + vv.height : window.innerHeight);
      setInnerH(window.innerHeight);
    };
    update();
    const t = setInterval(update, 500);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  if (!snap) return null; // 서버 렌더에서는 window가 없다 — 마운트 후에만 그린다
  return (
    <div aria-hidden style={{ position: "fixed", left: 0, top: 0, width: "100%", height: "100%", zIndex: 9999, pointerEvents: "none", fontFamily: "monospace" }}>
      {boxes.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: b.top, height: b.height, outline: `2px solid ${b.color}`, outlineOffset: -2 }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: innerH - 2, height: 2, background: "#34c759" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: vvBottom - 1, height: 1, background: "#ffd60a" }} />
      <div style={{ position: "absolute", left: 4, top: 60, background: "rgba(0,0,0,0.78)", color: "#fff", fontSize: 10, lineHeight: 1.35, padding: "4px 6px", maxWidth: "94%" }}>
        {snap && Object.entries(snap).map(([k, v]) => (<div key={k}><span style={{ color: "#aaa" }}>{k}</span> {v}</div>))}
        <div style={{ color: "#aaa", marginTop: 2 }}>초록=innerHeight 하단 · 노랑=visualViewport 하단 · 빨강=shell · 파랑=캔버스 · 분홍=CTA</div>
      </div>
    </div>
  );
}
