/* ── 방명록 더미 데이터 (UX 실험용) ──────────────────────────
   실제 DB 연동 전 캔버스의 분위기를 만드는 60개의 포스트잇.
   시드 고정 PRNG로 생성 → 서버/클라이언트 렌더 결과가 항상 동일 (SSR 안전).
   실사용 기록은 GuestbookNote 테이블에서 오고, 더미는 그 위에 섞인다.
──────────────────────────────────────────────────────────── */

// 정사각형 + 대폭 확장 — 상하좌우 어느 방향으로도 동일하게 자유로운 팬
export const WORLD_W = 5000;
export const WORLD_H = 5000;
export const NOTE_W = 170;
export const POSTIT_COLOR = "#F6E7A8"; // MVP 대표 노란색 (따뜻한 베이지 노랑)

export interface GuestbookNoteData {
  id: string;
  content: string;
  x: number;
  y: number;
  rotation: number;
  color: string;
  createdAt: string; // YYYY.MM.DD
}

const POOL = [
  "오늘은 생각보다 오래 머물렀다.",
  "혼자 오길 잘했다.",
  "비 오는 날 다시 오고 싶은 곳.",
  "여기서는 시간이 천천히 간다.",
  "오늘 읽은 문장이 오래 남았다.",
  "다음엔 친구랑 또 오기로 했다.",
  "이 공간을 알게 되어 기쁘다.",
  "조용해서 더 많이 생각하게 됐다.",
  "창가 자리에서 골목을 한참 봤다.",
  "오래된 책 냄새가 좋았다.",
  "아무 말도 하지 않아도 되는 곳.",
  "오늘의 나에게 필요했던 시간.",
  "여기 앉아서 편지를 썼다.",
  "음악 소리가 딱 적당했다.",
  "구석 자리가 제일 좋아요.",
  "무언가 두고 온 기분이 들어 다시 왔다.",
  "혼자만 알고 싶은 곳.",
  "오늘은 그냥 창밖만 봤다.",
  "생각 정리가 필요할 때 떠오르는 곳.",
  "두 번째 방문. 여전히 조용하다.",
  "오후 4시의 빛이 예뻤다.",
  "지나가다 들어왔는데 한참을 앉아 있었다.",
  "다음엔 부모님과 와보고 싶다.",
  "여기서 쓴 일기는 왠지 더 솔직해진다.",
];

// 시드 고정 PRNG — Math.random 금지 (SSR/CSR 동일 결과 보장)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 중앙 클러스터 → 중간 거리 → 먼 곳 순으로 밀도를 낮추며 배치 */
function generate(): GuestbookNoteData[] {
  const rand = mulberry32(20260707);
  const rings = [
    { count: 14, rMin: 40, rMax: 400 },   // 중앙: 진입 시 보이는 기록
    { count: 18, rMin: 470, rMax: 880 },  // 중간: 살짝 줌아웃/팬하면 발견
    { count: 28, rMin: 940, rMax: 1500 }, // 먼 곳: 탐험해야 발견
  ];

  const notes: GuestbookNoteData[] = [];
  let idx = 0;

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const angle = rand() * Math.PI * 2;
      const r = ring.rMin + rand() * (ring.rMax - ring.rMin);
      const cx = WORLD_W / 2 + Math.cos(angle) * r;
      const cy = WORLD_H / 2 + Math.sin(angle) * r * (WORLD_H / WORLD_W); // 세로 비율 보정
      const x = Math.min(Math.max(cx - NOTE_W / 2, 60), WORLD_W - NOTE_W - 60);
      const y = Math.min(Math.max(cy, 60), WORLD_H - 200);

      const dayOffset = Math.floor(rand() * 90); // 2026.04~06 사이
      const date = new Date(Date.UTC(2026, 3, 1 + dayOffset));
      const createdAt = `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;

      notes.push({
        id: `dummy-${idx}`,
        content: POOL[idx % POOL.length],
        x,
        y,
        rotation: rand() * 6 - 3,
        color: POSTIT_COLOR,
        createdAt,
      });
      idx++;
    }
  }
  return notes;
}

export const DUMMY_NOTES: GuestbookNoteData[] = generate();
