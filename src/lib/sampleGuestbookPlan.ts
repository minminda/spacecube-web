/* ── 방명록 샘플 보강 계획(순수 함수 — scripts/seed-sample-guestbook.ts가 쓴다) ─────────────────
   공간의 현재 질문(ACTIVE 세션)을 답변 모음(질문 문장 → 답 목록)에서 찾아, 공간당 목표 개수까지 "부족한 만큼만" 더한다.
   - 질문 칸에만 쓴다. 자유 칸에는 새로 만들지 않는다(질문과 무관한 감상문을 넣지 않기 위해).
   - 보이는 질문 중 하나라도 답변 모음에 없으면 그 공간은 아무것도 만들지 않는다(로그로만 알린다).
   - 기존 샘플 중 지금 질문에 맞는 답은 그대로 두고(개수에 포함), 맞지 않는 글(자유 칸 · 바뀐 질문 · 중복)은 정리 대상으로 돌려준다.
   - 다시 실행해도 이미 있는 답은 다시 만들지 않으므로 개수가 늘지 않는다. ── */

export type SampleQuestionCluster = "QUESTION_1" | "QUESTION_2";
type ClusterType = "FREE" | SampleQuestionCluster;

export interface SessionQuestion {
  cluster: SampleQuestionCluster;
  question: string | null;
  /** 방문자 캔버스에 이 질문 칸이 보이는가(GuestbookSession.question1Visible / question2Visible) */
  visible: boolean;
}

export interface ExistingSampleNote {
  id: string;
  clusterType: ClusterType;
  content: string;
}

export type SamplePlan =
  | { status: "skip"; reason: string; keep: ExistingSampleNote[]; stale: ExistingSampleNote[] }
  | {
      status: "ok";
      questions: { cluster: SampleQuestionCluster; question: string }[];
      keep: ExistingSampleNote[];
      stale: ExistingSampleNote[];
      add: { cluster: SampleQuestionCluster; content: string }[];
    };

/** 질문 비교용 — 앞뒤 공백 · 연속 공백만 정리한다(문장 자체가 다르면 다른 질문). */
export function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

export function planSampleTopUp(input: {
  questions: SessionQuestion[];
  existing: ExistingSampleNote[];
  bank: Record<string, readonly string[]>;
  target: number;
}): SamplePlan {
  const bank = new Map(Object.entries(input.bank).map(([q, answers]) => [normalizeQuestion(q), answers]));
  const shown = input.questions
    .filter((q): q is SessionQuestion & { question: string } => q.visible && !!q.question?.trim())
    .map((q) => ({ cluster: q.cluster, question: q.question, answers: bank.get(normalizeQuestion(q.question)) }));

  // 지금 질문에 맞는 기존 샘플만 유지 — 같은 칸 · 같은 문장은 하나만
  const used = new Map<SampleQuestionCluster, Set<string>>(shown.map((q) => [q.cluster, new Set<string>()]));
  const keep: ExistingSampleNote[] = [];
  const stale: ExistingSampleNote[] = [];
  for (const note of input.existing) {
    const q = shown.find((s) => s.cluster === note.clusterType);
    const content = note.content.trim();
    const seen = q ? used.get(q.cluster)! : null;
    if (q?.answers?.includes(content) && seen && !seen.has(content)) {
      seen.add(content);
      keep.push(note);
    } else {
      stale.push(note);
    }
  }

  if (shown.length === 0) return { status: "skip", reason: "보이는 질문 칸이 없음(자유 칸만)", keep, stale };
  const missing = shown.filter((q) => !q.answers?.length);
  if (missing.length > 0) {
    return { status: "skip", reason: `답변 모음에 없는 질문 — ${missing.map((q) => `"${q.question}"`).join(", ")}`, keep, stale };
  }

  // 부족한 만큼 질문 칸을 번갈아 채운다(유지된 글이 적은 칸부터)
  const pools = shown.map((q) => ({
    cluster: q.cluster,
    count: used.get(q.cluster)!.size,
    candidates: q.answers!.filter((a) => !used.get(q.cluster)!.has(a)),
  }));
  const add: { cluster: SampleQuestionCluster; content: string }[] = [];
  let need = Math.max(0, input.target - keep.length);
  while (need > 0) {
    const next = pools.filter((p) => p.candidates.length > 0).sort((a, b) => a.count - b.count)[0];
    if (!next) break; // 답변이 모자라면 있는 만큼만
    add.push({ cluster: next.cluster, content: next.candidates.shift()! });
    next.count++;
    need--;
  }

  return { status: "ok", questions: shown.map(({ cluster, question }) => ({ cluster, question })), keep, stale, add };
}
