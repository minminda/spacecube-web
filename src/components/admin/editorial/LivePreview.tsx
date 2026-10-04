"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adminButtonClass } from "@/components/admin/ui";
import { PREVIEW_MESSAGE, PREVIEW_READY, type PreviewPayload } from "@/components/editorial/EditorialPreviewFrame";

type Device = "desktop" | "mobile";
/** 공개 화면 기준 뷰포트 — 데스크톱은 실제 1280px 화면을 그려 축소, 모바일은 실제 390px 화면(반응형 CSS가 그대로 적용됨) */
const VIEWPORT: Record<Device, number> = { desktop: 1280, mobile: 390 };
const DEBOUNCE_MS = 150;

/**
 * 실시간 미리보기 창 — 공개 상세와 같은 렌더러를 iframe(/preview/editorial)에 띄우고 작성 중 초안을 postMessage로 보낸다.
 * iframe이라 Tailwind 반응형(뷰포트 기준)이 실제 독자 화면과 똑같이 적용된다. 저장하지 않은 내용만 보내고 DB에는 쓰지 않는다.
 */
function PreviewViewport({ payload, device, label }: { payload: PreviewPayload; device: Device; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ready = useRef(false);
  const latest = useRef(payload);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const send = useCallback(() => {
    if (!ready.current) return;
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, payload: latest.current }, window.location.origin);
  }, []);

  // iframe이 준비되면 현재 초안을 바로 보낸다
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { type?: string })?.type === PREVIEW_READY) { ready.current = true; send(); }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  // 입력이 바뀌면 짧게 모아서 보낸다(저장 없이 폼 상태 그대로)
  useEffect(() => {
    latest.current = payload;
    const t = setTimeout(send, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [payload, send]);

  const vw = VIEWPORT[device];
  const scale = size.w ? Math.min(1, size.w / vw) : 1;
  return (
    <div ref={box} className="relative w-full h-full overflow-hidden" style={{ background: device === "mobile" ? "var(--a-soft)" : "#fff" }}>
      {size.w > 0 && (
        <div className="absolute top-0" style={{ left: Math.max(0, (size.w - vw * scale) / 2), width: vw * scale, height: size.h }}>
          <iframe
            ref={frame}
            src="/preview/editorial"
            title={label}
            style={{ width: vw, height: size.h / scale, transform: `scale(${scale})`, transformOrigin: "top left", border: 0, background: "#fff", boxShadow: device === "mobile" ? "0 0 0 1px var(--a-line)" : undefined }}
          />
        </div>
      )}
    </div>
  );
}

function DeviceToggle({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  return (
    <div className="inline-flex" role="radiogroup" aria-label="미리보기 화면">
      {(["desktop", "mobile"] as const).map((d) => (
        <button key={d} type="button" role="radio" aria-checked={device === d} onClick={() => onChange(d)} className={device === d ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}>
          {d === "desktop" ? "DESKTOP" : "MOBILE"}
        </button>
      ))}
    </div>
  );
}

/** 미리보기 머리줄 — 관리자 UI 영역(콘텐츠 밖)에만 둔다. */
function Badge({ published }: { published: boolean }) {
  return (
    <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>
      미리보기 · {published ? "저장하지 않은 변경도 함께 보여요" : "아직 공개되지 않았습니다"}
    </p>
  );
}

/** 데스크톱(1024px 이상): 편집기 옆 고정(sticky) 창. */
export function LivePreviewPane({ payload, published }: { payload: PreviewPayload; published: boolean }) {
  const [device, setDevice] = useState<Device>("desktop");
  return (
    <div className="hidden lg:flex flex-col sticky top-6 a-card overflow-hidden" style={{ height: "calc(100vh - 48px)" }}>
      <div className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderBottom: "1px solid var(--a-line)" }}>
        <Badge published={published} />
        <DeviceToggle device={device} onChange={setDevice} />
      </div>
      <div className="flex-1 min-h-0">
        <PreviewViewport key={device} payload={payload} device={device} label="공개 화면 미리보기" />
      </div>
    </div>
  );
}

/** 좁은 화면(관리자를 모바일에서 쓸 때): [미리보기] → 전체 화면 미리보기 → [편집으로 돌아가기]. */
export function LivePreviewSheet({ payload, published }: { payload: PreviewPayload; published: boolean }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("mobile");
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} className={adminButtonClass("secondary")}>미리보기</button>
      {/* 전체 화면은 body로 portal — 하단 고정 저장 바(z-30) 안에서 열면 관리자 상단 바에 가려지기 때문 */}
      {open && createPortal(
        <div className="admin-ui fixed inset-0 z-[80] flex flex-col" style={{ background: "var(--a-bg)" }} role="dialog" aria-modal="true" aria-label="공개 화면 미리보기">
          <div className="flex items-center justify-between gap-2 px-3 h-12 shrink-0" style={{ borderBottom: "1px solid var(--a-line)" }}>
            <button type="button" onClick={() => setOpen(false)} className={adminButtonClass("ghost", "sm")}>← 편집으로 돌아가기</button>
            <DeviceToggle device={device} onChange={setDevice} />
          </div>
          <div className="px-3 py-1.5 shrink-0"><Badge published={published} /></div>
          <div className="flex-1 min-h-0">
            <PreviewViewport key={device} payload={payload} device={device} label="공개 화면 미리보기" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
