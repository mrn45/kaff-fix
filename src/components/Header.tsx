import React from 'react';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header
      id="main-app-header"
      className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-4 sm:p-5 md:p-6 rounded-b-3xl shadow-xl shrink-0 transition-all duration-300 relative overflow-hidden border-b-2 border-amber-400/30"
    >
      {/* Background subtle geometric glow with emerald & gold */}
      <div className="absolute -right-8 -top-8 w-32 sm:w-44 h-32 sm:h-44 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-28 sm:w-36 h-28 sm:h-36 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-800/90 text-amber-300 border border-amber-400/40 tracking-wide uppercase shadow-xs">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
              Pembukuan Digital
            </span>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-sm truncate">
            MDS Kaukabus Syafaah
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm font-medium mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            <span>Sistem Pembukuan & Rekap Arisan</span>
          </p>
        </div>

        <div className="w-13 h-13 sm:w-16 sm:h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border-2 border-amber-400/40 shrink-0 transform hover:scale-105 transition-transform overflow-hidden p-1.5">
          <img
            src="https://i.ibb.co.com/HTbvMQd6/kaukabus-Syafaah.png"
            alt="kaukabus Syafaah"
            className="w-full h-full object-contain drop-shadow-sm"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
};

