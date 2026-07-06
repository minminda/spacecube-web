"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";

/* ── 디지털 방명록 (UX 실험) — 무한 캔버스 ────────────────────
   리뷰가 아니라 방명록. 거대한 벽 위에 포스트잇이 흩어져 있고,
   사용자는 드래그(관성 팬)와 휠/핀치 줌으로 벽을 탐험한다.
   기본 진입은 중앙 클러스터가 보이는 확대 상태 — 줌아웃할수록
   멀리 붙여둔 기록들이 시야에 들어온다 ("숨겨진 기록의 발견").
   포스트잇은 랜덤이 아니라 의도된 좌표에 고정 배치 (SSR 안전).
   현재는 더미 데이터 (백엔드 미연동, ENABLE_GUESTBOOK_WALL로 제어).
──────────────────────────────────────────────────────────── */

// 월드(벽) 크기 — 뷰포트보다 훨씬 큰 캔버스
const WORLD_W = 3200;
const WORLD_H = 2400;
const CX = WORLD_W / 2;
const CY = WORLD_H / 2;
const CARD_W = 190;

interface Note {
  text: string;
  date?: string;
  dx: number; // 월드 중앙 기준 오프셋
  dy: number;
}

const NOTES: Note[] = [
  // ── 중앙 클러스터: 처음 화면에서 보이는 기록들 ──
  { text: "오늘은 비가 와서인지\n더 오래 머물렀어요.", date: "2026.07.06", dx: -150, dy: -110 },
  { text: "다음에도\n혼자 오고 싶은 공간.", dx: 70, dy: -180 },
  { text: "재즈가\n좋았어요.", dx: 230, dy: -60 },
  { text: "오늘 읽은 문장이\n오래 남는다.", date: "2026.06.28", dx: -60, dy: 40 },
  { text: "시간이 천천히\n가는 공간.", dx: 150, dy: 130 },
  { text: "혼자 오길 잘했다.", dx: -260, dy: 100 },
  { text: "음악 소리가\n딱 적당했다.", dx: -320, dy: -40 },
  { text: "오늘의 나에게\n필요했던 시간.", dx: 30, dy: 250 },

  // ── 조금 떨어진 곳: 살짝 줌아웃하거나 팬하면 보이는 기록들 ──
  { text: "다음엔 부모님과\n와보고 싶다.", dx: -560, dy: -390 },
  { text: "창가 자리에 앉으면\n골목이 다 보여요.", date: "2026.06.21", dx: 640, dy: -320 },
  { text: "생각 정리가 필요할 때\n다시 올 것 같다.", dx: 760, dy: 190 },
  { text: "냄새가 좋았다.\n오래된 책 냄새.", dx: -700, dy: 260 },
  { text: "두 번째 방문.\n여전히 조용하다.", date: "2026.07.02", dx: -400, dy: 540 },
  { text: "여기서 쓴 일기는\n왠지 더 솔직해진다.", dx: 440, dy: 500 },

  // ── 먼 곳: 줌아웃해야 발견되는 숨겨진 기록들 ──
  { text: "오후 4시의 빛이\n예뻤어요.", date: "2026.06.15", dx: -1280, dy: -870 },
  { text: "아무 말도 하지 않아도\n되는 곳.", dx: -930, dy: -1010 },
  { text: "친구에게 알려주고 싶지만,\n조금 아깝기도 하다.", dx: 1120, dy: -920 },
  { text: "지나가다 우연히 들어왔는데,\n한참을 앉아 있었다.", date: "2026.05.30", dx: 1370, dy: -370 },
  { text: "비 오는 날\n다시 오고 싶다.", dx: 1320, dy: 620 },
  { text: "여기 앉아서\n편지를 썼다.", date: "2026.06.09", dx: 1150, dy: 960 },
  { text: "생각보다\n오래 머물렀다.", dx: -1330, dy: 470 },
  { text: "혼자만\n알고 싶은 곳.", dx: -1120, dy: 920 },
  { text: "구석 자리가\n제일 좋아요.", dx: 220, dy: -1060 },
  { text: "오늘은 그냥\n창밖만 봤다.", date: "2026.07.04", dx: -380, dy: 1010 },
  { text: "무언가 두고 온 기분이 들어\n다시 왔다.", dx: 870, dy: -1100 },
  { text: "조용해서 좋았어요.\n그게 전부인데, 그게 다였다.", dx: 600, dy: 1050 },
];

// 인덱스 기반 고정 회전 (SSR/CSR 동일해야 하므로 Math.random 금지)
const ROTATIONS = [-2.2, 1.6, -1.0, 2.3, -0.6, 1.1, -1.7, 0.8];
function rotationOf(i: number) {
  return ROTATIONS[(i * 3 + 1) % ROTATIONS.length];
}
/** 중앙에서 먼 기록일수록 늦게 떠오르는 등장 딜레이 */
function revealDelayOf(n: Note) {
  return 0.1 + Math.hypot(n.dx, n.dy) / 2600;
}

function ResetViewButton() {
  const { resetTransform } = useControls();
  return (
    <button
      type="button"
      onClick={() => resetTransform(400)}
      className="absolute bottom-3 right-3 z-10 text-xs px-2.5 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--dim)" }}
    >
      처음 위치로
    </button>
  );
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

      {/* 무한 캔버스 — fade + expand로 등장 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="relative border overflow-hidden cursor-grab active:cursor-grabbing"
              style={{ borderColor: "var(--border)", height: "min(62vh, 560px)", touchAction: "none" }}
            >
              <TransformWrapper
                initialScale={1}
                minScale={0.14}
                maxScale={2.2}
                centerOnInit
                limitToBounds
                wheel={{ step: 0.12 }}
                pinch={{ step: 6 }}
                doubleClick={{ disabled: true }}
              >
                <ResetViewButton />
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: WORLD_W, height: WORLD_H }}
                >
                  {/* 월드(벽) — 은은한 격자로 공간감 표현 */}
                  <div
                    className="relative"
                    style={{
                      width: WORLD_W,
                      height: WORLD_H,
                      background: "var(--bg)",
                      backgroundImage:
                        "radial-gradient(var(--border) 1px, transparent 1px)",
                      backgroundSize: "56px 56px",
                    }}
                  >
                    {NOTES.map((note, i) => (
                      <motion.div
                        key={i}
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: revealDelayOf(note), duration: 0.4, ease: "easeOut" }}
                        className="absolute p-4 border select-none"
                        style={{
                          left: CX + note.dx - CARD_W / 2,
                          top: CY + note.dy,
                          width: CARD_W,
                          background: "var(--tag-bg)",
                          borderColor: "var(--border)",
                          rotate: `${rotationOf(i)}deg`,
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
                </TransformComponent>
              </TransformWrapper>
            </div>

            <p className="text-xs pt-3 text-center leading-relaxed" style={{ color: "var(--border)" }}>
              드래그로 이동 · 휠/핀치로 확대·축소
              <br />
              이 벽은 보이는 것보다 넓습니다.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
