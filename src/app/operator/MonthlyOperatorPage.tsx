"use client";

import { useState } from "react";
import Link from "next/link";

/* ── 월간 운영 페이지 (UI/UX 프로토타입) ──────────────────────────
   운영자는 매일 접속하는 사람이 아니라 한 달에 한 번 공간을 돌아보는
   사람이라는 전제로 설계했다. 지금은 실제 데이터/저장 없이 더미 데이터와
   로컬 state로만 동작하는 정보 구조·UI 프로토타입이다.
──────────────────────────────────────────────────────────────── */

const DUMMY_SPACE_NAME = "래버린투하트";

const DUMMY_REPORT = {
  monthLabel: "8월",
  qrVisits: 128,
  guestbookEntries: 43,
  revisitors: 19,
  revisitRate: 15,
  topTaste: "조용한",
  topKeywords: ["혼자", "여유", "커피 한 잔", "책"],
};

interface DummyNote {
  id: string;
  content: string;
  nickname: string;
  date: string;
  featured: boolean;
}

const INITIAL_NOTES: DummyNote[] = [
  { id: "1", content: "혼자 오길 잘했다. 다음에 또 오고 싶다.", nickname: "조용한손님", date: "08.03", featured: false },
  { id: "2", content: "오늘 읽은 문장이 오래 남았다. 이 공간 덕분인 것 같다.", nickname: "책방고양이", date: "08.07", featured: true },
  { id: "3", content: "비 오는 날 다시 오고 싶은 곳.", nickname: "창가자리", date: "08.09", featured: false },
  { id: "4", content: "여기서는 시간이 천천히 간다. 그게 좋았다.", nickname: "느린하루", date: "08.14", featured: false },
  { id: "5", content: "다음엔 친구랑 또 오기로 했다.", nickname: "가끔들르는", date: "08.20", featured: false },
  { id: "6", content: "조용해서 더 많이 생각하게 됐다.", nickname: "말없이", date: "08.25", featured: false },
];

function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDots(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{children}</p>;
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)" }} />;
}

export default function MonthlyOperatorPage() {
  // ── 1. 리포트 주기 설정 ──
  const [reportStartDate, setReportStartDate] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState("");
  const [editingDate, setEditingDate] = useState(false);

  function saveStartDate() {
    if (!dateDraft) return;
    setReportStartDate(dateDraft);
    setEditingDate(false);
  }

  // ── 3. 이번 달 방명록 ──
  const [notes, setNotes] = useState<DummyNote[]>(INITIAL_NOTES);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const openNote = notes.find((n) => n.id === openNoteId) ?? null;

  // 대표 방명록은 한 번에 하나만 — 다시 누르면 해제, 다른 걸 누르면 그쪽으로 옮겨간다.
  function toggleFeatured(id: string) {
    setNotes((prev) => prev.map((n) => ({ ...n, featured: n.id === id ? !n.featured : false })));
  }

  // ── 4. 다음 방명록 준비 ──
  const [question1, setQuestion1] = useState("오늘 가장 기억에 남는 순간은?");
  const [question2, setQuestion2] = useState("요즘 가장 자주 듣는 노래는?");
  const [questionsSaved, setQuestionsSaved] = useState(false);

  function saveQuestions() {
    setQuestionsSaved(true);
    setTimeout(() => setQuestionsSaved(false), 2000);
  }

  // ── 5. 월간 운영 메모 ──
  const [memo, setMemo] = useState("");
  const [memoSaved, setMemoSaved] = useState(false);

  function saveMemo() {
    setMemoSaved(true);
    setTimeout(() => setMemoSaved(false), 2000);
  }

  const inputStyle = { background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)", outline: "none" };

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-10">
      {/* ── 헤더 ── */}
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / 월간 운영</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{DUMMY_SPACE_NAME}</p>
        <h1 className="text-xl font-bold">월간 운영 일지</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          한 달 동안 쌓인 공간의 기록을 돌아보고, 다음 달을 준비해보세요.
        </p>
      </div>

      {/* ── 1. 리포트 주기 설정 ── */}
      <Divider />
      <section className="space-y-3">
        <SectionLabel>// 리포트 주기 설정</SectionLabel>

        {reportStartDate && !editingDate ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-sm" style={{ color: "var(--dim)" }}>리포트 시작일</p>
              <p className="text-base font-medium">{formatDots(reportStartDate)}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              다음 리포트는 <span style={{ color: "var(--fg)" }}>{addOneMonth(reportStartDate)}</span>에 생성돼요.
            </p>
            <button
              type="button"
              onClick={() => { setDateDraft(reportStartDate); setEditingDate(true); }}
              className="text-xs underline underline-offset-2"
              style={{ color: "var(--border)" }}
            >
              시작일 변경
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              처음 한 번만 설정하면, 그 날짜를 기준으로 매달 리포트가 만들어져요.
              <br />
              예) 7월 1일 시작 → 8월 1일 첫 번째 리포트 → 9월 1일 두 번째 리포트
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="flex-1 text-sm px-3 py-2.5 border"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={saveStartDate}
                disabled={!dateDraft}
                className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-30"
                style={{ borderColor: "var(--fg)" }}
              >
                설정하기
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
              리포트가 도착하면 문자 또는 이메일로 &ldquo;이번 달 공간 리포트가 도착했습니다&rdquo;라고
              알려드리고, 링크를 누르면 이 페이지로 바로 들어올 수 있게 될 예정이에요. (현재는 화면만 준비됐어요.)
            </p>
          </div>
        )}
        {editingDate && reportStartDate && (
          <div className="flex gap-2 pt-1">
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="flex-1 text-sm px-3 py-2.5 border"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={saveStartDate}
              disabled={!dateDraft}
              className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-30"
              style={{ borderColor: "var(--fg)" }}
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditingDate(false)}
              className="text-sm px-3 py-2.5 border"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              취소
            </button>
          </div>
        )}
      </section>

      {/* ── 2. 이번 달 공간 리포트 ── */}
      <Divider />
      <section className="space-y-4">
        <div className="space-y-1">
          <SectionLabel>// 이번 달 공간 리포트</SectionLabel>
          <h2 className="text-lg font-bold">{DUMMY_REPORT.monthLabel} 공간 리포트</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ReportStat label="QR 방문" value={`${DUMMY_REPORT.qrVisits}`} unit="명" />
          <ReportStat label="방명록 작성" value={`${DUMMY_REPORT.guestbookEntries}`} unit="개" />
          <ReportStat label="재방문" value={`${DUMMY_REPORT.revisitors}`} unit={`명 · ${DUMMY_REPORT.revisitRate}%`} />
        </div>

        <div className="p-4 border space-y-1.5" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--dim)" }}>가장 많이 선택된 취향</p>
          <p className="text-base font-medium">{DUMMY_REPORT.topTaste}</p>
        </div>

        <div className="p-4 border space-y-2" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--dim)" }}>가장 많이 등장한 키워드</p>
          <div className="flex flex-wrap gap-2">
            {DUMMY_REPORT.topKeywords.map((kw) => (
              <span key={kw} className="text-xs px-2.5 py-1 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                {kw}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--border)" }}>// 지금은 예시 데이터로 구성되어 있어요.</p>
      </section>

      {/* ── 3. 이번 달 방명록 ── */}
      <Divider />
      <section className="space-y-4">
        <div className="space-y-1">
          <SectionLabel>// 이번 달 방명록</SectionLabel>
          <h2 className="text-lg font-bold">{notes.length}개의 기록</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setOpenNoteId(note.id)}
              className="text-left p-3 space-y-2 transition-transform hover:-translate-y-0.5"
              style={{ background: "#F6E7A8", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            >
              {note.featured && (
                <span className="inline-block text-[10px] px-1.5 py-0.5" style={{ background: "#3d3524", color: "#F6E7A8" }}>
                  대표
                </span>
              )}
              <p className="text-[13px] leading-relaxed break-keep line-clamp-3" style={{ color: "#3d3524" }}>
                {note.content}
              </p>
              <p className="text-[10px]" style={{ color: "#8a7d5c" }}>— {note.nickname} · {note.date}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── 4. 다음 방명록 준비 ── */}
      <Divider />
      <section className="space-y-4">
        <div className="space-y-1">
          <SectionLabel>// 다음 방명록 준비</SectionLabel>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            방문자가 방명록을 쓸 때 참고할 글감이에요. 강요가 아니라, 글을 시작하기 위한 힌트예요.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-3 py-2.5 border" style={{ borderColor: "var(--border)", opacity: 0.6 }}>
            <span aria-hidden>■</span>
            <span className="text-sm">자유롭게 남겨주세요.</span>
            <span className="text-xs ml-auto" style={{ color: "var(--dim)" }}>고정</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--dim)" }}>질문 1</label>
            <input
              value={question1}
              onChange={(e) => setQuestion1(e.target.value)}
              placeholder="오늘 가장 기억에 남는 순간은?"
              className="w-full text-sm px-3 py-2.5 border"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--dim)" }}>질문 2</label>
            <input
              value={question2}
              onChange={(e) => setQuestion2(e.target.value)}
              placeholder="요즘 가장 자주 듣는 노래는?"
              className="w-full text-sm px-3 py-2.5 border"
              style={inputStyle}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={saveQuestions}
          className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)" }}
        >
          {questionsSaved ? "저장됨 ✓" : "다음 달 질문 저장"}
        </button>
      </section>

      {/* ── 5. 월간 운영 메모 ── */}
      <Divider />
      <section className="space-y-3">
        <div className="space-y-1">
          <SectionLabel>// 월간 운영 메모</SectionLabel>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            운영자만 볼 수 있는 메모예요. 예) 이번 달에는 혼자 오는 손님이 많았다. 다음 달에는 음악을 조금 바꿔볼까.
          </p>
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="이번 달 공간에 대해 남기고 싶은 생각을 자유롭게 적어보세요."
          rows={4}
          className="w-full text-sm px-3 py-2.5 border resize-none"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={saveMemo}
          className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)" }}
        >
          {memoSaved ? "저장됨 ✓" : "메모 저장"}
        </button>
      </section>

      {/* ── 방명록 상세 모달 ── */}
      {openNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenNoteId(null); }}
        >
          <div className="w-full max-w-xs p-6" style={{ background: "#F6E7A8", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
            {openNote.featured && (
              <span className="inline-block text-[10px] px-1.5 py-0.5 mb-3" style={{ background: "#3d3524", color: "#F6E7A8" }}>
                대표 방명록
              </span>
            )}
            <p className="text-base leading-relaxed break-keep" style={{ color: "#3d3524" }}>{openNote.content}</p>
            <p className="text-sm mt-3" style={{ color: "#8a7d5c" }}>— {openNote.nickname} · {openNote.date}</p>
            <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }}>
              <button
                type="button"
                onClick={() => toggleFeatured(openNote.id)}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "#3d3524", color: "#3d3524" }}
              >
                {openNote.featured ? "대표 해제" : "대표 방명록으로 지정"}
              </button>
              <button
                type="button"
                onClick={() => setOpenNoteId(null)}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "#3d3524", color: "#3d3524" }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ReportStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{unit}</p>
    </div>
  );
}
