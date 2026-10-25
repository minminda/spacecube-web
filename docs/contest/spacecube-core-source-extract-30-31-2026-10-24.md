# SpaceCube 제작설계서 30~31페이지 — 핵심 소스코드 추출

## 0. 추출 기준

- 브랜치: master
- HEAD: 62240f293833e3a4dc7ff663561f61ced581ad60 (feat(home): 소개 영역 제거 · LATEST 5개 순서 고정)
- 코드 추출 일자: 2026-10-25 (파일명의 10-24는 요청 지정명)
- 작업 트리: src/ 및 prisma/ 변경 없음(git status 기준, 수정 파일은 .claude/settings.local.json뿐). 아래 코드는 모두 HEAD 작업 트리의 실제 파일에서 줄 번호 범위로 기계적 추출했다.
- 스택(package.json): next 16.1.6, react 19.2.3, next-auth ^5.0.0-beta.30, @prisma/client ^5.22.0 (PostgreSQL advisory lock 사용)
- 스키마 확인(prisma/schema.prisma): SpaceScan:430, Cube:462, SpaceUnlock:484, Record:621, Episode:811, ArchiveEntry:1400, SavedEditorialSpace:1557
- 확인한 주요 파일: src/lib/discoveryRecommend.ts, discoverySignals.ts, recommend.ts, taste.ts, finder/spaceFinder.ts, finder/finderData.ts, home/homeData.ts, app/find/page.tsx, app/page.tsx, app/EditorialHome.tsx, app/api/cube-entry/[code]/route.ts, app/c/[code]/page.tsx, CubeUnlockBridge.tsx, lib/cube.ts, episodeEntry.ts, episodeState.ts, spaceUnlock.ts, visit.ts, recordVisit.ts, anonVisitor.ts, app/space/[slug]/page.tsx, app/space/[slug]/episodes/[episodeId]/page.tsx
- 코드는 새로 작성·수정하지 않았다. 설명 문장만 별도이며 "기능/해결한 문제/근거" 항목이 설명용 요약이다.
- 본문 코드의 한글 주석은 원본 그대로다.

## 1. 30페이지 — 추천 알고리즘 핵심 소스코드 (방문 기록 기반 취향 분석 및 공간 추천)

추천 블록 구성: 30-A 가중치 상수 → 30-B 프로필 구성 → 30-D 점수·정렬 (PPT 기본 3블록, 약 54줄). 보조: 30-C 최신 방문 1건 정리, 30-E Fallback.
레거시 코사인 유사도(rankSpacesByVector 등)는 사용하지 않았다.

### 코드 A — 사용자 취향 프로필 구성

#### [30-A] 취향 가중치 상수 (저장·다녀왔어요·직접 고른 태그)
- 표시 제목: 취향 가중치 상수 (저장·다녀왔어요·직접 고른 태그)
- 파일: src/lib/discoveryRecommend.ts
- 함수: 상수 SAVE_WEIGHT / ARCHIVE_SAVED_WEIGHT / ARCHIVE_VISITED_WEIGHT / EXPLICIT_TAG_BONUS
- 원본 줄 번호: 11, 21-23

(발췌 1/2: 11행)
```ts
export const SAVE_WEIGHT = 1.5;
```
[중간 코드 생략 — 위·아래는 이어진 코드가 아님]

(발췌 2/2: 21-23행)
```ts
export const ARCHIVE_SAVED_WEIGHT = 1.5;
export const ARCHIVE_VISITED_WEIGHT = 4;
export const EXPLICIT_TAG_BONUS = 1;
```

- 기능: 행동 신호별 가중치를 상수로 고정한다. 저장은 1.5, 개인 아카이브 저장도 1.5, 직접 기록한 '다녀왔어요'는 4, 사용자가 직접 고른 태그는 +1을 더한다. (11행과 21~23행은 떨어져 있는 별개 발췌이며 이어진 코드가 아니다.)
- 해결한 문제: '관심 표시(저장)'보다 '실제 경험(방문)'을 더 강한 취향 신호로 구분해 반영한다.
- 실행 경로 근거: buildTasteProfile(discoveryRecommend.ts:49)이 SAVE_WEIGHT를 사용하고, getUserDiscoveryContext(discoverySignals.ts:71-72)가 ARCHIVE_* / EXPLICIT_TAG_BONUS를 사용 → getFinderViewer(finderData.ts:65,69) → HOME(homeData.ts:153)·FIND(find/page.tsx:91). 확인됨.

#### [30-B] 취향 프로필 구성 — buildTasteProfile
- 표시 제목: 취향 프로필 구성 — buildTasteProfile
- 파일: src/lib/discoveryRecommend.ts
- 함수: buildTasteProfile
- 원본 줄 번호: 49-75

```ts
export function buildTasteProfile(signals: TasteSignals): TasteProfile {
  const weights = new Map<string, number>();
  const labels = new Map<string, string>();
  const add = (name: string, w: number) => {
    const key = attrKey(name);
    if (!key || !(w > 0)) return;
    weights.set(key, (weights.get(key) ?? 0) + w);
    if (!labels.has(key)) labels.set(key, name.trim());
  };
  for (const v of signals.visits) add(v.name, v.weight);
  for (const names of signals.saves) {
    for (const key of new Set(names.map(attrKey))) {
      const name = names.find((n) => attrKey(n) === key) ?? key;
      add(name, SAVE_WEIGHT);
    }
  }
  let extraVisits = 0;
  let extraSaves = 0;
  for (const item of signals.weighted ?? []) {
    const unique = [...new Set(item.names.map(attrKey))].filter(Boolean);
    if (unique.length === 0) continue;
    for (const key of unique) add(item.names.find((n) => attrKey(n) === key) ?? key, item.weight);
    if (item.kind === "visit") extraVisits++;
    else if (item.kind === "save") extraSaves++;
  }
  return { weights, labels, visitCount: signals.visitCount + extraVisits, saveCount: signals.saves.length + extraSaves };
}
```

- 기능: 방문 신호(visits), 저장 신호(saves), 기타 가중 신호(weighted: 아카이브 방문·저장·직접 태그)를 하나의 attrKey→가중치 Map으로 누적한다. 한 공간 안에서 같은 속성이 중복되면 한 번만 센다(Set). 가중치가 0 이하이거나 이름이 빈 값이면 무시한다.
- 해결한 문제: 서로 다른 출처(방문 Record·저장·아카이브)의 신호를 공간 속성 이름 기준 하나의 프로필로 합친다.
- 실행 경로 근거: finderData.ts:69 `buildTasteProfile(ctx.signals)` ← getFinderViewer ← homeData.ts:153(HOME), find/page.tsx:91(FIND). 확인됨.

#### [30-C] 공간당 최신 방문 1건만 반영 — buildWeightedTasteVector
- 표시 제목: 공간당 최신 방문 1건만 반영 — buildWeightedTasteVector
- 파일: src/lib/recommend.ts
- 함수: buildWeightedTasteVector
- 원본 줄 번호: 91-100

```ts
export function buildWeightedTasteVector(records: WeightedVectorRecord[]): TasteVector {
  const vector: TasteVector = {};
  for (const r of getLatestRecordPerSpace(records)) {
    const score = r.tasteScore ?? 3; // 점수 없는 레거시 기록은 중립 가중치
    for (const link of getValidSpaceTagLinks(r.space) as (SpaceTagLinkLike & { weight: number })[]) {
      vector[link.tag.id] = (vector[link.tag.id] ?? 0) + score * link.weight;
    }
  }
  return vector;
}
```

- 기능: 방문 Record 목록에서 getLatestRecordPerSpace로 공간별 최신 기록만 남기고, 취향 점수(tasteScore, 없으면 3) × 태그 가중치(link.weight)를 태그별로 누적한다. 같은 공간을 여러 번 방문해도 점수는 누적되지 않는다.
- 해결한 문제: 재방문으로 같은 공간의 점수가 부풀려지는 것을 막고 '가장 최근 감정'으로 취향을 갱신한다.
- 실행 경로 근거: discoverySignals.ts:51 `buildWeightedTasteVector(records)` ← getUserDiscoveryContext ← finderData.ts:65. 확인됨. (getLatestRecordPerSpace 정의: src/lib/taste.ts:26-35)

### 코드 B — 후보 공간 추천 점수 계산·정렬·Fallback

#### [30-D] 후보 점수 계산·정렬 — rankCandidates
- 표시 제목: 후보 점수 계산·정렬 — rankCandidates
- 파일: src/lib/finder/spaceFinder.ts
- 함수: rankCandidates
- 원본 줄 번호: 150-172

```ts
export function rankCandidates<C extends FinderCandidate>(cands: C[], profile: TasteProfile | null, curatorBoost: Map<string, number> = new Map()): RankedCandidate<C>[] {
  const ranked = cands.map((space) => {
    const seen = new Set<string>();
    const hits: { label: string; w: number }[] = [];
    for (const a of candidateAttrs(space)) {
      const k = attrKey(a);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const w = profile?.weights.get(k) ?? 0;
      if (w > 0) hits.push({ label: profile?.labels.get(k) ?? a, w });
    }
    hits.sort((x, y) => y.w - x.w);
    const affineCollections = space.collections.filter((k) => (curatorBoost.get(k.curatorSlug) ?? 0) > 0);
    const boost = [...new Set(affineCollections.map((k) => k.curatorSlug))].reduce((s, slug) => s + (curatorBoost.get(slug) ?? 0), 0);
    return {
      space,
      personal: hits.reduce((s, h) => s + h.w, 0) + boost,
      base: space.curations.length + space.collections.length * 0.5,
      matched: hits.map((h) => h.label),
      affineCollections,
    };
  });
  return ranked.sort((a, b) => b.personal - a.personal || b.base - a.base || a.space.order - b.space.order);
```

- 기능: 후보 공간의 속성(유형·태그·컬렉션 키워드)마다 사용자 프로필 가중치를 찾아 합산해 personal 점수를 만들고, 큐레이터 가산점(boost)을 더한다. 정렬은 personal → base(큐레이션 1 + 컬렉션 0.5씩) → 공개 순서(order) 순이다. profile이 null이거나 비면 personal이 모두 0이라 base 순서로 자연스럽게 Fallback 된다.
- 해결한 문제: 개인화 근거가 없는 사용자에게도 별도 분기 없이 동일 함수로 안정적인 기본 순서를 제공한다.
- 실행 경로 근거: homeData.ts:183, 216(HOME) / find/page.tsx:100(FIND)에서 `rankCandidates(..., me.personalized ? me.profile : null, me.curatorBoost)` 호출. ENABLE_EDITORIAL_HOME=true(features.ts:86), app/page.tsx:26. 확인됨.

#### [30-E] 개인화 부족 시 Fallback (HOME)
- 표시 제목: 개인화 부족 시 Fallback (HOME)
- 파일: src/lib/home/homeData.ts
- 함수: getHomeData 내부
- 원본 줄 번호: 193-197

```ts
  const usePersonal = me.personalized && rankedCards.length >= MIN_PERSONAL;
  const fallbackPool = rankedCards.map((c) => c.space).filter((sp) => !!sp.slug);
  const forYouCards: HomeCard[] = usePersonal
    ? rankedCards
    : pickDiscoverySet(fallbackPool, PER_SHELF, { seed: kstDateKey(), area }).map((space) => ({ space, reason: reasonOf(space) }));
```

- 기능: 개인화 순위가 MIN_PERSONAL 곳 이상일 때만 개인화 결과를 쓰고, 아니면 날짜 시드(kstDateKey)로 결정적 셔플한 '지금 둘러보기 좋은 공간'을 보여준다.
- 해결한 문제: 신규·신호 부족 사용자에게 '취향 분석' 결과인 척하지 않고 정직한 대체 선반을 제공한다.
- 실행 경로 근거: homeData.ts getHomeData 내부, EditorialHome.tsx:53에서 호출. 확인됨. (MIN_PERSONAL = 6, homeData.ts:51)

### 구현 설명 (설명용 요약 — 실제 코드 아님)

1) getUserDiscoveryContext가 방문 Record·운영 공간 저장·공개 공간 저장·아카이브를 조회하고, 같은 공간이 여러 곳에 겹치면 한 번만 센다(discoverySignals.ts:61-65, 아카이브 우선).
2) buildTasteProfile이 방문(점수×태그 가중치)·저장(1.5)·아카이브 방문(4)·아카이브 저장(1.5)·직접 태그(+1)를 속성 이름별 가중치 Map으로 누적한다.
3) rankCandidates가 후보 속성과 프로필의 가중치를 합산해 정렬하고, 신호가 없으면 base(큐레이션 1 + 컬렉션 0.5×개수) 순서로 대체한다.
4) HOME은 개인화 결과가 MIN_PERSONAL(=6) 미만이면 날짜 시드 셔플 선반으로 대체한다.

### 발표 자료용 핵심 기술 문장

- 저장(1.5)보다 직접 다녀온 기록(4)에 더 큰 가중치를 두고, 공간당 최신 방문 1건만 반영해 취향을 설명 가능한 태그 가중치로 만든다.
- 후보 공간의 유형·태그와 사용자 프로필 가중치를 합산해 정렬하며, 신호가 없으면 큐레이션 기반 기본 순서로 자동 대체된다.
- AI·임의 점수 없이 실제로 겹친 속성만으로 이유를 설명한다(discoveryRecommend.ts 파일 머리 주석).

## 2. 31페이지 — QR 기반 현장 경험 핵심 소스코드 (QR Cube 기반 공간 진입 및 Episode 접근 제어)

기본 블록: 31-A, 31-B, 31-C, 31-D, 31-E, 31-F (합계 62줄). 목표 25~45줄을 넘는다 — QR 진입과 Episode 접근, 두 기능을 모두 보이려 했기 때문이며, 줄이려면 31-B(6줄)와 31-C 일부를 PPT에서 생략하면 약 35줄이 된다. 31-G는 선택.

### 코드 A — QR 진입 및 Cube 검증

#### [31-A] QR 코드로 Cube 조회·상태 검증
- 표시 제목: QR 코드로 Cube 조회·상태 검증
- 파일: src/app/api/cube-entry/[code]/route.ts
- 함수: GET
- 원본 줄 번호: 29-37

```ts
  const [cube, session] = await Promise.all([getCubeByCode(normalizedCode), auth()]);
  const destination = resolveCubeDestination(cube);
  const debug = process.env.NODE_ENV !== "production";
  if (debug) console.log(`[cube-entry] code=${normalizedCode} destination=${destination.type}`);

  if (destination.type !== "redirect" || !cube || !cube.spaceId) {
    // 이 사이 상태가 바뀌었거나(비활성화 등) 애초에 잘못된 코드라면 안내 화면으로 되돌린다.
    return NextResponse.redirect(new URL(`/c/${normalizedCode}`, origin));
  }
```

- 기능: QR 코드를 정규화해 Cube를 조회하고(로그인 세션 조회와 병렬), resolveCubeDestination으로 상태를 판정한다. ASSIGNED가 아니거나 공간이 없으면 /c/[code] 안내 화면으로 되돌린다. 클라이언트가 보낸 spaceId/cubeId는 사용하지 않고 항상 코드로 재조회한다.
- 해결한 문제: 위조·만료·비활성 QR이 공간 열람 권한으로 이어지지 않도록 서버에서 코드 기준으로 다시 검증한다.
- 실행 경로 근거: c/[code]/page.tsx:29가 CubeUnlockBridge 렌더 → CubeUnlockBridge.tsx:32, 48에서 `/api/cube-entry/${code}` 호출. 확인됨.

#### [31-B] Cube 상태 → 목적지 판정 — resolveCubeDestination
- 표시 제목: Cube 상태 → 목적지 판정 — resolveCubeDestination
- 파일: src/lib/cube.ts
- 함수: resolveCubeDestination
- 원본 줄 번호: 37-42

```ts
export function resolveCubeDestination(cube: CubeWithSpace | null): CubeDestination {
  if (!cube) return { type: "not_found" };
  if (cube.status === "DISABLED") return { type: "disabled" };
  if (cube.status === "ASSIGNED" && cube.space) return { type: "redirect", slug: cube.space.slug };
  return { type: "unassigned" };
}
```

- 기능: Cube가 없으면 not_found, DISABLED면 disabled, ASSIGNED이고 공간이 연결되어 있으면 redirect, 그 외는 unassigned로 판정한다.
- 해결한 문제: 데이터 정합성이 깨진 경우(ASSIGNED인데 공간 없음)도 서버 오류 없이 '미연결'로 안전하게 처리한다.
- 실행 경로 근거: cube-entry/[code]/route.ts:30, c/[code]/page.tsx:18에서 호출. 확인됨.

#### [31-C] 스캔 기록 + 대표 Episode 목적지 결정
- 표시 제목: 스캔 기록 + 대표 Episode 목적지 결정
- 파일: src/app/api/cube-entry/[code]/route.ts
- 함수: GET
- 원본 줄 번호: 55-75

```ts
  const [, entry] = await Promise.all([
    prisma.spaceScan
      .create({
        data: {
          spaceId: cube.spaceId,
          cubeId: cube.id,
          userId,
          anonId,
          userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
          referrer: req.headers.get("referer")?.slice(0, 300) ?? null,
          locale: req.headers.get("accept-language")?.slice(0, 60) ?? null,
        },
      })
      .catch(() => {
        /* 로그 기록 실패가 방문 자체를 막으면 안 된다 */
      }),
    // 사용자가 이미 QR을 찍은 상태이므로, 공간 페이지에서 다시 Episode를 고르게 하지 않고
    // 대표 이야기(없으면 표시 순서가 가장 빠른 공개 이야기)로 바로 들여보낸다. 공개된 이야기가
    // 하나도 없으면 공간 페이지로 폴백(그 페이지가 "준비 중" 상태를 이미 처리한다).
    resolveEntryDestination(cube.spaceId),
  ]);
```

- 기능: SpaceScan에 공간·Cube·userId·anonId(비로그인 익명 식별자)·UA·referrer를 기록하는 쓰기와, 진입할 Episode를 정하는 읽기를 Promise.all로 병렬 실행한다. 스캔 기록 실패는 catch로 삼켜 방문을 막지 않는다. (66행 이후 `.catch` 본문 주석은 원본 그대로.)
- 해결한 문제: QR 진입 KPI의 원본 로그를 응답 전에 확실히 남기면서도 왕복 지연을 줄인다.
- 실행 경로 근거: 같은 GET 핸들러(cube-entry/[code]/route.ts). userId/anonId 결정은 39-50행(이 블록 밖). 확인됨.

### 코드 B — Episode 접근 및 방문 조건 판정

#### [31-D] 접근 가능한 Episode 선택 — resolveEntryDestination
- 표시 제목: 접근 가능한 Episode 선택 — resolveEntryDestination
- 파일: src/lib/episodeEntry.ts
- 함수: resolveEntryDestination
- 원본 줄 번호: 16-31

```ts
export async function resolveEntryDestination(spaceId: string): Promise<EntryDestination> {
  const featured = await prisma.episode.findFirst({
    where: { spaceId, published: true, isFeatured: true, unlockVisitCount: 0 },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (featured) return { type: "episode", episodeId: featured.id };

  const first = await prisma.episode.findFirst({
    where: { spaceId, published: true, unlockVisitCount: 0 },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  if (first) return { type: "episode", episodeId: first.id };

  return { type: "space" };
```

- 기능: 공개(published)이며 unlockVisitCount가 0인 Episode 중 대표(isFeatured)를 먼저, 없으면 displayOrder가 가장 빠른 것을 고른다. 없으면 공간 페이지로 폴백한다.
- 해결한 문제: 첫 방문자(visitCount=0)가 QR 직후 잠긴 Episode 화면을 보지 않도록 서버에서 후보를 제한한다.
- 실행 경로 근거: cube-entry/[code]/route.ts:74에서 호출. 확인됨.

#### [31-E] 공간 접근 판정 — resolveSpaceAccess
- 표시 제목: 공간 접근 판정 — resolveSpaceAccess
- 파일: src/lib/spaceUnlock.ts
- 함수: resolveSpaceAccess
- 원본 줄 번호: 205-209

```ts
export async function resolveSpaceAccess(params: { userId: string | null; spaceId: string; isBypass: boolean }): Promise<boolean> {
  if (params.isBypass) return true;
  if (params.userId) return requireSpaceUnlock(params.userId, params.spaceId);
  return hasAnonymousSpaceAccess(params.spaceId);
}
```

- 기능: 관리자/소유자 bypass면 허용, 로그인 사용자는 SpaceUnlock(12시간) 기준, 비로그인 방문자는 서명된 QR 쿠키(sc_qr_access) 기준으로 판정한다. 비로그인도 QR만 스캔했다면 읽을 수 있다.
- 해결한 문제: 로그인 여부와 무관한 QR 기반 열람 정책을 단일 진입점으로 통일한다.
- 실행 경로 근거: space/[slug]/page.tsx:139,143 / episodes/[episodeId]/page.tsx:122,126 / editorial/partnerEpisodes.ts:45에서 호출. 확인됨.

#### [31-F] Episode 잠금 상태 판정 — computeEpisodeState
- 표시 제목: Episode 잠금 상태 판정 — computeEpisodeState
- 파일: src/lib/episodeState.ts
- 함수: computeEpisodeState
- 원본 줄 번호: 42-46

```ts

```

- 기능: unlockVisitCount와 누적 방문 횟수(visitCount = Record 수)를 비교해 LOCKED / NEWLY_UNLOCKED / UNLOCKED를 반환한다.
- 해결한 문제: 방문 횟수 기반 단계적 해제를 한 줄 비교로 영구 판정한다(공간 접근 12시간 만료와 분리).
- 실행 경로 근거: space/[slug]/page.tsx:162, editorial/partnerEpisodes.ts:57에서 호출. 확인됨. 주의: Episode 상세 페이지(episodes/[episodeId]/page.tsx:140)는 이 함수 대신 `episode.unlockVisitCount <= visitCount`를 인라인으로 쓴다(동일 의미).

#### [31-G] (선택) 재방문 12시간 판정 및 Record 중복 방지
- 표시 제목: (선택) 재방문 12시간 판정 및 Record 중복 방지
- 파일: src/lib/recordVisit.ts
- 함수: upsertCurrentRecord
- 원본 줄 번호: 46-63

```ts
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${spaceId}))`;

      const lastRecord = await tx.record.findFirst({
        where: { userId, spaceId },
        orderBy: { visitedAt: "desc" },
      });

      if (lastRecord && !isNewVisitForRecord(lastRecord.visitedAt)) {
        const updated = await tx.record.update({
          where: { id: lastRecord.id },
          data: {
            ...(hasMemo ? { memo: memo || null } : {}),
            ...(hasTasteScore ? { tasteScore: tasteScore ?? null } : {}),
            ...(tags && tags.length > 0 ? { tags: { deleteMany: {}, create: tags.map((tag) => ({ tag })) } } : {}),
          },
        });
        return { record: updated, isNew: false };
      }
```

- 기능: userId+spaceId 단위 advisory lock으로 동시 요청을 직렬화한 뒤, 마지막 Record가 재방문 간격(isNewVisitForRecord, REVISIT_INTERVAL_HOURS=12 · visit.ts:2) 이내면 갱신하고 아니면 새 Record를 만든다(65행 이후 생성 코드는 미포함).
- 해결한 문제: 더블탭·동시 요청으로 중복 Record가 생겨 방문 횟수(Episode 해제 기준)가 부풀려지는 것을 막는다.
- 실행 경로 근거: api/records/route.ts:60, space/[slug]/guestbook/page.tsx:151에서 호출. 확인됨.

### 구현 설명 (설명용 요약 — 실제 코드 아님)

1) QR → /c/[code] → CubeUnlockBridge → /api/cube-entry/[code]. 서버가 코드로 Cube를 재조회해 ASSIGNED+공간 연결을 확인한다.
2) SpaceScan에 userId 또는 anonId(sc_anon_id 쿠키)를 기록하고, 로그인 여부와 무관하게 서명된 sc_qr_access 쿠키(HMAC-SHA256, 12시간; spaceUnlock.ts:53-61)를 발급한다. 로그인 사용자는 grantSpaceUnlock으로 SpaceUnlock 행도 만든다(route.ts:104-107, 이 문서의 코드 블록에는 미포함).
3) 대표 Episode(isFeatured, unlockVisitCount=0)로 바로 이동한다.
4) Episode 열람은 ① 공간 접근(resolveSpaceAccess, 12시간) ② 방문 횟수 조건(unlockVisitCount ≤ visitCount) 두 단계다. 비로그인은 Record를 남길 수 없어 visitCount=0이므로 첫 이야기까지만 열린다(spaceUnlock.ts 머리 주석).

### 발표 자료용 핵심 기술 문장

- 로그인 없이도 QR 스캔만으로 이야기를 읽을 수 있고, 서명된 12시간 쿠키가 접근 증거가 된다.
- 클라이언트가 보낸 ID를 믿지 않고 서버가 QR 코드로 Cube·공간 연결을 매번 재검증한다.
- 공간 접근(12시간 만료)과 Episode 해제(누적 방문 횟수, 영구)를 분리해 관리한다.

## 3. Claude Design 편집 지침

30페이지 배치 순서: ① 30-A(상수, 3~4줄 작은 박스) → ② 30-B(프로필 구성) → ③ 30-D(점수·정렬). 30-C/30-E는 여백이 있을 때만 보조로.
31페이지 배치 순서: ① 31-A(Cube 검증) → ② 31-C(스캔 기록, 길면 상단 일부만) → ③ 31-D(Episode 선택) → ④ 31-E+31-F(접근·잠금 판정). 31-B, 31-G는 생략 가능.
화면 요약 문장(예): 30p — "방문·저장·아카이브 신호를 가중치로 합산해 취향 프로필을 만들고, 후보 공간을 점수순으로 정렬합니다." 31p — "QR 코드를 서버에서 재검증하고, 스캔 기록·12시간 접근 쿠키를 발급한 뒤 방문 횟수로 Episode 해제를 판정합니다."
구문 강조 추천: SAVE_WEIGHT / ARCHIVE_VISITED_WEIGHT 값, weights.set(...) 누적 줄, hits.reduce(...) + boost 줄, sort 비교식, destination.type !== "redirect", Promise.all, unlockVisitCount > visitCount 비교.
여러 발췌가 있는 블록(30-A)은 반드시 사이에 생략 표시(···)를 시각적으로 넣어 이어진 코드로 보이지 않게 한다. 코드는 이미지에서 개행·들여쓰기·한글 주석을 바꾸지 말 것. 긴 주석 줄은 폰트 축소 또는 줄바꿈만 허용(내용 변경 금지).

수정 금지 조건식·가중치:
- SAVE_WEIGHT = 1.5, ARCHIVE_SAVED_WEIGHT = 1.5, ARCHIVE_VISITED_WEIGHT = 4, EXPLICIT_TAG_BONUS = 1
- `!(w > 0)` 가드, `score ?? 3`(점수 없는 기록 중립값 3)
- `b.personal - a.personal || b.base - a.base || a.space.order - b.space.order`
- `base: space.curations.length + space.collections.length * 0.5`
- `destination.type !== "redirect" || !cube || !cube.spaceId`
- `unlockVisitCount > visitCount` → LOCKED, `===` → NEWLY_UNLOCKED
- REVISIT_INTERVAL_HOURS = 12 (visit.ts:2)

## 4. 검증 결과

- 파일 존재: 위 블록의 모든 파일이 HEAD 62240f2 작업 트리에 존재함(스크립트가 읽기 성공).
- 원본 일치: 코드 본문은 파일에서 줄 범위로 기계 추출했고(CR 제거만), 생성 후 같은 범위를 다시 읽어 문서 내용과 비교해 일치를 확인했다(결과는 채팅 보고 참조).
- 실행 경로: 30-A~30-D는 HOME(EditorialHome→getHomeData)과 FIND(find/page.tsx)에서 호출됨. ENABLE_EDITORIAL_HOME = true(features.ts:86). 31-A~31-F는 QR 진입(/c/[code]) 및 공간·Episode 페이지에서 호출됨. 코드 호출 관계는 정적 검색(grep)으로 확인했고 실제 서버를 띄운 런타임 검증은 하지 않았다.
- 추가 확인 필요:
  1) discoverySignals.ts 머리 주석(4행)은 "직접 추가 2.5 · 다녀왔어요 3"이라 적혀 있으나 실제 상수는 1.5 / 4이다 — 주석이 낡았다. PPT에는 상수 값(discoveryRecommend.ts:21-23)을 쓸 것.
  2) discoveryRecommend.ts:17 주석에 "다녀왔어요 기록 하나만 센다"가 있고, 구현은 discoverySignals.ts:61-65.
  3) MIN_PERSONAL = 6 (homeData.ts:51) 확인 완료.
  4) HOME 개인화 추천은 로그인 사용자 기준이며 비로그인은 profile=null이다(finderData.ts:63).
  5) 큐레이터 미리보기(curatorCtx) 활성 시 프로필이 enrichProfileWithCollections로 보강될 수 있다(finderData.ts:69) — 일반 사용자 경로는 buildTasteProfile 그대로.
