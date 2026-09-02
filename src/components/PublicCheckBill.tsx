import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Receipt,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRightLeft,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ArisanRecord } from '../types';
import { formatRupiah } from '../utils/storage';

interface PublicCheckBillProps {
  members: string[];
  records: ArisanRecord[];
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicCheckBill: React.FC<PublicCheckBillProps> = ({
  members,
  records,
  onToast,
}) => {
  const [selectedHost, setSelectedHost] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');

  // Extract all unique hosts that have records or fallback to all members
  const recordedHosts = Array.from(new Set(records.map((r) => r.host))).filter(Boolean);
  const hostOptions = Array.from(new Set([...recordedHosts, ...members]));

  // Record 1: Setoran Anggota ke Tuan Rumah (saat Tuan Rumah menjadi tuan rumah)
  const recordMemberToHost =
    selectedMember && selectedHost
      ? records.find(
          (r) =>
            r.member.toLowerCase() === selectedMember.toLowerCase() &&
            r.host.toLowerCase() === selectedHost.toLowerCase()
        )
      : null;

  // Record 2: Setoran Tuan Rumah ke Anggota (saat Anggota menjadi tuan rumah)
  const recordHostToMember =
    selectedMember && selectedHost
      ? records.find(
          (r) =>
            r.member.toLowerCase() === selectedHost.toLowerCase() &&
            r.host.toLowerCase() === selectedMember.toLowerCase()
        )
      : null;

  const isMemberToHostPaid = !!recordMemberToHost && (recordMemberToHost.amount || 0) > 0;
  const isHostToMemberPaid = !!recordHostToMember && (recordHostToMember.amount || 0) > 0;

  // Nominal Asli (tanpa dikurangi kas)
  const nominalMemberToHost = recordMemberToHost ? recordMemberToHost.amount || 0 : 0;
  const nominalHostToMember = recordHostToMember ? recordHostToMember.amount || 0 : 0;

  const isSamePerson =
    selectedMember &&
    selectedHost &&
    selectedMember.trim().toLowerCase() === selectedHost.trim().toLowerCase();

  const isBothPaid = !isSamePerson && isMemberToHostPaid && isHostToMemberPaid;

  // Additional filtered list if only Member is selected or for detailed view
  const memberOnlyRecords = selectedMember
    ? records.filter((r) => r.member.toLowerCase() === selectedMember.toLowerCase())
    : [];

  const hostOnlyRecords = selectedHost
    ? records.filter((r) => r.host.toLowerCase() === selectedHost.toLowerCase())
    : [];

  return (
    <div className="space-y-3.5 sm:space-y-4 flex flex-col h-full">
      {/* Top Selector Card: Pilih Tuan Rumah & Pilih Anggota */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm md:text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
              <span>Cek Tagihan & Setoran Arisan</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Pilih Tuan Rumah dan Nama Anggota untuk verifikasi status lunas kedua pihak
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[500px]">
            {/* 1. Pilih Tuan Rumah */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 mb-1 uppercase tracking-wide">
                1. Pilih Tuan Rumah
              </label>
              <select
                id="select-check-bill-host"
                value={selectedHost}
                onChange={(e) => setSelectedHost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-emerald-950 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
              >
                <option value="">-- Pilih Tuan Rumah --</option>
                {hostOptions.map((h) => (
                  <option key={`opt-host-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Pilih Anggota */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 mb-1 uppercase tracking-wide">
                2. Pilih Nama Anggota
              </label>
              <select
                id="select-check-bill-member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
              >
                <option value="">-- Pilih Nama Anggota --</option>
                {members.map((m) => (
                  <option key={`opt-member-${m}`} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedHost && selectedMember ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar">
          {/* NOTICE: SAMA-SAMA LUNAS / STATUS BANNER */}
          {isSamePerson ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-amber-900">
                  Tuan Rumah & Anggota Sama ({selectedMember})
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Anda memilih nama yang sama untuk Tuan Rumah dan Anggota. Berikut adalah status setoran pada putarannya sendiri:
                </p>
                <div className="mt-2.5 inline-flex items-center gap-2 bg-white/90 border border-amber-300 px-3 py-1.5 rounded-xl font-bold text-xs">
                  <span>Status Setoran:</span>
                  <span className={isMemberToHostPaid ? 'text-emerald-700' : 'text-rose-700'}>
                    {isMemberToHostPaid ? 'LUNAS' : 'BELUM BAYAR'}
                  </span>
                  {isMemberToHostPaid && (
                    <span className="text-slate-800">({formatRupiah(nominalMemberToHost)})</span>
                  )}
                </div>
              </div>
            </div>
          ) : isBothPaid ? (
            /* 🎉 PEMBERITAHUAN SAMA-SAMA LUNAS */
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-amber-400/80 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-7 h-7 text-amber-300 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-md shadow-xs">
                      Pemberitahuan
                    </span>
                    <span className="text-emerald-300 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Verifikasi Berhasil
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-amber-300 mt-1">
                    🎉 ALHAMDULILLAH, SAMA-SAMA LUNAS!
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-emerald-100/95 leading-relaxed font-medium pt-1 border-t border-emerald-800/80">
                Tuan Rumah <strong className="text-white underline decoration-amber-400">{selectedHost}</strong> dan Anggota <strong className="text-white underline decoration-amber-400">{selectedMember}</strong> telah <strong>sama-sama lunas</strong> membayar setoran arisan satu sama lain.
              </p>
            </div>
          ) : (
            /* STATUS BELUM SAMA-SAMA LUNAS */
            <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl p-4 shadow-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                  Status Pembayaran Belum Sepenuhnya Saling Lunas
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Salah satu atau kedua belah pihak belum tercatat melunasi setoran arisan pada putaran masing-masing. Silakan periksa rincian di bawah.
                </p>
              </div>
            </div>
          )}

          {/* DUAL COMPARISON CARDS: RINCIAN NOMINAL ASLI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Card 1: Setoran Anggota -> Tuan Rumah */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                isMemberToHostPaid
                  ? 'bg-white border-emerald-300 shadow-sm'
                  : 'bg-white border-rose-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isMemberToHostPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Pihak Pertama
                    </span>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                      {selectedMember}
                    </h4>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shrink-0 ${
                    isMemberToHostPaid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {isMemberToHostPaid ? 'LUNAS' : 'BELUM BAYAR'}
                </span>
              </div>

              <div className="pt-3 space-y-2 text-xs">
                <div className="text-[11px] text-slate-600">
                  Setoran ke Tuan Rumah: <strong className="text-slate-800">{selectedHost}</strong>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">
                    Nominal Asli Arisan (Murni)
                  </span>
                  <div className="text-base sm:text-lg font-black text-emerald-850">
                    {isMemberToHostPaid ? formatRupiah(nominalMemberToHost) : 'Rp 0 (Belum Bayar)'}
                  </div>
                  {recordMemberToHost?.timestamp && (
                    <div className="text-[10px] text-slate-400 pt-1">
                      Waktu Catat: {recordMemberToHost.timestamp}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Setoran Tuan Rumah -> Anggota (saat giliran Anggota jadi Tuan Rumah) */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                isHostToMemberPaid
                  ? 'bg-white border-emerald-300 shadow-sm'
                  : 'bg-white border-amber-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isHostToMemberPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Pihak Kedua
                    </span>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                      {selectedHost}
                    </h4>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shrink-0 ${
                    isHostToMemberPaid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {isHostToMemberPaid ? 'LUNAS' : 'BELUM BAYAR'}
                </span>
              </div>

              <div className="pt-3 space-y-2 text-xs">
                <div className="text-[11px] text-slate-600">
                  Setoran saat Tuan Rumah: <strong className="text-slate-800">{selectedMember}</strong>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">
                    Nominal Asli Arisan (Murni)
                  </span>
                  <div className="text-base sm:text-lg font-black text-emerald-850">
                    {isHostToMemberPaid ? formatRupiah(nominalHostToMember) : 'Rp 0 (Belum Jadi Tuan Rumah)'}
                  </div>
                  {recordHostToMember?.timestamp && (
                    <div className="text-[10px] text-slate-400 pt-1">
                      Waktu Catat: {recordHostToMember.timestamp}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY INFO FOOTER */}
          <div className="bg-emerald-950 text-white rounded-2xl p-4 shadow-sm border border-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                Ringkasan Pengecekan
              </span>
              <p className="text-emerald-100 font-medium">
                Pengecekan transaksi silang antara <strong>{selectedHost}</strong> dan <strong>{selectedMember}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-center">
                <span className="text-[9px] text-emerald-200 block">Nominal {selectedMember}</span>
                <span className="font-extrabold text-amber-300 text-xs sm:text-sm">
                  {formatRupiah(nominalMemberToHost)}
                </span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-center">
                <span className="text-[9px] text-emerald-200 block">Nominal {selectedHost}</span>
                <span className="font-extrabold text-amber-300 text-xs sm:text-sm">
                  {formatRupiah(nominalHostToMember)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : selectedMember && !selectedHost ? (
        /* Only Member Selected: Show Member records */
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                Riwayat Setoran: {selectedMember}
              </h4>
              <p className="text-[11px] text-slate-500">
                Silakan pilih <strong>Tuan Rumah</strong> di atas untuk memverifikasi status sama-sama lunas.
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
              {memberOnlyRecords.length} Putaran
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {memberOnlyRecords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {memberOnlyRecords.map((r, idx) => (
                  <div
                    key={`m-rec-${r.id}-${idx}`}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">Tuan Rumah: {r.host}</div>
                      <div className="text-sm font-black text-emerald-850">{formatRupiah(r.amount || 0)}</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      LUNAS
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                Belum ada catatan setoran untuk anggota ini.
              </div>
            )}
          </div>
        </div>
      ) : selectedHost && !selectedMember ? (
        /* Only Host Selected: Prompt to select member */
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                Tuan Rumah Dipilih: {selectedHost}
              </h4>
              <p className="text-[11px] text-slate-500">
                Silakan pilih <strong>Nama Anggota</strong> di atas untuk memverifikasi status sama-sama lunas.
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
              {hostOnlyRecords.length} Setoran Masuk
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {hostOnlyRecords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {hostOnlyRecords.map((r, idx) => (
                  <div
                    key={`h-rec-${r.id}-${idx}`}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">Anggota: {r.member}</div>
                      <div className="text-sm font-black text-emerald-850">{formatRupiah(r.amount || 0)}</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      LUNAS
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                Belum ada catatan setoran masuk untuk tuan rumah ini.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Neither Selected: Guide card */
        <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-8 sm:p-12 text-center text-slate-400 space-y-3 my-auto">
          <ArrowRightLeft className="w-12 h-12 mx-auto text-emerald-300" />
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-slate-700">
              Pilih Tuan Rumah & Nama Anggota
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Silakan pilih <strong>Tuan Rumah</strong> dan <strong>Nama Anggota</strong> pada menu di atas untuk menampilkan rincian dan memeriksa apakah keduanya telah sama-sama lunas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

