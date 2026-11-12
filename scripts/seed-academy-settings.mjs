import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = [
  { key: 'whatsapp_number', value: '+201000000000' },
  { key: 'academy_name', value: 'GX Fitness Academy' },
  { key: 'academy_tagline', value: 'Train Hard. Live Strong.' },
  {
    key: 'academy_description',
    value:
      'GX Fitness Academy is a premier athletic and fitness training center dedicated to elite performance, strength conditioning, combat sports, and personalized transformation.'
  },
  { key: 'instagram_url', value: 'https://instagram.com/gxfitnessacademy' },
  { key: 'facebook_url', value: 'https://facebook.com/gxfitnessacademy' },
  { key: 'tiktok_url', value: 'https://tiktok.com/@gxfitnessacademy' },
  { key: 'location', value: 'New Cairo, Cairo, Egypt' },
  { key: 'email', value: 'info@gxfitness.academy' },
  { key: 'phone', value: '+20 100 000 0000' },
  { key: 'years_experience', value: '10+' },
  { key: 'athletes_trained', value: '1,500+' },
  { key: 'sports_offered', value: '8+' }
];

const DEFAULT_PACKAGES = [
  {
    nameEn: '1 Month Standard',
    nameAr: 'اشتراك شهر قياسي',
    descriptionEn: 'Full gym floor access, locker, shower, and 1 comprehensive fitness assessment.',
    descriptionAr: 'دخول كامل للصالة الرياضية، خزانة، وتقييم للياقة البدنية.',
    price: 1500,
    currency: 'EGP',
    durationDays: 30,
    sessionsCount: null,
    sportsIncluded: ['Fitness', 'Gym Floor', 'Strength'],
    benefits: [
      'Full gym floor access',
      'Locker & shower facilities',
      '1 Fitness & InBody Assessment',
      'Standard equipment access'
    ],
    isActive: true,
    isFeatured: false,
    displayOrder: 1
  },
  {
    nameEn: '3 Months Transformation',
    nameAr: 'باقة التحول - 3 أشهر',
    descriptionEn: 'Full access, customized workout plan, monthly InBody test & nutrition guidance.',
    descriptionAr: 'دخول كامل، برنامج تدريبي مخصص، فحص شهري ومتابعة تغذية.',
    price: 3800,
    currency: 'EGP',
    durationDays: 90,
    sessionsCount: null,
    sportsIncluded: ['Fitness', 'Cross-Training', 'Strength'],
    benefits: [
      'Unlimited gym floor access',
      'Customized workout split',
      'Monthly InBody test & nutrition check',
      'Access to group fitness classes',
      'Priority coach consultation'
    ],
    isActive: true,
    isFeatured: true,
    displayOrder: 2
  },
  {
    nameEn: '6 Months Elite Athlete',
    nameAr: 'باقة النخبة - 6 أشهر',
    descriptionEn: 'Priority access, personalized athletic coaching, quarterly assessment & guest passes.',
    descriptionAr: 'أولوية الدخول، تدريب رياضي متقدم، وتقييم دوري شامل.',
    price: 6800,
    currency: 'EGP',
    durationDays: 180,
    sessionsCount: null,
    sportsIncluded: ['Fitness', 'Cross-Training', 'Combat Sports', 'Strength'],
    benefits: [
      'VIP gym floor access',
      'Personalized athletic coaching',
      'Nutrition tracking & macro guidance',
      'Bi-weekly body composition analysis',
      '3 Guest passes included',
      'GX Academy apparel discount'
    ],
    isActive: true,
    isFeatured: false,
    displayOrder: 3
  },
  {
    nameEn: 'Annual Championship Pass',
    nameAr: 'الباقة السنوية - الأبطال',
    descriptionEn: '365 days of elite access, VIP locker, full athletic monitoring, and free freeze periods.',
    descriptionAr: 'اشتراك سنوي كامل للأبطال مع مزايا VIP وإمكانية التجميد.',
    price: 11500,
    currency: 'EGP',
    durationDays: 365,
    sessionsCount: null,
    sportsIncluded: ['All Academy Sports', 'VIP Floor', 'Open Arena'],
    benefits: [
      '365 days unlimited VIP access',
      'Full quarterly performance testing',
      'Freeze option (up to 45 days)',
      'Unlimited group fitness & combat classes',
      'Dedicated coach check-in',
      'Championship team preparation support'
    ],
    isActive: true,
    isFeatured: false,
    displayOrder: 4
  }
];

const DEFAULT_CHAMPIONSHIPS = [
  {
    title: 'National Cross-Training Championship',
    description: 'GX Academy athletes clinched top podium placements in the Elite Team and Individual divisions.',
    year: 2025,
    date: new Date('2025-10-15'),
    imageUrls: ['/coach_dark_hero.jpg'],
    videoUrl: null,
    results: '1st Place Team Division, 2nd Place Individual Men',
    isPublished: true,
    isFeatured: true,
    displayOrder: 1
  },
  {
    title: 'Regional Strength & Powerlifting Open',
    description: 'Record-breaking performance by GX Academy strength team in deadlift and bench press categories.',
    year: 2024,
    date: new Date('2024-11-20'),
    imageUrls: ['/coach_abdullah_action.png'],
    videoUrl: null,
    results: 'Gold Medal (Under 85kg), Silver Medal (Heavyweight)',
    isPublished: true,
    isFeatured: false,
    displayOrder: 2
  }
];

async function main() {
  console.log('Seeding academy settings...');
  for (const s of DEFAULT_SETTINGS) {
    await prisma.academySetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
  console.log('Academy settings seeded successfully.');

  // Seed default packages if none exist
  const existingPackagesCount = await prisma.publicPackage.count();
  if (existingPackagesCount === 0) {
    console.log('Seeding initial public packages...');
    for (const p of DEFAULT_PACKAGES) {
      await prisma.publicPackage.create({ data: p });
    }
    console.log('Public packages seeded successfully.');
  }

  // Seed default championships if none exist
  const existingChampionshipsCount = await prisma.championship.count();
  if (existingChampionshipsCount === 0) {
    console.log('Seeding initial championships...');
    for (const c of DEFAULT_CHAMPIONSHIPS) {
      await prisma.championship.create({ data: c });
    }
    console.log('Championships seeded successfully.');
  }

  // Ensure any existing CoachProfile has a PublicCoachProfile
  const coaches = await prisma.coachProfile.findMany({
    include: { user: true, publicProfile: true }
  });

  for (let i = 0; i < coaches.length; i++) {
    const coach = coaches[i];
    if (!coach.publicProfile) {
      console.log(`Creating public profile for coach: ${coach.user.name}`);
      await prisma.publicCoachProfile.create({
        data: {
          coachProfileId: coach.id,
          isPublic: true,
          displayOrder: i + 1,
          publicTitle: coach.specialties?.[0] ? `Head Coach — ${coach.specialties[0]}` : 'Elite Coach',
          publicBio: coach.bio || 'Dedicated to coaching athletes toward peak strength, conditioning, and discipline.'
        }
      });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
