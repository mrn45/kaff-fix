import React, { useState } from 'react';
import { Users, CheckCircle2, WalletCards, X, Search, ChevronRight, Coins, Calendar, ArrowRight, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { ArisanRecord, HostKasEntry } from '../types';
import { formatRupiah } from '../utils/storage';

interface TotalMembersWidgetProps {
  totalMembers: number;
  totalCollected: number;
  records?: ArisanRecord[];
  hostKasEntries?: HostKasEntry[];
}

export const TotalMembersWidget: React.FC<TotalMembersWidgetProps> = ({
  totalMembers,
  totalCollected,
  records = [],
  hostKasEntries = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHost, setFilterHost] = useState('ALL');
  const [viewMode, setViewMode] = useState<'hosts' | 'details'>('hosts');

  // Filtered Host Kas Entries
  const filteredHostKas = hostKasEntries
    .filter((k) => {
      const matchSearch = k.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.kasOptionLabel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchHost = filterHost === 'ALL' || k.host.toLowerCase() === filterHost.toLowerCase();
      return matchSearch && matchHost;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Distinct host list
  const hostList = Array.from(new Set(hostKasEntries.map((k) => k.host)));

  // Displayed total
  const displayedTotalKas = filteredHostKas.reduce(
    (sum, k) => sum + (k.kasAmount || 0) + (k.hasKasLuar ? k.kasLuarAmount || 0 : 0),
    0
  );

  return (
    <div className="space-y-2.5">
      <div
        id="total-members-badge"
        className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-sm flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 pulse-ring-anim" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Anggota MDS
            </p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
              <span>Sistem Terhubung</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/70 px-3.5 py-1.5 rounded-xl border border-emerald-200/60 text-center whitespace-nowrap">
          <span className="text-lg font-black text-emerald-700">{totalMembers}</span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">Orang</span>
        </div>
      </div>

      {/* Interactive Total Kas Terkumpul Card */}
      <button
        type="button"
        id="btn-open-kas-details"
        onClick={() => setIsModalOpen(true)}
        className="w-full text-left bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 hover:from-emerald-900 hover:to-slate-900 active:scale-[0.99] text-white rounded-2xl p-3.5 shadow-md flex items-center justify-between border border-emerald-700/60 hover:border-amber-400/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-amber-400/15 group-hover:bg-amber-400/25 rounded-xl flex items-center justify-center text-amber-300 border border-amber-400/30 transition-colors">
            <WalletCards className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">
                Total Kas Terkumpul
              </p>
              <span className="text-[8px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1 rounded">
                Klik Rincian
              </span>
            </div>
            <p className="text-sm font-black text-amber-300 group-hover:text-amber-200 transition-colors">
              {formatRupiah(totalCollected)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/10 group-hover:bg-white/15 px-2.5 py-1.5 rounded-xl text-amber-300 border border-amber-400/20 transition-colors">
          <span className="text-[10px] font-bold">Rincian</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* Modal Rincian Kas */}
      {isModalOpen && (
        <div
          id="modal-kas-details"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm sm:max-w-lg md:max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-4 sm:p-5 shrink-0 flex items-center justify-between border-b-2 border-amber-400/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-400/20 backdrop-blur-md flex items-center justify-center text-amber-300 border border-amber-400/30">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                    <span>Rincian Kas Arisan</span>
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                  </h3>
                  <p className="text-[11px] sm:text-xs text-amber-200/90 font-medium">
                    MDS Kaukabus Syafaah
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Filter & View Switcher */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama tuan rumah atau jenis kas..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 sm:pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Host Filter */}
                <select
                  value={filterHost}
                  onChange={(e) => setFilterHost(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="ALL">Semua Pertemuan Tuan Rumah</option>
                  {hostList.map((h) => (
                    <option key={`filter-kas-host-${h}`} value={h}>
                      Tuan Rumah: {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List / Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5 bg-slate-100/50">
              {filteredHostKas.length > 0 ? (
                filteredHostKas.map((item, idx) => {
                  const totalKasForThisHost = (item.kasAmount || 0) + (item.hasKasLuar ? item.kasLuarAmount || 0 : 0);

                  return (
                    <div
                      key={`kas-host-card-${item.id || idx}`}
                      className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[11px] sm:text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {item.host}
                            </h4>
                            <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                              {item.kasOptionLabel}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black text-emerald-700 block">
                            {formatRupiah(totalKasForThisHost)}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400">
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID') : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Detail Potongan & Kas Luar */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[11px] sm:text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Potongan Kas Pertemuan:</span>
                          <strong className="text-slate-800">{formatRupiah(item.kasAmount)}</strong>
                        </div>
                        {item.hasKasLuar && (
                          <div className="flex items-center justify-between text-teal-700">
                            <span>KAS Luar / Sumbangan:</span>
                            <strong>+{formatRupiah(item.kasLuarAmount)}</strong>
                          </div>
                        )}
                        {item.notes && (
                          <div className="pt-1 border-t border-slate-200 text-[10px] sm:text-[11px] text-slate-500 italic">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <Coins className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Belum ada data KAS tersimpan.</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer / Summary */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 shrink-0 shadow-lg space-y-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Total Kas Terkumpul
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    {filteredHostKas.length} Pertemuan Tuan Rumah
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-emerald-800">
                    {formatRupiah(displayedTotalKas)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm shadow-xs transition-colors"
              >
                Tutup Rincian Kas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
