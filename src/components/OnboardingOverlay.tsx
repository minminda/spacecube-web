"use client";

import { useEffect, useState } from "react";

const LINES = [
  { text: "SPACECUBE v1.0", delay: 0, style: "fg" },
  { text: "─────────────────────────────", delay: 300, style: "border" },
  { text: "> 처음 오셨군요.", delay: 700, style: "dim" },
  { text: "", delay: 1000, style: "dim" },
  { text: "// 공간큐브는", delay: 1200, style: "dim" },
  { text: "공간을 기록하고", delay: 1600, style: "fg" },
  { text: "취향을 발견하는 곳이에요.", delay: 2000, style: "fg" },
  { text: "", delay: 2300, style: "dim" },
  { text: "// 이렇게 시작해요", delay: 2500, style: "dim" },
  { text: "01. 지역을 선택하고 공간을 찾아가요.", delay: 2900, style: "fg" },
  { text: "02. 공간 안의 큐브에서 QR을 찾아요.", delay: 3300, style: "fg" },
  { text: "03. 그 공간이 어땠는지 기록해요.", delay: 3700, style: "fg" },
  { text: "", delay: 4000, style: "dim" },
  { text: "> 기록이 쌓이면, 나의 취향이 보여요.", delay: 4200, style: "dim" },
];

const TOTAL_DELAY = 4800;

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [shownLines, setShownLines] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("spacecube_onboarding");
    if (seen) return;
    setVisible(true);

    const timers: ReturnType<typeof setTimeout>[] = [];

    LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setShownLines((prev) => [...prev, i]);
      }, line.delay);
      timers.push(t);
    });

    const readyTimer = setTimeout(() => setReady(true), TOTAL_DELAY);
    timers.push(readyTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  function dismiss() {
    localStorage.setItem("spacecube_onboarding", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col px-6 py-12 overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-sm mx-auto w-full flex flex-col gap-6 flex-1">

        {/* 스킵 */}
        <div className="flex justify-end">
          <button
            onClick={dismiss}
            className="text-xs"
            style={{ color: "var(--dim)" }}
          >
            skip _
          </button>
        </div>

        {/* 터미널 라인 */}
        <div className="flex flex-col gap-1 flex-1">
          {LINES.map((line, i) => {
            if (!shownLines.includes(i)) return null;

            const color =
              line.style === "fg" ? "var(--fg)"
              : line.style === "border" ? "var(--border)"
              : "var(--dim)";

            if (line.text === "") return <div key={i} className="h-2" />;

            return (
              <p
                key={i}
                className="text-sm leading-relaxed"
                style={{ color }}
              >
                {line.text}
              </p>
            );
          })}

          {/* 커서 */}
          {!ready && (
            <span className="text-sm" style={{ color: "var(--dim)" }}>_</span>
          )}
        </div>

        {/* CTA */}
        {ready && (
          <button
            onClick={dismiss}
            className="w-full text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            [[ 시작하기 ]]
          </button>
        )}
      </div>
    </div>
  );
}
