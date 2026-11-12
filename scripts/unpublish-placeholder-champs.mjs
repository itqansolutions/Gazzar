import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Setting placeholder championships to isPublished: false...");
  const updateChamps = await prisma.championship.updateMany({
    data: {
      isPublished: false
    }
  });
  console.log(`Updated ${updateChamps.count} championships to isPublished: false.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
