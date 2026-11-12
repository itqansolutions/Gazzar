import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { authService } from "@/lib/auth/auth-service";
import prisma from "@/lib/prisma";
import {
  PublicNavbar,
  HeroSection,
  AboutSection,
  SportsSection,
  ChampionshipsSection,
  CoachesSection,
  PackagesSection,
  OffersSection,
  FooterSection,
  FloatingWhatsApp
} from "@/components/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. Server-Side Authentication Verification
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    try {
      const validation = await authService.getCurrentUser(sessionToken);
      if (validation.valid && validation.user) {
        redirect("/dashboard");
      }
    } catch {
      // In case of error or invalid token, fall through to public landing page
    }
  }

  // 2. Fetch Public Academy Data Directly (Fast Server Side Rendering)
  let settingsDict: Record<string, string> = {
    whatsapp_number: "+201000000000",
    academy_name: "GX Fitness Academy",
    academy_tagline: "Train Hard. Live Strong.",
    academy_description:
      "A premier athletic training academy built for athletic excellence, strength mastery, and life-changing physical transformation.",
    years_experience: "10+",
    athletes_trained: "1,500+",
    sports_offered: "8+",
    email: "info@gxfitness.academy",
    location: "New Cairo, Cairo, Egypt",
    instagram_url: "https://instagram.com/gxfitnessacademy",
    facebook_url: "https://facebook.com/gxfitnessacademy",
    tiktok_url: "https://tiktok.com/@gxfitnessacademy"
  };

  let sports: any[] = [];
  let coaches: any[] = [];
  let packages: any[] = [];
  let championships: any[] = [];
  let offers: any[] = [];

  try {
    const [
      dbSettings,
      dbSports,
      dbCoaches,
      dbPackages,
      dbChampionships,
      dbOffers
    ] = await Promise.all([
      prisma.academySetting.findMany(),
      prisma.sport.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          imageUrl: true,
          descriptionEn: true,
          descriptionAr: true,
          categories: true
        },
        orderBy: { nameEn: "asc" }
      }),
      prisma.coachProfile.findMany({
        where: {
          publicProfile: {
            isPublic: true
          }
        },
        select: {
          id: true,
          specialties: true,
          bio: true,
          yearsOfExperience: true,
          user: {
            select: {
              name: true,
              avatar: true
            }
          },
          publicProfile: {
            select: {
              publicTitle: true,
              publicBio: true,
              displayOrder: true
            }
          }
        },
        orderBy: {
          publicProfile: {
            displayOrder: "asc"
          }
        }
      }),
      prisma.publicPackage.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" }
      }),
      prisma.championship.findMany({
        where: { isPublished: true },
        orderBy: [
          { isFeatured: "desc" },
          { displayOrder: "asc" },
          { year: "desc" }
        ]
      }),
      prisma.publicOffer.findMany({
        where: {
          isActive: true,
          endDate: { gte: new Date() }
        },
        include: {
          package: {
            select: {
              id: true,
              nameEn: true,
              price: true,
              currency: true
            }
          }
        },
        orderBy: { endDate: "asc" }
      })
    ]);

    for (const s of dbSettings) {
      settingsDict[s.key] = s.value;
    }

    sports = dbSports;
    coaches = dbCoaches.map((c) => ({
      id: c.id,
      name: c.user.name,
      avatar: c.user.avatar || "/coach_abdullah_portrait.png",
      title: c.publicProfile?.publicTitle || (c.specialties?.[0] ? `Head Coach — ${c.specialties[0]}` : "Elite Coach"),
      bio: c.publicProfile?.publicBio || c.bio,
      specialties: c.specialties || [],
      yearsOfExperience: c.yearsOfExperience || 0
    }));
    packages = dbPackages;
    championships = dbChampionships.map((ch) => ({
      ...ch,
      date: ch.date ? ch.date.toISOString() : null
    }));
    offers = dbOffers.map((o) => ({
      ...o,
      startDate: o.startDate.toISOString(),
      endDate: o.endDate.toISOString()
    }));
  } catch (error) {
    console.error("[HomePage] Error loading data from PostgreSQL:", error);
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white selection:bg-red-600 selection:text-white">
      {/* 1. Header Navigation */}
      <PublicNavbar whatsappNumber={settingsDict.whatsapp_number} />

      {/* 2. Hero Section */}
      <HeroSection
        academyName={settingsDict.academy_name}
        tagline={settingsDict.academy_tagline}
        description={settingsDict.academy_description}
        whatsappNumber={settingsDict.whatsapp_number}
      />

      {/* 3. About & Philosophy */}
      <AboutSection
        academyName={settingsDict.academy_name}
        description={settingsDict.academy_description}
        yearsExperience={settingsDict.years_experience}
        athletesTrained={settingsDict.athletes_trained}
        sportsOffered={settingsDict.sports_offered}
      />

      {/* 4. Sports & Disciplines */}
      <SportsSection
        initialSports={sports}
        whatsappNumber={settingsDict.whatsapp_number}
      />

      {/* 5. Championships & Achievements */}
      <ChampionshipsSection initialChampionships={championships} />

      {/* 6. Elite Coaching Staff */}
      <CoachesSection
        initialCoaches={coaches}
        whatsappNumber={settingsDict.whatsapp_number}
      />

      {/* 7. Membership Packages & Rates */}
      <PackagesSection
        initialPackages={packages}
        whatsappNumber={settingsDict.whatsapp_number}
      />

      {/* 8. Promotional Offers (conditionally renders if active) */}
      <OffersSection
        initialOffers={offers}
        whatsappNumber={settingsDict.whatsapp_number}
      />

      {/* 9. Academy Footer */}
      <FooterSection
        academyName={settingsDict.academy_name}
        tagline={settingsDict.academy_tagline}
        whatsappNumber={settingsDict.whatsapp_number}
        email={settingsDict.email}
        location={settingsDict.location}
        instagramUrl={settingsDict.instagram_url}
        facebookUrl={settingsDict.facebook_url}
        tiktokUrl={settingsDict.tiktok_url}
      />

      {/* 10. Sticky WhatsApp Conversion Action */}
      <FloatingWhatsApp whatsappNumber={settingsDict.whatsapp_number} />
    </div>
  );
}