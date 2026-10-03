# 큐레이터 프로토타입 (2026-10-03)

검증 질문: "이런 서비스가 있다면 네이버·인스타 대신 공간을 찾을 때 쓸 것인가?"
기존 STORY / CURATION / 함께한 공간 / 저장 / 추천 / 아카이브 구조는 그대로 두고, 그 위에 미리보기 전용으로 얹었다.

## 구조

```
User ──(선택)── CuratorProfile ── CuratorCollection ── CuratorCollectionSpace ── EditorialSpace(canonical)
 │                                                            (comment, order, sourceUrl)
 └─ 저장(SavedEditorialSpace) · 방문(Record) · 아카이브 · 추천 — 큐레이터도 똑같이 쓴다
```

- 큐레이터는 별도 계정 유형이 아니다. 공개 프로필을 추가로 가진 User다(`CuratorProfile.userId @unique`).
- 공간은 큐레이터마다 복제하지 않는다. 한 공간을 여러 큐레이터·컬렉션이 연결한다.
- 공식 CURATION(`EditorialCuration`)과 큐레이터 컬렉션은 출처가 달라 합치지 않았다. 공간큐브도 큐레이터 프로필을 가질 수 있다(`isOfficial`).

## 공개 범위와 가상 데이터 격리

| 대상 | 규칙 |
|---|---|
| 큐레이터 화면 전체 | `ENABLE_CURATOR_PROTOTYPE`(기본 false) **또는** 관리자·로컬 개발, 그리고 새 정보구조(`ENABLE_EDITORIAL_HOME` 또는 관리자) |
| 가상 큐레이터·컬렉션·공간(`isDemo`) | 플래그와 무관하게 관리자·로컬 개발에서만(`src/lib/curators/access.ts`) |
| 기존 공개 조회 | `src/lib/editorial/queries.ts`의 모든 공간 조회가 `isDemo: false`를 강제(관리자 미리보기 포함) — 큐레이션·함께한 공간·홈·추천·지역 목록에 섞이지 않음 |
| 저장 | 가상 공간 저장 API는 관리자·로컬만 허용, 아카이브·추천 신호도 미리보기에서만 가상 공간 포함 |
| 가상 큐레이터의 User | `isDemo` + 닉네임 없음 → KPI·사용자 목록 제외, 실제 사용자 닉네임 점유 없음 |

데이터: `npm run db:seed-curator-prototype`(멱등) / `npm run db:cleanup-curator-prototype`.

## 로직(모두 실제 관계로만 설명, % 없음)

- 빠른 찾기 `src/lib/curators/finder.ts` — 후보는 큐레이터가 담은 공간만. 조건은 공간 특징(유형·태그) 또는 그 공간을 담은 컬렉션 키워드로 맞춘다. 모두 맞은 곳 → 일부 맞은 곳, 같으면 여러 큐레이터가 고른 곳 먼저.
- 취향 겹침 `src/lib/curators/affinity.ts` — 같은 공간 수 + 같은 결 수로 "매우 비슷 / 많이 겹침 / 일부 / 새로운 취향" 4단계.
- 내 취향 `src/lib/curators/viewerTaste.ts` — 기존 발견 추천 신호(방문·저장)에 저장·방문 공간을 담은 컬렉션 키워드를 더한 별도 프로필. 기존 `/recommend` 계산은 바꾸지 않았다.

## Instagram 가져오기를 붙일 자리

1. 게시물 → 가져오기 후보 테이블(신규, 예: `CuratorImportCandidate { curatorId, postUrl, caption, status }`)
2. 공간명·지역 추출 → 네이버 장소 매칭 → 기존 `EditorialSpace`를 찾거나 새로 만든다(공간은 항상 canonical 하나)
3. 확정되면 `CuratorCollectionSpace { collectionId, spaceId, comment, sourceUrl: postUrl }`로 연결
4. 큐레이터 출처는 `CuratorProfile.sourceType`(MANUAL/INSTAGRAM), 계정은 `instagramHandle`/`instagramUrl`
