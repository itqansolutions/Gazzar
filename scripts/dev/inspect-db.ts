import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function inspect() {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: { contains: 'sport', mode: 'insensitive' } },
        { action: { contains: 'deactivat', mode: 'insensitive' } },
        { oldValues: { contains: 'bodybuilding', mode: 'insensitive' } },
        { newValues: { contains: 'bodybuilding', mode: 'insensitive' } },
        { oldValues: { contains: 'plyometric', mode: 'insensitive' } },
        { newValues: { contains: 'plyometric', mode: 'insensitive' } }
      ]
    }
  });
  console.log('AUDIT LOGS FOR SPORTS:');
  console.log(JSON.stringify(auditLogs, null, 2));

  const totalAudit = await prisma.auditLog.count();
  console.log('Total audit logs in DB:', totalAudit);

  await prisma.$disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
