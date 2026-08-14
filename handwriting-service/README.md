# 손글씨 → 디지털 필체 변환 PoC (EXPERIMENTAL ONLY)

**이 디렉토리는 공간큐브 실서비스와 완전히 분리된 로컬 전용 기술 검증(PoC)입니다.**
Vercel에 배포되지 않고, 실제 방명록/Record/추천/QR/로그인 로직과 어떤 코드도 공유하지 않습니다.
관리자 1명이 로컬에서 직접 실행해서 테스트하는 용도입니다.

## 핵심 검증 질문

사용자가 정해진 한글 샘플을 손으로 작성하고 사진을 찍었을 때, 그 필체를 기반으로
**다른(안 쓴) 한글 문장을 생성**해 방명록 포스트잇에 쓸 수 있는가?

## 선택한 모델: DM-Font (NAVER Clova AI Research, ECCV 2020)

- 저장소: [clovaai/dmfont](https://github.com/clovaai/dmfont) (실행 시 이 디렉토리 안에 `dmfont-src/`로 clone됨, git-ignored)
- 논문: [Few-shot Compositional Font Generation with Dual Memory](https://arxiv.org/abs/2005.10510)
- **선택 이유**: 조사한 후보(CKFont2, DM-Font, LF-Font, MX-Font) 중 **한글 손글씨(Korean-handwriting)로 학습된 pretrained checkpoint를 실제로 공개 제공**하는 유일한 후보였습니다. CKFont2는 논문만 있고 공개 코드/weight를 찾지 못했습니다. 코드·논문 모두 공개, 실행 커맨드까지 문서화되어 있어 "실제로 실행 가능"이라는 이번 PoC의 최우선 기준을 만족했습니다.
- **작동 원리**: 한글은 초성(19)+중성(21)+종성(28)의 조합으로 모든 음절이 만들어집니다. DM-Font는 각 참조 글자에서 초성/중성/종성 스타일 특징을 따로 추출해 "메모리"에 저장하고, 생성 시 목표 글자의 초성/중성/종성에 해당하는 특징을 메모리에서 읽어와 조합·디코딩합니다. 그래서 "가", "노", "달"만 보여줘도 그 셋에 없던 "놀"(노의 초성+중성 + 달의 종성)을 생성할 수 있습니다 — 단순 복사가 아니라 실제 component-level style extraction + generation입니다.

## 샘플 글자 수: 48자

19개 초성 + 21개 중성을 먼저 커버(받침 없이, 21행 순환 배치)하고, 남은 27개 종성을
"아"(ㅇ+ㅏ) 기반으로 추가해 총 48자로 **19/19 초성, 21/21 중성, 28/28 종성을 전부 커버**합니다
(`src/lib/handwriting/referenceChars.ts` 생성 로직 참고). 이 48자만 정확히 쓰면 이론상
어떤 한글 음절이든 생성 가능합니다 — 실제로 `/generate` API 테스트에서 확인했습니다(아래 참고).

DM-Font의 메모리는 "요청한 글자의 초성/중성/종성 각각이 참조 세트 어딘가에 있어야" 생성 가능한
구조라, 4×N 고정 그리드로 완전 커버하는 이 48자 세트가 최소 실용 크기입니다.

## 동작 구조

```
사진 촬영/업로드
  → perspective correction (코너 마커 4개 인식 → 4점 투영 변환)
  → 고정 그리드 좌표로 48칸 crop (OCR 불필요 — 위치 = 글자, 미리 알고 있음)
  → grayscale, Otsu threshold, ink bounding box centering, 128x128 resize
  → (관리자가 crop 결과 확인, 문제 있으면 재업로드)
  → encode: 48개 참조 glyph → DM-Font component memory에 write
  → generate: 테스트 문장 → 중복 제거된 글자만 → memory에서 read_decode (캐시)
  → 문장 렌더링: 생성된 glyph PNG를 문자별로 나열 (TTF 변환 없음, 1차 PoC 범위)
  → 포스트잇 미리보기: 실제 GuestbookCanvas 포스트잇 오버레이 스타일 재사용, DB 저장 없음
```

## 실행 환경

- **Next.js(Vercel)에서 Python/GPU 직접 실행 불가** — 조사 결과 그대로, 별도 로컬 서비스로 분리.
- **GPU 불필요** — 로컬 환경에 GPU가 없어(nvidia-smi 없음) 처음부터 CPU inference로 설계했고, 실제로 CPU에서 정상 동작을 확인했습니다.
- **Python 3.11.9** (로컬에 설치된 버전 그대로 사용). DM-Font 원本 코드는 2020년 Python 3.6 / torch 1.1.0 기준이지만, **최신 torch 2.13.0(CPU)+torchvision 0.28.0으로도 pretrained checkpoint가 아무 수정 없이 정확히 로드됩니다** (missing/unexpected keys 0개, 직접 검증). 모델 코드 자체(`models/`)는 `.cuda()` 하드코딩이 없어 별도 패치 없이 CPU에서 그대로 동작합니다. 단, `dmfont-src/inference.py`·`evaluator.py`(원본 제공 스크립트)는 `.cuda()`가 하드코딩돼 있어 이번 PoC는 그걸 쓰지 않고 `model/generator.py`에서 직접 encode_write/read_decode를 호출하는 얇은 래퍼를 새로 작성했습니다.
- **참고 속도**(CPU, 로컬 측정): 48자 참조 세트 encode ~5초, 글자당 decode ~0.2초. 문장 하나(중복 제외 10~15자) 생성에 총 5~10초 수준 — 실시간은 아니지만 관리자 PoC 테스트로는 충분합니다.

## 라이선스

| 구성 요소 | 라이선스 | 상업적 사용 |
|---|---|---|
| DM-Font 코드 (`clovaai/dmfont`) | MIT (단, `modules.py`는 [NVlabs/FUNIT](https://github.com/NVlabs/FUNIT) 라이선스 적용) | 코드 자체는 가능, FUNIT 파생 모듈은 별도 확인 필요 |
| Pretrained checkpoint (`korean-handwriting.pth`) | 저장소가 코드와 같은 MIT 하에 배포 — 단, 학습 데이터가 [UhBee 폰트](http://uhbeefont.com/)라 **폰트 자체의 이용약관은 별도** | 실제 정식 기능으로 발전시키기 전 UhBee 폰트 라이선스 재확인 필요 |

**이번 PoC는 코드/weight 원문 그대로, 수정 없이(모델 아키텍처·가중치 불변) 로컬 실행만 했습니다.**
외부 유료 API는 전혀 사용하지 않았습니다. 정식 기능화 전 UhBee 폰트 라이선스와 FUNIT 파생 모듈
라이선스를 법무 검토하는 것을 권장합니다 — 현재는 `EXPERIMENTAL ONLY` 주석으로 명확히 표시했습니다.

## 개인정보 처리

- 촬영한 원본 사진은 Next.js API 라우트가 메모리에서 그대로 Python 서비스로 스트리밍하고, 어느 쪽도 디스크에 영구 저장하지 않습니다.
- 생성된 glyph는 프로세스 메모리 내 캐시(`_glyph_cache`)에만 있고, 서비스를 재시작하면 사라집니다.
- 공개 URL을 생성하지 않고, 로그에 이미지 base64/binary를 출력하지 않습니다.
- 관리자 인증(`isAdmin`) 뒤에서만 접근 가능합니다.

## 설치 및 실행

```bash
cd handwriting-service
python -m venv venv
./venv/Scripts/pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cpu
git clone --depth 1 https://github.com/clovaai/dmfont.git dmfont-src
mkdir checkpoints
curl -L -o checkpoints/korean-handwriting.pth https://github.com/clovaai/dmfont/releases/download/v1.0.0/korean-handwriting.pth

./venv/Scripts/uvicorn app:app --port 8000 --reload
```

그 다음 Next.js 쪽에서 `.env`에 `ENABLE_HANDWRITING_POC=true`(개발 환경은 기본 켜짐)를 두고
`npm run dev`, `/admin/handwriting-test`로 접속(관리자 계정 필요).

## 검증 스크립트

- `smoke_test.py` — 시스템 폰트(맑은 고딕)로 렌더링한 3개 참조 글자("가","노","달")만으로,
  셋 중 어디에도 없던 "놀"(노의 초성+중성 + 달의 종성)을 생성해 `smoke_out/`에 저장합니다.
  실제 사람 손글씨가 아니라 파이프라인 자체(체크포인트 로드 → encode → decode)를 빠르게
  검증하기 위한 스탠드인입니다.
- `test_api.py` — 실행 중인 FastAPI 서비스에 48자 전체를 encode하고, 예시 문장
  "오늘 이 공간에서 오래 머물렀어요 Hello!"를 generate해 커버리지·fallback 처리를 검증합니다.

## 이번 PoC의 한계

- **실제 손글씨로는 아직 검증 못함** — 이 세션에서는 시스템 폰트 렌더링으로 파이프라인을
  검증했습니다(모델 로드, encode/decode, API, 커버리지 계산까지는 실제로 동작 확인). 진짜
  손으로 쓴 샘플의 결과 품질과, perspective correction·셀 분리가 실제 촬영 사진에서 잘
  동작하는지는 관리자가 직접 사진을 찍어 테스트해야 확인됩니다 — 이 환경에는 카메라나
  실제 손글씨 샘플이 없어 코드 리뷰로 preprocessing 로직을 짰지만 실사진으로 검증하지 못했습니다.
- **생성 품질은 학습 데이터(UhBee 폰트, 인쇄체에 가까운 손글씨 스타일 폰트)에 좌우됨** —
  실제 개인 필체가 학습 데이터와 스타일 차이가 크면(예: 흘림체, 독특한 필압) 품질이 낮아질 수 있습니다.
  스모크 테스트 결과("공", "늘" 등)는 인식 가능한 수준이었지만 미세한 획 왜곡이 보였습니다.
- **문장 렌더링은 글자 이미지 나열 방식** — TTF/WOFF 변환이 없어 자간·기울기 등 자연스러운
  손글씨 흐름은 아직 없습니다(스펙 10번에서 명시적으로 1차 범위 아님).
- **48자 세트 밖의 자모 조합은 생성 불가** — 이론상 모든 자모를 커버했지만, 실제 손글씨가
  흐리거나 인식이 안 되는 칸이 있으면 그 자모가 빠져 해당 글자는 fallback 처리됩니다.
- **동시 사용자 미지원** — 전역 싱글턴 메모리 상태(관리자 1명 전제, 스펙 15번과 일치).
