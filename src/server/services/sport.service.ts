import prisma from "@/lib/prisma";

export class SportServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SportServiceError";
    this.statusCode = statusCode;
  }
}

export interface CreateSportInput {
  name?: string;
  nameEn?: string;
  nameAr?: string;
  icon?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  categories?: string[] | string;
  isActive?: boolean;
}

export interface UpdateSportInput extends Partial<CreateSportInput> {}

function normalizeCategories(categories?: string[] | string): string[] | undefined {
  if (categories === undefined) return undefined;
  const list = Array.isArray(categories)
    ? categories
    : categories.split(",");
  const cleaned = Array.from(
    new Set(list.map((c) => String(c).trim()).filter(Boolean))
  );
  return cleaned;
}

export class SportService {
  async getSports(options?: { activeOnly?: boolean; search?: string }) {
    const where: any = {};

    if (options?.activeOnly) {
      where.isActive = true;
    }

    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim();
      where.OR = [
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
        { descriptionEn: { contains: q, mode: "insensitive" } },
        { descriptionAr: { contains: q, mode: "insensitive" } }
      ];
    }

    return await prisma.sport.findMany({
      where,
      include: {
        _count: {
          select: {
            exercises: true,
            exerciseSports: true,
            templates: true,
            programs: true,
            clients: true,
            sessions: true
          }
        }
      },
      orderBy: [{ isActive: "desc" }, { nameEn: "asc" }]
    });
  }

  async getSportById(id: string) {
    const sport = await prisma.sport.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            exercises: true,
            exerciseSports: true,
            templates: true,
            programs: true,
            clients: true,
            sessions: true
          }
        },
        exerciseSports: {
          include: {
            exercise: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
                difficulty: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!sport) {
      throw new SportServiceError("Sport not found", 404);
    }

    return sport;
  }

  async createSport(input: CreateSportInput) {
    const nameEn = (input.nameEn || input.name || input.nameAr || "").trim();
    const nameAr = (input.nameAr || input.name || input.nameEn || "").trim();

    if (!nameEn) {
      throw new SportServiceError("Sport name is required", 400);
    }

    const descEn = (input.descriptionEn ?? input.description ?? null)?.trim() || null;
    const descAr = (input.descriptionAr ?? input.description ?? null)?.trim() || null;
    const categories = normalizeCategories(input.categories);

    return await prisma.sport.create({
      data: {
        nameEn,
        nameAr: nameAr || nameEn,
        icon: input.icon?.trim() || "🏆",
        imageUrl: input.imageUrl?.trim() || null,
        descriptionEn: descEn,
        descriptionAr: descAr ?? descEn,
        categories: categories && categories.length > 0 ? categories : ["Training", "Fitness"],
        isActive: input.isActive ?? true
      },
      include: {
        _count: {
          select: {
            exercises: true,
            exerciseSports: true,
            templates: true,
            programs: true,
            clients: true,
            sessions: true
          }
        }
      }
    });
  }

  async updateSport(id: string, input: UpdateSportInput) {
    const existing = await prisma.sport.findUnique({ where: { id } });
    if (!existing) {
      throw new SportServiceError("Sport not found", 404);
    }

    const dataToUpdate: any = {};

    if (input.name !== undefined || input.nameEn !== undefined || input.nameAr !== undefined) {
      const nextEn = (input.nameEn ?? input.name ?? existing.nameEn).trim();
      const nextAr = (input.nameAr ?? input.name ?? existing.nameAr).trim();
      if (!nextEn) {
        throw new SportServiceError("Sport name cannot be empty", 400);
      }
      dataToUpdate.nameEn = nextEn;
      dataToUpdate.nameAr = nextAr || nextEn;
    }

    if (input.icon !== undefined) {
      dataToUpdate.icon = input.icon?.trim() || "🏆";
    }

    if (input.imageUrl !== undefined) {
      dataToUpdate.imageUrl = input.imageUrl?.trim() || null;
    }

    if (input.description !== undefined || input.descriptionEn !== undefined || input.descriptionAr !== undefined) {
      const nextDescEn = (input.descriptionEn ?? input.description ?? null)?.trim() || null;
      const nextDescAr = (input.descriptionAr ?? input.description ?? null)?.trim() || null;
      if (input.description !== undefined || input.descriptionEn !== undefined) {
        dataToUpdate.descriptionEn = nextDescEn;
      }
      if (input.description !== undefined || input.descriptionAr !== undefined) {
        dataToUpdate.descriptionAr = nextDescAr ?? nextDescEn;
      }
    }

    if (input.categories !== undefined) {
      dataToUpdate.categories = normalizeCategories(input.categories) ?? [];
    }

    if (input.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(input.isActive);
    }

    return await prisma.sport.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: {
            exercises: true,
            exerciseSports: true,
            templates: true,
            programs: true,
            clients: true,
            sessions: true
          }
        }
      }
    });
  }

  async deleteSport(id: string) {
    const sport = await prisma.sport.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            exercises: true,
            exerciseSports: true,
            templates: true,
            programs: true,
            clients: true,
            sessions: true
          }
        }
      }
    });

    if (!sport) {
      throw new SportServiceError("Sport not found", 404);
    }

    const linkedExercises = Math.max(sport._count.exerciseSports, sport._count.exercises);
    const deps: string[] = [];
    if (linkedExercises > 0) deps.push(`${linkedExercises} exercise(s)`);
    if (sport._count.templates > 0) deps.push(`${sport._count.templates} template(s)`);
    if (sport._count.programs > 0) deps.push(`${sport._count.programs} program(s)`);
    if (sport._count.clients > 0) deps.push(`${sport._count.clients} athlete(s)`);
    if (sport._count.sessions > 0) deps.push(`${sport._count.sessions} session(s)`);

    if (deps.length > 0) {
      throw new SportServiceError(
        `Cannot delete "${sport.nameEn}" because it is linked to ${deps.join(", ")}. Deactivate (archive) it instead to preserve existing records.`,
        409
      );
    }

    await prisma.sport.delete({ where: { id } });
    return true;
  }
}

export const sportService = new SportService();
