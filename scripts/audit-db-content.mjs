import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DB AUDIT: PUBLIC CONTENT ===");

  const championships = await prisma.championship.findMany();
  console.log(`\nChampionships total: ${championships.length}`);
  championships.forEach((c) => {
    console.log(`- [${c.id}] "${c.title}" (isPublished: ${c.isPublished}, isFeatured: ${c.isFeatured}, year: ${c.year})`);
  });

  const packages = await prisma.publicPackage.findMany();
  console.log(`\nPublic Packages total: ${packages.length}`);
  packages.forEach((p) => {
    console.log(`- [${p.id}] "${p.nameEn}" (isActive: ${p.isActive}, isFeatured: ${p.isFeatured}, price: ${p.price} ${p.currency})`);
  });

  const coachProfiles = await prisma.publicCoachProfile.findMany({
    include: {
      coachProfile: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });
  console.log(`\nPublic Coach Profiles total: ${coachProfiles.length}`);
  coachProfiles.forEach((cp) => {
    console.log(`- [${cp.id}] Coach: "${cp.coachProfile?.user?.name}" (isPublic: ${cp.isPublic}, title: "${cp.publicTitle}")`);
  });

  const offers = await prisma.publicOffer.findMany();
  console.log(`\nPublic Offers total: ${offers.length}`);
  offers.forEach((o) => {
    console.log(`- [${o.id}] "${o.title}" (isActive: ${o.isActive}, discount: ${o.discount}%, promoPrice: ${o.promoPrice}, ends: ${o.endDate})`);
  });

  const settings = await prisma.academySetting.findMany();
  console.log(`\nAcademy Settings total: ${settings.length}`);
  settings.forEach((s) => {
    console.log(`- "${s.key}": "${s.value}"`);
  });

  const sports = await prisma.sport.findMany();
  console.log(`\nSports total: ${sports.length}`);
  sports.forEach((sp) => {
    console.log(`- [${sp.id}] "${sp.nameEn}" (isActive: ${sp.isActive})`);
  });

  const memberships = await prisma.membership.findMany({ take: 5 });
  console.log(`\nMemberships sample total: ${memberships.length}`);

  const clients = await prisma.clientProfile.findMany({
    take: 5,
    include: {
      user: { select: { name: true, email: true, role: true } },
      memberships: true
    }
  });
  console.log(`\nClients sample total: ${clients.length}`);
  clients.forEach((c) => {
    console.log(`- [${c.id}] ${c.user.name} (${c.user.email}) status: ${c.status}, memberships: ${c.memberships.length}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
