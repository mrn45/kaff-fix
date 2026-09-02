import React, { useState, useMemo } from 'react';
import { Users, CheckCircle2, AlertCircle, Search, Coins, Sparkles, Tag } from 'lucide-react';
import { ArisanRecord, HostKasEntry } from '../types';
import { formatRupiah } from '../utils/storage';

interface PublicHostRecapProps {
  members: string[];
  records: ArisanRecord[];
  hostKasEntries?: HostKasEntry[];
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicHostRecap: React.FC<PublicHostRecapProps> = ({
  members,
  records,
  hostKasEntries = [],
  onToast,
}) => {
  const [selectedHost, setSelectedHost] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sudah' | 'belum'>('sudah');

  // Compute host records
  const hostRecords = selectedHost
    ? records.filter((r) => r.host.toLowerCase() === selectedHost.toLowerCase())
    : [];

  const paidMap = new Map<string, number>();
  hostRecords.forEach((r) => {
    const current = paidMap.get(r.member) || 0;
    paidMap.set(r.member, current + (r.amount || 0));
  });

  const paidMembers = members.filter((m) => {
    const amt = paidMap.get(m);
    return amt !== undefined && amt > 0;
  });
  const unpaidMembers = members.filter((m) => {
    const amt = paidMap.get(m);
    return !amt || amt === 0;
  });

  const totalArisan = Array.from(paidMap.values()).reduce((sum, val) => sum + val, 0);

  // Check Host KAS Entry
  const hostKasConfig = useMemo(() => {
    if (!selectedHost) return null;
    return hostKasEntries.find(
      (k) => k.host.toLowerCase() === selectedHost.toLowerCase()
    );
  }, [selectedHost, hostKasEntries]);

  const kasDeduction = hostKasConfig ? hostKasConfig.kasAmount : 0;
  const kasLuar = hostKasConfig && hostKasConfig.hasKasLuar ? hostKasConfig.kasLuarAmount : 0;
  const totalBersih = Math.max(0, totalArisan - kasDeduction);

  const filteredPaid = paidMembers.filter((m) =>
    m.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredUnpaid = unpaidMembers.filter((m) =>
    m.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3.5 sm:space-y-4 flex flex-col h-full">
      {/* Top Selector Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm md:text-base">
              Rekap Tuan Rumah
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Pilih Tuan Rumah untuk melihat seluruh daftar setoran arisan & potongan kas
            </p>
          </div>

          <div className="w-full sm:w-72 md:w-80 shrink-0">
            <select
              id="select-rekap-host"
              value={selectedHost}
              onChange={(e) => {
                setSelectedHost(e.target.value);
                setSearchTerm('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-amber-950 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              <option value="">-- Pilih Tuan Rumah --</option>
              {members.map((m) => (
                <option key={`rekap-host-${m}`} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedHost ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 min-h-0 overflow-hidden">
          {/* Left Column on Desktop: Summary Box */}
          <div className="lg:col-span-5 flex flex-col space-y-3 shrink-0">
            {/* Summary Box */}
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3 border border-emerald-700/50">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs text-amber-300 font-bold uppercase tracking-wider">
                    Total Bersih Diterima Tuan Rumah
                  </p>
                  {hostKasConfig && (
                    <span className="text-[9px] sm:text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md">
                      {hostKasConfig.kasOptionLabel}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 mt-1">
                  {formatRupiah(totalBersih)}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-emerald-200 font-medium mt-1.5">
                  <span>Arisan: <strong className="text-white">{formatRupiah(totalArisan)}</strong></span>
                  <span>•</span>
                  <span className="text-amber-200">Potongan KAS: <strong className="text-amber-300">-{formatRupiah(kasDeduction)}</strong></span>
                  {kasLuar > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-teal-300">KAS Luar: <strong className="text-teal-200">+{formatRupiah(kasLuar)}</strong></span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-emerald-800/60 text-xs">
                <div className="bg-white/10 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-emerald-200">Sudah Masuk</div>
                    <div className="font-extrabold text-white text-xs sm:text-sm mt-0.5">{paidMembers.length} Orang</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-emerald-200">Belum Masuk</div>
                    <div className="font-extrabold text-amber-300 text-xs sm:text-sm mt-0.5">{unpaidMembers.length} Orang</div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-900/50 rounded-xl p-2.5 border border-emerald-700/50 text-[11px] text-emerald-100 flex items-center justify-between">
                <span>Tuan Rumah:</span>
                <span className="font-extrabold text-amber-300 text-xs sm:text-sm truncate">{selectedHost}</span>
              </div>
            </div>
          </div>

          {/* Right Column on Desktop: Search & Member Lists */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-slate-100 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama anggota..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('sudah')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'sudah'
                      ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sudah ({filteredPaid.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('belum')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'belum'
                      ? 'bg-white text-rose-700 shadow-xs border border-rose-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Belum ({filteredUnpaid.length})</span>
                </button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2">
              {activeTab === 'sudah' ? (
                filteredPaid.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredPaid.map((m, idx) => {
                      const amt = paidMap.get(m) || 0;
                      return (
                        <div
                          key={`paid-${m}`}
                          className="bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {m}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-black text-emerald-700 block">
                              {formatRupiah(amt)}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600">
                              Lunas
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    {searchTerm ? `Tidak ditemukan nama '${searchTerm}'` : 'Belum ada anggota yang tercatat membayar arisan.'}
                  </div>
                )
              ) : filteredUnpaid.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredUnpaid.map((m, idx) => (
                    <div
                      key={`unpaid-${m}`}
                      className="bg-slate-50 hover:bg-rose-50/40 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          {m}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md shrink-0">
                        Belum Bayar
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-emerald-600 text-xs sm:text-sm font-bold space-y-1">
                  <p>🎉 Alhamdulillah!</p>
                  <p className="text-slate-600 text-xs font-normal">
                    {searchTerm ? `Semua pencarian '${searchTerm}' telah lunas.` : 'Seluruh anggota telah lunas membayar arisan.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-dashed border-amber-200 text-slate-400 space-y-2.5 my-auto">
          <Users className="w-12 h-12 text-amber-300 stroke-1" />
          <p className="text-sm font-bold text-slate-700">Pilih Tuan Rumah</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Silakan pilih nama Tuan Rumah pada menu di atas untuk menampilkan rincian rekapitulasi setoran & potongan kas.
          </p>
        </div>
      )}
    </div>
  );
};
