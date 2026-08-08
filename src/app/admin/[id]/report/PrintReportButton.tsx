"use client";

/** 새 PDF 패키지 없이 브라우저 인쇄(Print CSS)로 PDF를 만든다 — 큐브 QR 스티커 인쇄
 *  (admin/cubes/print/PrintManager.tsx)와 동일한 window.print() 패턴 재사용. 리포트
 *  미리보기는 이미 화면에 항상 보여지고 있어 스티커처럼 숨겨진 인쇄 전용 시트를 별도로
 *  둘 필요가 없다 — page.tsx의 .no-print 클래스가 화면 전용 UI를 인쇄에서만 제외한다. */
export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
      style={{ borderColor: "var(--fg)" }}
    >
      PDF로 저장
    </button>
  );
}
