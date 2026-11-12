import React from "react";
import Link from "next/link";
import GXLogo from "@/components/brand/GXLogo";
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  ArrowRight,
  ShieldCheck,
  Flame
} from "lucide-react";

interface FooterSectionProps {
  academyName?: string;
  tagline?: string;
  whatsappNumber?: string;
  email?: string;
  location?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
}

export default function FooterSection({
  academyName = "GX Fitness Academy",
  tagline = "Train Hard. Live Strong.",
  whatsappNumber = "",
  email = "info@gxfitness.academy",
  location = "New Cairo, Cairo, Egypt",
  instagramUrl = "https://instagram.com/gxfitnessacademy",
  facebookUrl = "https://facebook.com/gxfitnessacademy",
  tiktokUrl = "https://tiktok.com/@gxfitnessacademy"
}: FooterSectionProps) {
  const cleanWhatsApp = (whatsappNumber || "").replace(/[^0-9]/g, "");
  const hasWhatsApp = Boolean(cleanWhatsApp);

  return (
    <footer id="contact" className="bg-[#07070c] text-white border-t border-white/[0.08] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-white/[0.08]">
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block py-1">
              <GXLogo size="md" priority forceTheme="dark" />
            </Link>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              Premier athletic training center dedicated to elite performance, strength conditioning, combat sports, and personalized transformation.
            </p>

            {/* Social Icons with min 44px touch targets */}
            <div className="flex items-center gap-3 pt-2">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-white/[0.08] flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}

              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-white/[0.08] flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}

              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-white/[0.08] flex items-center justify-center transition-colors"
                  aria-label="TikTok"
                >
                  <Flame className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Explore
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li>
                <a href="#about" className="hover:text-white transition-colors py-1 inline-block">
                  About Academy
                </a>
              </li>
              <li>
                <a href="#sports" className="hover:text-white transition-colors py-1 inline-block">
                  Sports & Programs
                </a>
              </li>
              <li>
                <a href="#championships" className="hover:text-white transition-colors py-1 inline-block">
                  Championships & Medals
                </a>
              </li>
              <li>
                <a href="#coaches" className="hover:text-white transition-colors py-1 inline-block">
                  Elite Coaches
                </a>
              </li>
              <li>
                <a href="#packages" className="hover:text-white transition-colors py-1 inline-block">
                  Membership Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Athletes & Members */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Athletes
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li>
                <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1 py-1">
                  <span>Athlete Portal</span>
                  <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                </Link>
              </li>
              <li>
                <Link href="/memberships" className="hover:text-white transition-colors py-1 inline-block">
                  Subscription Plans
                </Link>
              </li>
              {hasWhatsApp && (
                <li>
                  <a
                    href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                      "Hello GX Academy, I would like to book a tour of the training facility."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors py-1 inline-block"
                  >
                    Book a Facility Tour
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Col 5: Contact & Location */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Contact & Arena
            </h4>
            <ul className="space-y-3.5 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{location}</span>
              </li>
              {hasWhatsApp && (
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <a
                    href={`https://wa.me/${cleanWhatsApp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors font-semibold"
                  >
                    {whatsappNumber}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Security */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>&copy; {new Date().getFullYear()} {academyName}. All Rights Reserved.</span>
          </div>

          <div className="flex items-center text-xs text-slate-400">
            <span>Powered & Designed by </span>
            <a
              href="https://itqansolutions.org"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 font-medium text-slate-300 hover:text-white transition-colors"
            >
              Itqan Solutions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
