import prisma from "../src/lib/prisma";

async function main() {
  const templatesCount = await prisma.workoutTemplate.count();
  const templateExercisesCount = await prisma.workoutTemplateExercise.count();
  const blocksCount = await prisma.workoutBlock.count();
  const blockItemsCount = await prisma.blockItem.count();
  const templateBlocksCount = await prisma.workoutBlock.count({ where: { templateId: { not: null } } });

  console.log({
    templatesCount,
    templateExercisesCount,
    blocksCount,
    blockItemsCount,
    templateBlocksCount
  });

  const sampleTemplate = await prisma.workoutTemplate.findFirst({
    include: {
      exercises: { include: { exercise: true } },
      blocks: { include: { items: { include: { exercise: true } } } }
    }
  });

  console.log("Sample template:", {
    id: sampleTemplate?.id,
    titleEn: sampleTemplate?.titleEn,
    exerciseCount: sampleTemplate?.exercises.length,
    blockCount: sampleTemplate?.blocks.length,
    blocks: sampleTemplate?.blocks.map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      rounds: b.rounds,
      itemCount: b.items.length,
      items: b.items.map(i => ({
        id: i.id,
        itemType: i.itemType,
        exerciseName: i.exercise?.nameEn,
        targetSets: i.targetSets,
        targetReps: i.targetReps
      }))
    }))
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
