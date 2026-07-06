"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ── 디지털 방명록 (UX 실험) ─────────────────────────────────
   리뷰가 아니라 방명록 — 평가 없이 경험·감정·혼잣말이 남는 벽.
   운영자 이야기를 다 읽은 사용자가 "숨겨진 방명록을 발견"하는
   구조라서 처음엔 접혀 있고, 버튼을 눌러야 펼쳐진다.
   조용한 포스트잇 벽: 약간의 회전 + 미세한 겹침, 과한 산포 없음.
   현재는 더미 데이터 (백엔드 미연동, ENABLE_GUESTBOOK_WALL로 제어).
──────────────────────────────────────────────────────────── */

interface Note {
  text: string;
  date?: string;
}

const NOTES: Note[] = [
  { text: "오늘은 비가 와서인지\n더 오래 머물렀어요.", date: "2026.07.06" },
  { text: "다음에도\n혼자 오고 싶은 공간." },
  { text: "재즈가\n좋았어요." },
  { text: "오늘 읽은 문장이\n오래 남는다.", date: "2026.06.28" },
  { text: "시간이 천천히\n가는 공간." },
  { text: "혼자 오길 잘했다." },
  { text: "다음엔 부모님과\n와보고 싶다." },
  { text: "창가 자리에 앉으면\n골목이 다 보여요.", date: "2026.06.21" },
  { text: "생각 정리가 필요할 때\n다시 올 것 같다." },
  { text: "냄새가 좋았다.\n오래된 책 냄새." },
  { text: "두 번째 방문.\n여전히 조용하다.", date: "2026.07.02" },
  { text: "여기서 쓴 일기는\n왠지 더 솔직해진다." },
  { text: "오후 4시의 빛이\n예뻤어요.", date: "2026.06.15" },
  { text: "음악 소리가\n딱 적당했다." },
  { text: "아무 말도 하지 않아도\n되는 곳." },
  { text: "오늘의 나에게\n필요했던 시간." },
  { text: "친구에게 알려주고 싶지만,\n조금 아깝기도 하다." },
  { text: "지나가다 우연히 들어왔는데,\n한참을 앉아 있었다.", date: "2026.05.30" },
  { text: "비 오는 날\n다시 오고 싶다." },
  { text: "여기 앉아서\n편지를 썼다.", date: "2026.06.09" },
  { text: "생각보다\n오래 머물렀다." },
  { text: "혼자만\n알고 싶은 곳." },
  { text: "구석 자리가\n제일 좋아요." },
  { text: "오늘은 그냥\n창밖만 봤다.", date: "2026.07.04" },
  { text: "무언가 두고 온 기분이 들어\n다시 왔다." },
  { text: "조용해서 좋았어요.\n그게 전부인데, 그게 다였다." },
];

// 인덱스 기반 고정 변주 (SSR/CSR 동일해야 하므로 Math.random 금지)
const ROTATIONS = [-2.2, 1.6, -1.0, 2.3, -0.6, 1.1, -1.7, 0.8];
const OFFSETS = [0, 10, -5, 6, 12, -3, 4, -7];

function rotationOf(i: number) {
  return ROTATIONS[(i * 3 + 1) % ROTATIONS.length];
}
function offsetOf(i: number) {
  return OFFSETS[(i * 5 + 2) % OFFSETS.length];
}

export default function GuestbookWall() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <section className="space-y-5">
      {/* 발견 문구 — 열기 전후 모두 유지 */}
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
        {"이 공간에는\n다른 사람들의 흔적도 남아 있습니다."}
      </p>

      {/* 열어보기 버튼 — 열리면 사라짐 */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-sm py-2.5 px-5 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            방문자들의 이야기 열어보기
          </motion.button>
        )}
      </AnimatePresence>

      {/* 포스트잇 벽 — fade + expand */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden" }}
          >
            <div className="columns-2 md:columns-3 gap-3 pt-3 pb-1">
              {NOTES.map((note, i) => (
                <motion.div
                  key={i}
                  initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.025, duration: 0.35, ease: "easeOut" }}
                  className="relative mb-3 p-4 border"
                  style={{
                    breakInside: "avoid",
                    background: "var(--tag-bg)",
                    borderColor: "var(--border)",
                    transform: `rotate(${rotationOf(i)}deg)`,
                    marginTop: i < 3 ? 0 : offsetOf(i),
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* 테이프 자국 */}
                  <span
                    aria-hidden
                    className="absolute -top-1.5 left-1/2 w-9 h-3"
                    style={{
                      background: "var(--dim)",
                      opacity: 0.15,
                      transform: `translateX(-50%) rotate(${-rotationOf(i) * 0.8}deg)`,
                    }}
                  />
                  <p className="text-sm leading-relaxed whitespace-pre-line">{note.text}</p>
                  {note.date && (
                    <p className="text-xs mt-3" style={{ color: "var(--dim)" }}>{note.date}</p>
                  )}
                </motion.div>
              ))}
            </div>

            <p className="text-xs pt-4 text-center" style={{ color: "var(--border)" }}>
              이곳에 다녀간 사람들이 남긴 흔적입니다.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
