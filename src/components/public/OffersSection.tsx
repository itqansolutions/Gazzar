"use client";

import React, { useState, useEffect } from "react";
import { Tag, Clock, ArrowRight, MessageCircle, Flame } from "lucide-react";

interface PublicOfferItem {
  id: string;
  packageId?: string | null;
  package?: {
    id: string;
    nameEn: string;
    price: number;
    currency: string;
  } | null;
  title: string;
  description?: string | null;
  discount?: number | null;
  promoPrice?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface OffersSectionProps {
  initialOffers?: PublicOfferItem[];
  whatsappNumber?: string;
}

export default function OffersSection({
  initialOffers,
  whatsappNumber = "+201000000000"
}: OffersSectionProps) {
  const [offers, setOffers] = useState<PublicOfferItem[]>(initialOffers || []);
  const [loading, setLoading] = useState(!initialOffers);

  useEffect(() => {
    if (!initialOffers) {
      fetch("/api/public/offers")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setOffers(json.data);
          }
        })
        .catch((err) => console.error("[OffersSection] Error:", err))
        .finally(() => setLoading(false));
    }
  }, [initialOffers]);

  if (loading || offers.length === 0) {
    // If no active offers, omit section cleanly
    return null;
  }

  const cleanWhatsApp = whatsappNumber.replace(/[^0-9]/g, "");

  const formatEndDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section id="offers" className="py-16 lg:py-20 bg-[#09090f] text-white border-t border-white/[0.06] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span>Limited Time Offers</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
            Special Academy Promotions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {offers.map((offer) => {
            const waText = `Hello GX Fitness Academy, I want to claim the "${offer.title}" promotional offer!`;
            const waUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(waText)}`;

            return (
              <div
                key={offer.id}
                className="relative rounded-3xl p-6 bg-gradient-to-br from-[#1c1418] via-[#141520] to-[#0d0e14] border border-red-500/30 shadow-[0_8px_30px_rgba(220,38,38,0.15)] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white flex items-center gap-1.5 shadow-sm">
                      <Tag className="w-3 h-3" />
                      <span>
                        {offer.discount
                          ? `${offer.discount}% OFF`
                          : offer.promoPrice
                          ? `Now ${offer.promoPrice} EGP`
                          : "Exclusive Deal"}
                      </span>
                    </span>

                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      <span>Ends {formatEndDate(offer.endDate)}</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white">{offer.title}</h3>
                  {offer.package && (
                    <p className="text-xs font-bold text-red-400 mt-0.5">
                      Applicable to: {offer.package.nameEn}
                    </p>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                    {offer.description || "Limited seasonal athletic registration discount. Valid until slots fill."}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.08]">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Claim Offer on WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
