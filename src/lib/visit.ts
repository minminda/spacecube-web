/** 같은 공간에 대한 재방문으로 인정하는 최소 간격 (시간 단위). 값만 바꾸면 정책 전체가 바뀐다. */
export const REVISIT_INTERVAL_HOURS = 12;

/**
 * 현장 시연/테스트 전용 플래그 — true면 "재방문 → Record 생성 → Episode 해제" 판정
 * (isNewVisitForRecord)에서만 REVISIT_INTERVAL_HOURS를 무시하고 항상 새 방문으로 인정한다.
 * 값이 없으면(미설정) 기본 false이며, 이때는 아래 isNewVisit/isNewVisitForRecord가 완전히
 * 동일하게 동작한다 — 즉 이 플래그를 끄기만 하면(또는 환경변수를 지우면) 실제 운영 정책으로
 * 즉시 복귀한다. 공간 열람 접근 만료(SpaceUnlock, src/lib/spaceUnlock.ts의 isSpaceUnlockActive)는
 * 이 플래그와 무관하게 항상 실제 REVISIT_INTERVAL_HOURS(12시간)를 그대로 따른다 — 그 정책은
 * 이번 테스트 범위가 아니다.
 */
export const ENABLE_INSTANT_REVISIT_TEST = process.env.ENABLE_INSTANT_REVISIT_TEST === "true";

/**
 * 테스트 모드에서도 "사람이 QR을 다시 스캔한 재방문"과 "같은 요청의 중복 실행"(더블탭,
 * 폼 중복 제출, 네트워크 재시도 등 밀리초~1초 내 재요청)은 구분해야 한다 — 시간 제한을
 * 완전히 0으로 없애면 /api/records의 advisory lock이 막아주던 중복 Record 생성 방지가
 * 무력화된다(동시 요청을 순서대로 처리해도, 그 직후 두 번째 요청이 "직전 커밋된 Record"를
 * 또 새 방문으로 인정해버리기 때문). 실제로 QR을 다시 스캔하려면 카메라를 다시 열고
 * 다시 인식시켜야 해 최소 몇 초는 걸리므로, 이 값보다 짧은 재요청만 "중복"으로 간주해
 * 기존 방문을 갱신한다.
 */
const INSTANT_REVISIT_TEST_MIN_GAP_SECONDS = 5;

/**
 * 마지막으로 "인정된" 방문 시각(lastVisitedAt) 기준으로, 지금이 새 방문으로 인정될 시점인지 판단한다.
 * lastVisitedAt이 없으면(첫 방문) 항상 새 방문으로 인정한다.
 * 서버 시간(Date.now())을 기준으로 판정하며, 프론트엔드는 별도로 판단하지 않고 API 응답을 따른다.
 *
 * 공간 열람 접근 만료(SpaceUnlock) 판정이 그대로 재사용하는 실제 운영 정책 함수이므로
 * ENABLE_INSTANT_REVISIT_TEST의 영향을 받지 않는다 — 테스트 모드 대상은 isNewVisitForRecord뿐.
 */
export function isNewVisit(lastVisitedAt: Date | null, now: Date = new Date()): boolean {
  if (!lastVisitedAt) return true;
  const elapsedMs = now.getTime() - lastVisitedAt.getTime();
  const intervalMs = REVISIT_INTERVAL_HOURS * 60 * 60 * 1000;
  return elapsedMs >= intervalMs;
}

/**
 * Record 재방문(= 새 Record 생성 → Episode 해제 카운트) 판정 전용 진입점.
 * ENABLE_INSTANT_REVISIT_TEST가 켜져 있으면 REVISIT_INTERVAL_HOURS(12시간) 대신
 * INSTANT_REVISIT_TEST_MIN_GAP_SECONDS(5초)만 지나면 새 방문으로 인정하고, 꺼져 있으면
 * (기본) isNewVisit과 완전히 동일하게 REVISIT_INTERVAL_HOURS를 따른다.
 * /api/records(Record create/update 분기)와 resolveCurrentVisitRecord(기록 폼 프리필),
 * 공간 상세 페이지의 "첫 방문" 배너 판정이 모두 이 함수를 공유해 세 곳이 항상 같은
 * 방문 단위로 일치한다.
 */
export function isNewVisitForRecord(lastVisitedAt: Date | null, now: Date = new Date()): boolean {
  if (!ENABLE_INSTANT_REVISIT_TEST) return isNewVisit(lastVisitedAt, now);
  if (!lastVisitedAt) return true;
  const elapsedMs = now.getTime() - lastVisitedAt.getTime();
  return elapsedMs >= INSTANT_REVISIT_TEST_MIN_GAP_SECONDS * 1000;
}

export interface VisitScopedRecord {
  id: string;
  visitedAt: Date;
  tasteScore: number | null;
}

/**
 * "이번 방문"에 이미 저장된 Record가 있는지 판정한다 — /api/records가 새 Record를 만들지
 * 기존 것을 갱신할지 정하는 기준(isNewVisitForRecord)과 동일한 기준을 재사용해, 취향 점수 폼이
 * 뒤로가기/새로고침 후에도 이미 저장된 값을 그대로 보여줄 수 있게 한다.
 * lastRecord는 반드시 호출부에서 이미 userId·spaceId로 필터링된 값이어야 한다
 * (이 함수 자체는 소유권을 검증하지 않는다 — resolveCurrentVisitRecordId와 같은 패턴).
 */
export function resolveCurrentVisitRecord(
  lastRecord: VisitScopedRecord | null,
  now: Date = new Date(),
): { id: string; tasteScore: number | null } | null {
  if (!lastRecord) return null;
  if (isNewVisitForRecord(lastRecord.visitedAt, now)) return null;
  return { id: lastRecord.id, tasteScore: lastRecord.tasteScore };
}
