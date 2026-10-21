# Claude Code Latest Handoff

Updated: 2026-10-21 · 일반 문화공간 일괄 등록 스크립트 + 입력 템플릿 · 스키마 · 디자인 · 추천 알고리즘 · 운영 데이터 변경 없음 (실제 등록 안 함)

## 목적
홈페이지에 실제 공개 공간이 6곳뿐이라 같은 공간이 반복 노출됨. 10/30 한이음 제출·11/4 졸업전시 전에 **최소 정보만으로 일반 문화공간을 한꺼번에 등록**할 준비. QR·Episode·방명록 시연은 기존 Partner 6곳 중 하나로.

## 만든 것
- `src/lib/editorial/bulkSpaceImport.ts` — 순수 함수(입력 → 등록 계획). 필드 검증은 관리자 저장과 같은 `parseSpaceInput` 재사용.
- `scripts/bulk-import-spaces.ts` — 파일·DB·업로드 담당. **기본 Dry-run**(DB 읽기만).
- `docs/space-import/spaces.template.json` — 입력 템플릿.
- 테스트: `bulkSpaceImport.test.ts` 10개, `diversity.test.ts` 1개 추가(공간 6→24곳이면 HOME 최대 반복 노출이 줄어듦).

```bash
npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json>                    # 미리보기(기본)
npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json> --apply            # DRAFT(비공개 초안)로 등록
npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json> --apply --publish  # 공개(PUBLISHED)로 등록
# --allow-new : 정본에 없는 유형·태그를 오류 대신 경고로
```

## 동작 원칙
- **새 EditorialSpace 행 생성만.** 기존 행 수정·삭제 없음. Episode/Scene/Cube/운영자/방명록/운영 Space/Partner 관계 안 만듦, `cubeAvailable=false` 고정, `story=[]`. 입력에 `episodes`·`cube` 등 허용 목록 밖 필드가 있으면 오류.
- 필수: 공간명·slug·지역·유형·대표 이미지·한 줄 소개·**태그 3~5개**. 선택: description·address·mapUrl·openingHours·instagram·website·images.
- **정본 재사용**: 지역 = 관리자 `District` 이름 + 기존 공간 area(정규화 비교, 정본 표기로 통일). 유형 = "공간 유형" 카테고리 태그 + 기존 category. 태그 = 활성 `Tag` + 기존 태그(공백·대소문자 차이는 정본 표기로 통일). 정본에 없으면 오류(`--allow-new`면 유형·태그만 경고, 지역은 항상 오류).
- **중복**: 파일 내부 slug·이름, DB(초안·보관·가상 포함) slug·이름. 같은 slug+같은 이름이면 **건너뜀**(= 재실행 안전), 다른 공간과 겹치면 오류. 오류가 하나라도 있으면 아무것도 쓰지 않음.
- **이미지**: `coverImage`/`images`에 https URL(예: 관리자에서 올린 Cloudinary URL) 또는 **입력 JSON 폴더 기준 로컬 경로**. 로컬 경로는 `--apply` 때 관리자와 같은 Cloudinary unsigned preset으로 업로드(10MB 초과·파일 없음은 미리보기에서 오류). 이미지 압축은 안 함 — 큰 원본은 미리 줄일 것.
- **가상 정보 구분**: `"fictional": true` → `isDemo=true` → HOME·검색·지역·테마·추천·상세 어디에도 안 나옴(`queries.ts`/`finderData.ts` 필터). `--publish`여도 fictional은 DRAFT로 등록.
- 출력: 대상 DB host, 항목별 등록/건너뜀/오류 + 사유, 요약(총·등록·가상·건너뜀·오류).

## 공개 조건과 노출 (코드로 확인)
공개 = `status=PUBLISHED` **그리고** `isDemo=false`. 이것만 맞으면 Partner(cubeAvailable) 여부와 무관하게 아래에 노출 후보가 된다. 일반 공간은 카드에서 Partner 표시(`partner: cubeAvailable`)가 안 붙어 기존 Partner와 구분된다.
| 영역 | 조건 |
|---|---|
| 새롭게 소개한 공간 | `publishedAt` 최신순(공개 시각이 곧 소개 시각) |
| 지역별 선반 | 정규화 지역 기준 **그 지역 공개 공간 3곳 이상**, 최대 3개 지역 |
| 유형 선반 | 같은 유형 2곳 이상, 최대 2개 |
| 테마 선반 | 유형·태그·이름이 테마 키워드와 맞는 공간 **3곳 이상**(`themeRules.ts`; 소개 문장은 안 봄) |
| 검색·FIND/추천 | `getFinderPool`: PUBLISHED & !isDemo 전체가 풀 |
| 다양성 | `diversifyShelves`가 노출 횟수 적은 공간을 앞세움 — 후보가 늘면 반복이 줄어듦(테스트) |
- **주의**: 기존 실제 6곳은 `tags`가 비어 있어 테마 선반에는 신규 공간(태그 3~5개)만 모인다. 신규를 같은 지역(연남·망원)에 3곳 이상 넣어야 지역 선반이 생김. 지금 지역 정본(District)은 연남동·망원동·용인 처인구 세 곳뿐 — 다른 지역 공간을 넣으려면 관리자에서 지역을 먼저 추가해야 함.
- 현재 DB에는 가상 공간(`proto-*`, isDemo) 여러 곳이 있어 slug 충돌 검사 대상이다(공개에는 안 나옴).
- 실제 확인한 것: 템플릿으로 운영 DB 대상 Dry-run(읽기만) 정상, 정본 불일치/이미지 없음 오류 출력 확인. 브라우저 HOME 노출은 실제 등록이 없어 **확인 못 함**(코드·단위 테스트 기준).

## 운영 DB vs 시연용 DB
- 같은 스크립트·같은 모델. 달라지는 건 `.env`의 `DATABASE_URL`뿐 — 실행 첫 줄에 대상 host를 출력하니 확인 후 `--apply`.
- 운영 DB: 실제 방문자에게 보임. 실제 존재하는 공간만, 사진으로 확인된 사실만, `--publish`는 사람이 검수한 뒤. 가상 항목은 `fictional`로 비공개.
- 시연용 DB: 전시 화면용으로 일반 공간을 모두 `--publish`해도 되지만, 가상 정보가 섞이면 `fictional`(보이지 않음)과 "시연에서 보이게" 사이에서 결정 필요(아래).

## 결정이 필요한 것
- 시연에서 가상 공간을 **보이게** 할지: 현재 기존 정책(isDemo=절대 비공개)을 유지했다. 보이게 하려면 별도 결정·구현 필요.
- 신규 공간의 지역이 연남·망원 외일 때 District 추가 여부.
- `tags` 비어 있는 기존 6곳에 태그를 채울지(테마 선반 참여, 이번 범위 밖).

## ChatGPT에 전달할 JSON 형식
```json
{
  "spaces": [
    {
      "slug": "mangwon-example-bookshop",
      "name": "공간 이름",
      "area": "망원동",
      "category": "독립서점",
      "coverImage": "images/mangwon-example-bookshop.jpg",
      "summary": "사진으로 확인되는 것만 쓴 한 줄 소개",
      "tags": ["책", "조용한", "혼자"],
      "description": "선택. 사진으로 확인된 사실만. 문단은 빈 줄로 구분.",
      "address": "선택. 확인된 경우만",
      "mapUrl": "https://map.naver.com/...",
      "images": ["images/mangwon-example-bookshop-2.jpg"],
      "fictional": false
    }
  ]
}
```
규칙: `slug`는 영문 소문자·숫자·하이픈 / `area`·`category`·`tags`는 정본 표기 사용(모르면 비워 두지 말고 목록 요청) / 확인 안 된 정보(주소·운영시간·SNS)는 **필드를 빼기** / 가상 정보가 있으면 `"fictional": true`.

## 검증
- tsc 통과 · 변경 파일 eslint 통과 · vitest `src/lib/{home,editorial}` 136개 통과.
