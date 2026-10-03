# 운영 DB 백업·복구 상태 (2026-10-03, archive-v1-stable 시점)

조사는 읽기 전용으로만 했다. 운영 DB를 초기화·변형하는 명령은 실행하지 않았다.

## 현재 구조

- **DB**: Neon serverless PostgreSQL 17 (`.env`의 `DATABASE_URL`, pooler 엔드포인트). 로컬 `.env`도 운영 DB를 가리킨다(별도 개발 DB 없음).
- **스키마 반영 방식**: `prisma/migrations` 없음. `prisma db push` + 1회성 tsx 백필 스크립트(`prisma/migrate-*.ts`).
  `npm run build`가 `prisma db push`로 시작하므로 **Vercel 배포마다 스키마가 운영 DB에 반영된다**.
- **스키마 상태**: `prisma migrate diff --from-schema-datasource --to-schema-datamodel` 결과 차이 0(운영 DB = `schema.prisma`).
- **프로젝트 자체 백업**: 없음. dump 스크립트·예약 백업이 없고, 이 PC에는 `pg_dump`·`psql`·`neonctl`도 설치되어 있지 않다.
- **Neon API 키**: 저장소·환경변수에 없음 → 계정의 플랜과 복구 가능 기간(history retention)을 여기서 확인할 수 없었다.

## Neon이 기본으로 주는 복구 수단(콘솔에서 확인 필요)

Neon은 모든 브랜치의 변경 이력(WAL)을 **history retention 기간** 동안 보관한다. 이 기간 안에서는:
1. **Point-in-time restore** — 브랜치를 과거 특정 시각으로 되돌린다(콘솔 Branches → Restore).
2. **과거 시점으로 새 브랜치 만들기** — 운영 브랜치는 그대로 두고, 과거 시점의 복사본 브랜치를 만들어 비교·부분 복구한다(가장 안전).

보관 기간은 **플랜에 따라 다르다**(무료 플랜은 짧고, 유료 플랜은 길다). 정확한 값은 Neon 콘솔 → Project settings에서 확인할 것.
보관 기간이 짧다면 아래의 "시점 고정"을 꼭 해 둔다.

## 권장: archive-v1-stable 시점 고정 (사람이 콘솔에서, 비파괴)

1. Neon 콘솔 → 프로젝트 → **Branches → Create branch**
2. 부모: 운영 브랜치(main), 시점: 현재(Head), 이름: `archive-v1-stable`
3. 이 브랜치는 운영 DB에 영향이 없는 copy-on-write 사본이다. 이후 실험에서 문제가 생기면 이 브랜치의 연결 문자열로 데이터를 비교하거나 테이블 단위로 되살릴 수 있다.
   (브랜치는 무료 플랜에서도 개수 제한 안에서 만들 수 있다. 오래 두면 저장 용량을 쓴다.)

## 파일로 남기고 싶을 때 (선택)

`pg_dump` 설치 후, **pooler가 아닌 direct 연결 문자열**(호스트에 `-pooler`가 없는 것, Neon 콘솔 Connection details)로:

```bash
pg_dump "postgresql://USER:PASSWORD@ep-...-direct-host/neondb?sslmode=require" --format=custom --no-owner --file=spacecube-archive-v1-stable.dump
```

- 이 파일에는 사용자 이메일·방명록 등 개인정보가 들어 있다. 저장소에 커밋하지 말고 접근이 제한된 곳에 보관한다.
- 복원은 **새 빈 DB(새 Neon 브랜치)**에만 `pg_restore --no-owner -d <새 DB URL> spacecube-archive-v1-stable.dump`. 운영 DB에 바로 덮어쓰지 않는다.

## 사진(이미지) 백업

DB에는 이미지 주소만 있고 원본은 Cloudinary에 있다(공간·에피소드 사진, 개인 아카이브 사진 `archive/<userId>/`). DB를 되돌려도 Cloudinary 파일은 그대로다. Cloudinary 쪽 삭제는 이 프로젝트 코드에 없으며(테스트 정리 스크립트만 수동 실행), 별도 백업은 Cloudinary 계정 설정(Backup)을 따른다.

## 시점 스냅샷(행 수, 읽기 전용 조회)

| 테이블 | 행 수 | | 테이블 | 행 수 |
|---|---|---|---|---|
| User (그중 isDemo) | 66 (47) | | EditorialSpace (그중 isDemo) | 29 (23) |
| Space (운영 공간) | 20 | | EditorialCuration / Person / Thought | 2 / 1 / 0 |
| Cube | 36 | | SavedEditorialSpace / SavedSpace | 1 / 11 |
| Episode / Scene | 23 / 130 | | CuratorProfile / CuratorCollection | 4 / 11 (모두 가상) |
| Record | 154 | | ArchiveEntry / ArchivePhoto | 1 / 0 |
| SpaceScan | 407 | | GuestbookNote | 91 |

## 결론

- 코드: `archive-v1-stable` 태그로 언제든 돌아갈 수 있다.
- DB: Neon의 기본 이력 보관으로 보관 기간 안에서는 시점 복구가 가능하다. 다만 **보관 기간을 콘솔에서 확인하지 않았고, 프로젝트 자체 백업은 없다**.
  큰 실험 전에 위의 "시점 고정 브랜치"를 한 번 만들어 두는 것으로 충분하다(별도 백업 시스템은 만들지 않음).
- 주의: 배포(build)가 `prisma db push`를 실행하므로, 데이터 손실이 생기는 스키마 변경은 배포 전에 `migrate diff`로 반드시 확인한다(db push는 데이터 손실 변경을 기본적으로 거부한다).
