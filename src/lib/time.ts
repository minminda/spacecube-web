/** `yyyy.mm.dd` 공용 날짜 포맷 — 여러 파일에 각자 구현돼 있던 formatDate/formatDots를 통합. */
export function formatDotDate(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  // 항상 한국 시간 기준 — 서버(UTC)에서 그리면 KST 0~9시 기록이 전날로 보이고, 브라우저 렌더와도 달라진다
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d).replaceAll("-", ".");
}

/** 알림 목록 등에서 쓰는 상대 시간 표시 — "3시간 전", "1일 전" 처럼 표시하다가 일주일이 지나면 절대 날짜로 전환한다. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "방금 전";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}일 전`;

  return formatDotDate(date);
}
