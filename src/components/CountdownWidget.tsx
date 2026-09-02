import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { AppSettings } from '../types';

interface CountdownWidgetProps {
  settings: AppSettings;
}

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ settings }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isExpired: false,
  });

  useEffect(() => {
    if (!settings.datetime) return;

    const targetDate = new Date(settings.datetime).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        setTimeLeft({
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
          isExpired: true,
        });
        return;
      }

      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        days: d.toString().padStart(2, '0'),
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0'),
        isExpired: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [settings.datetime]);

  const formattedDate = settings.datetime
    ? new Date(settings.datetime).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Jadwal belum ditentukan';

  return (
    <div
      id="countdown-card"
      className="bg-gradient-to-br from-emerald-50/95 via-white to-amber-50/40 border border-emerald-300/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden shrink-0"
    >
      <div className="absolute top-0 right-0 w-28 sm:w-36 h-28 sm:h-36 bg-amber-400/10 rounded-bl-full pointer-events-none" />
      
      <div className="relative z-10 flex items-start gap-3 sm:gap-3.5">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30 shadow-xs">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
            <span>Pertemuan Berikutnya</span>
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-tight mt-0.5 truncate">
            {settings.host || 'Belum Ditetapkan'}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{formattedDate}</span>
          </p>
        </div>
      </div>

      <div className="mt-3.5 sm:mt-4 bg-white/90 backdrop-blur-xs rounded-xl border border-emerald-200/80 p-2.5 sm:p-3 grid grid-cols-4 gap-1.5 items-center relative z-10 shadow-xs">
        <div className="text-center border-r border-slate-100 pr-1">
          <div className="text-base sm:text-xl md:text-2xl font-black text-emerald-800 leading-tight">{timeLeft.days}</div>
          <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Hari</div>
        </div>
        <div className="text-center border-r border-slate-100 pr-1">
          <div className="text-base sm:text-xl md:text-2xl font-black text-emerald-800 leading-tight">{timeLeft.hours}</div>
          <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jam</div>
        </div>
        <div className="text-center border-r border-slate-100 pr-1">
          <div className="text-base sm:text-xl md:text-2xl font-black text-emerald-800 leading-tight">{timeLeft.minutes}</div>
          <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Menit</div>
        </div>
        <div className="text-center">
          <div className="text-base sm:text-xl md:text-2xl font-black text-amber-600 leading-tight">{timeLeft.seconds}</div>
          <div className="text-[8px] sm:text-[10px] font-bold text-amber-700/80 uppercase tracking-wide">Detik</div>
        </div>
      </div>
    </div>
  );
};
