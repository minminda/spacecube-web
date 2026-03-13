import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.space.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "북성로 헌책방",
        slug: "bukseong-books",
        type: "독립서점",
        location: "대구 중구",
        description:
          "오래된 골목 안에 자리한 작은 헌책방입니다.\n누군가의 손때가 묻은 책들이 새로운 주인을 기다리고 있어요.",
        philosophy:
          "책은 읽히기 위해 태어났고,\n다시 읽히기 위해 여기 있습니다.",
        ownerMessage: "천천히 둘러보다 마음에 드는 책 한 권 만나고 가세요.",
      },
      {
        name: "필름사진관",
        slug: "film-studio",
        type: "소품샵",
        location: "서울 마포구",
        description:
          "디지털이 아닌 필름으로 기억을 담는 공간입니다.\n느리게 찍고, 천천히 현상하는 과정 자체가 이 공간의 가치예요.",
        philosophy:
          "빠르게 지나치지 말고,\n한 장 한 장에 마음을 담아보세요.",
        ownerMessage: "여기서만큼은 천천히 셔터를 눌러도 괜찮아요.",
      },
      {
        name: "골목 전시관",
        slug: "alley-gallery",
        type: "전시공간",
        location: "서울 성동구",
        description:
          "골목 끝에 숨어있는 작은 전시 공간입니다.\n매달 새로운 작가의 작업물을 만나볼 수 있어요.",
        philosophy: "예술은 미술관 안에만 있지 않습니다.",
        ownerMessage: "오늘의 전시가 당신에게 작은 울림이 되길 바랍니다.",
      },
    ],
  });

  console.log("✓ Seed 완료");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
