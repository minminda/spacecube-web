/**
 * 공간 둘러보기 SVG 지도 초기 지역 데이터 시드 — 망원만 ACTIVE, 서촌/성수/북촌은 COMING_SOON.
 * prisma db push로 District 테이블이 생긴 뒤 1회 실행한다. upsert 기반이라 여러 번 실행해도 안전.
 *
 * 실행: npx tsx prisma/migrate-districts.ts
 */
import { PrismaClient, DistrictStatus } from "@prisma/client";

const prisma = new PrismaClient();

// SVG viewBox "0 0 310 390" 기준 좌표 — 실제 서울 위치를 단순화해 배치
const INITIAL_DISTRICTS: {
  name: string;
  slug: string;
  status: DistrictStatus;
  order: number;
  tagline: string;
  markerX: number;
  markerY: number;
  zoomX: number;
  zoomY: number;
  zoomScale: number;
}[] = [
  {
    name: "망원", slug: "mangwon", status: DistrictStatus.ACTIVE, order: 0,
    tagline: "지금 열려 있는 골목",
    markerX: 55, markerY: 157, zoomX: 55, zoomY: 157, zoomScale: 1.9,
  },
  {
    name: "서촌", slug: "seochon", status: DistrictStatus.COMING_SOON, order: 1,
    tagline: "곧 열릴 예정",
    markerX: 130, markerY: 92, zoomX: 130, zoomY: 92, zoomScale: 1.9,
  },
  {
    name: "북촌", slug: "bukchon", status: DistrictStatus.COMING_SOON, order: 2,
    tagline: "곧 열릴 예정",
    markerX: 155, markerY: 73, zoomX: 155, zoomY: 73, zoomScale: 1.9,
  },
  {
    name: "성수", slug: "seongsu", status: DistrictStatus.COMING_SOON, order: 3,
    tagline: "곧 열릴 예정",
    markerX: 252, markerY: 206, zoomX: 252, zoomY: 206, zoomScale: 1.9,
  },
];

async function main() {
  for (const d of INITIAL_DISTRICTS) {
    await prisma.district.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }
  const count = await prisma.district.count();
  console.log(`✓ 지역 시드 완료 (전체 ${count}개)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
