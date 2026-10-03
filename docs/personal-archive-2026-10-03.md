# 개인 공간 아카이브 (2026-10-03)

"이 공간 좋았는데"를 사진 한 장 또는 링크 하나로 몇 초 만에 남기고, 그 기록을 취향과 추천으로 잇는다.
DISCOVER → SAVE → VISIT → ARCHIVE → TASTE → RECOMMEND.

## 구조 (추가만)

```
User ── ArchiveEntry (사용자 × 공간 하나, PRIVATE)
          ├─ spaceId? → EditorialSpace(canonical)   공간큐브에 있으면 연결(사용자당 공간당 1개, 새 공간 안 만듦)
          ├─ placeName · placeArea · placeKey        없는 공간은 개인 기록으로만(공개 목록·검색·추천에 안 섞임)
          ├─ status SAVED(가보고 싶어요) / VISITED(다녀왔어요)
          ├─ sourceKind · sourceUrl                  사진 / 네이버 / Instagram / 카카오 / Google / 웹 — 주소만 저장
          ├─ memo · tags(기존 공통 태그만) · wantAgain
          ├─ ArchiveVisit[]  (또 갔어요 — 방문마다 날짜·메모·사진)
          └─ ArchivePhoto[]  (대표 = order 0, 방문에 묶이거나 따로)
```

- 기존 데이터는 그대로: 공개 저장(SavedEditorialSpace), Cube 상세 저장(SavedSpace), Cube 방문(Record).
  `src/lib/archive/library.ts`가 화면에서만 공간 기준으로 합친다(`s-<slug>` / 개인 기록 `e-<id>`).
- "가보고 싶어요"로 공개 공간을 추가하면 공개 저장도 함께 남겨 다른 화면의 저장 표시와 맞춘다.
- 상태를 바꿔도 지우지 않는다(저장 → 방문 1건 추가 → 또 갔어요 = 방문 추가).

## 승격·병합(이후)

`placeKey` = 정규화한 이름 + 지역. 같은 키의 개인 기록이 여러 사용자에게서 쌓이면 관리자가 검수하거나 외부 장소 매칭을 거쳐
EditorialSpace를 만들고 그 기록들의 `spaceId`를 채운다. 연결되는 순간 공식 태그·큐레이터 추천·공개 상세가 자동으로 붙는다.

## 링크 처리 (스크래핑 없음)

`src/lib/archive/source.ts` — 공유 문구에서 주소만 꺼내고 종류를 알아본 뒤, 주소 자체의 식별자(네이버 플레이스 번호)와
공간큐브 공간의 지도·인스타·웹 주소를 비교해 같은 장소를 찾는다. 외부 페이지는 열지 않는다.
향후 Place Parser를 붙일 자리: `findSpaceMatches`(src/lib/archive/entries.ts) — kind·placeId를 입력으로 외부 장소 API → canonical 매칭.

## 사진

- 서버가 사용자 폴더(`archive/<userId>`) 전용 서명을 발급하고, 브라우저가 Cloudinary로 직접 올린다(로그인 필수).
- 저장 API는 이 서비스 계정·본인 폴더의 주소만 받는다(`isAllowedArchivePhoto`).
- 앱 안에서는 본인 화면에만 보인다. 단, Cloudinary 원본 주소 자체는 추측 불가능한 공개 주소다(주소가 새면 볼 수 있음).
  완전한 비공개가 필요해지면 authenticated 업로드 + 서명 URL로 바꾼다.

## 취향 신호 무게 (src/lib/discoveryRecommend.ts)

| 신호 | 무게 |
|---|---|
| 공간큐브 안에서 저장 | 2 |
| 직접 추가(가보고 싶어요) | 2.5 |
| 다녀왔어요(직접 기록) | 3 |
| Cube 방문(검증된 방문) | 취향 점수 × 태그 가중치(3~5) |
| 사용자가 고른 태그 | +1 |

연결 공간이 없는 개인 기록은 사용자가 고른 태그만 쓴다(공간 특징을 추측하지 않음). 아카이브에 넣은 공간은 추천에서 뺀다.
