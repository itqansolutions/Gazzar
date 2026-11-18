import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: "throwaway.p4" } } });
  const userIds = users.map((u) => u.id);
  const clients = await prisma.clientProfile.findMany({ where: { userId: { in: userIds } } });
  const clientIds = clients.map((c) => c.id);
  const coaches = await prisma.coachProfile.findMany({ where: { userId: { in: userIds } } });
  const coachIds = coaches.map((c) => c.id);

  if (clientIds.length > 0) {
    await prisma.clientCoachAssignment.deleteMany({ where: { clientId: { in: clientIds } } });
    await prisma.clientProfile.deleteMany({ where: { id: { in: clientIds } } });
  }
  if (coachIds.length > 0) {
    await prisma.clientCoachAssignment.deleteMany({ where: { coachId: { in: coachIds } } });
    await prisma.coachProfile.deleteMany({ where: { id: { in: coachIds } } });
  }
  if (userIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  console.log("Cleaned throwaway.p4 users count:", userIds.length);
  await prisma.$disconnect();
}

main();
