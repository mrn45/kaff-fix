import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckSquare,
  ShieldAlert,
  ArrowLeft,
  Home as HomeIcon,
  ChevronRight,
} from 'lucide-react';
import {
  ArisanRecord,
  AppSettings,
  ServiceType,
  ToastMessage,
  HostKasEntry,
} from './types';
import {
  getStoredMembers,
  saveStoredMembers,
  getStoredDatabase,
  saveStoredDatabase,
  getStoredSettings,
  saveStoredSettings,
  getStoredHostKas,
  saveStoredHostKas,
} from './utils/storage';
import { Header } from './components/Header';
import { CountdownWidget } from './components/CountdownWidget';
import { TotalMembersWidget } from './components/TotalMembersWidget';
import { PublicCheckBill } from './components/PublicCheckBill';
import { PublicHostRecap } from './components/PublicHostRecap';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Toast } from './components/Toast';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ServiceType>('home');
  const [members, setMembers] = useState<string[]>([]);
  const [records, setRecords] = useState<ArisanRecord[]>([]);
  const [hostKasEntries, setHostKasEntries] = useState<HostKasEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const loadedMembers = getStoredMembers();
    const loadedRecords = getStoredDatabase();
    const loadedHostKas = getStoredHostKas();
    const loadedSettings = getStoredSettings();

    setMembers(loadedMembers);
    setRecords(loadedRecords);
    setHostKasEntries(loadedHostKas);
    setSettings(loadedSettings);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const showToast = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = Date.now().toString();
    setToast({ id, text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3200);
  };

  const handleUpdateMembers = (newMembers: string[]) => {
    setMembers(newMembers);
    saveStoredMembers(newMembers);
  };

  const handleUpdateRecords = (newRecords: ArisanRecord[]) => {
    setRecords(newRecords);
    saveStoredDatabase(newRecords);
  };

  const handleUpdateHostKas = (newKas: HostKasEntry[]) => {
    setHostKasEntries(newKas);
    saveStoredHostKas(newKas);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  // Total Kas calculation from Host Kas Entries (Potongan KAS + KAS Luar)
  const totalKasFromEntries = hostKasEntries.reduce(
    (acc, curr) => acc + (curr.kasAmount || 0) + (curr.hasKasLuar ? curr.kasLuarAmount || 0 : 0),
    0
  );

  // Get service view title
  const getServiceTitle = () => {
    switch (currentView) {
      case 'cek-tagihan':
        return 'Cek Tagihan Saya';
      case 'rekap':
        return 'Rekap Tuan Rumah';
      case 'login':
        return 'Login Pengurus';
      case 'admin':
        return 'Dashboard Pengurus';
      default:
        return 'MDS Kaukabus Syafaah';
    }
  };

  return (
    <div className="text-slate-800 antialiased h-[100dvh] w-screen flex justify-center items-center bg-slate-200/70 p-0 sm:p-4 overflow-hidden select-none">
      {/* Global Splash Loader */}
      {isLoading ? (
        <div
          id="global-loader"
          className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 flex flex-col items-center justify-center text-white"
        >
          <div className="w-20 h-20 bg-white/15 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 mb-4 animate-bounce p-2.5 overflow-hidden">
            <img
              src="https://i.ibb.co.com/HTbvMQd6/kaukabus-Syafaah.png"
              alt="kaukabus Syafaah"
              className="w-full h-full object-contain drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black tracking-wide text-white">
              MDS Kaukabus Syafaah
            </h2>
            <p className="text-xs text-emerald-300/80 mt-1 animate-pulse">
              Memuat Sistem Arisan Online...
            </p>
          </div>
        </div>
      ) : null}

      {/* Main Responsive Application Container */}
      <div
        id="app-container"
        className="w-full sm:max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[100dvh] sm:h-[94vh] sm:max-h-[920px] bg-slate-50 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-slate-300 relative transition-all duration-200"
      >
        {/* VIEW 1: HOME VIEW */}
        {currentView === 'home' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Brand */}
            <Header />

            {/* Scrollable Body Content with Responsive Grid for Mobile and PC */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 md:gap-5">
                {/* Left Column on Desktop: Countdown & Kas Widgets */}
                <div className="md:col-span-5 lg:col-span-5 space-y-3.5 sm:space-y-4">
                  {/* Countdown Pertemuan Berikutnya */}
                  <CountdownWidget settings={settings} />

                  {/* Total Anggota & Kas Card */}
                  <TotalMembersWidget
                    totalMembers={members.length}
                    totalCollected={totalKasFromEntries}
                    records={records}
                    hostKasEntries={hostKasEntries}
                  />

                  {/* Info Majelis Quick Note (Desktop & Mobile) */}
                  <div className="bg-emerald-950 text-emerald-100 p-3.5 sm:p-4 rounded-2xl border border-emerald-800/80 shadow-xs hidden md:block">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Informasi Majelis
                      </span>
                    </div>
                    <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
                      Gunakan menu <strong>Cek Tagihan Saya</strong> untuk memeriksa iuran per anggota, atau <strong>Rekap Tuan Rumah</strong> untuk laporan penerimaan putaran arisan.
                    </p>
                  </div>
                </div>

                {/* Right Column on Desktop: Main Navigation Cards */}
                <div className="md:col-span-7 lg:col-span-7 space-y-2.5 sm:space-y-3 flex flex-col justify-start">
                  <div className="hidden md:flex items-center justify-between pb-1 px-1">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Menu Layanan Utama
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                      {members.length} Anggota Terdaftar
                    </span>
                  </div>

                  {/* 1. Cek Tagihan Saya */}
                  <button
                    type="button"
                    id="nav-cek-tagihan"
                    onClick={() => setCurrentView('cek-tagihan')}
                    className="w-full text-left bg-white hover:bg-emerald-50/60 active:scale-[0.99] border border-slate-200/90 hover:border-emerald-500 p-3.5 sm:p-4 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shadow-2xs group-hover:bg-emerald-700 group-hover:text-amber-300 transition-all shrink-0">
                        <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm md:text-base group-hover:text-emerald-800 transition-colors">
                          Cek Tagihan Saya
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                          Pilih nama untuk cek riwayat setoran & kas per putaran
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs shrink-0">
                      <span className="hidden sm:inline">Buka</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  {/* 2. Rekap Tuan Rumah */}
                  <button
                    type="button"
                    id="nav-rekap-tuan-rumah"
                    onClick={() => setCurrentView('rekap')}
                    className="w-full text-left bg-white hover:bg-amber-50/50 active:scale-[0.99] border border-slate-200/90 hover:border-amber-400 p-3.5 sm:p-4 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                        <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm md:text-base group-hover:text-amber-800 transition-colors">
                          Rekap Tuan Rumah
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                          Lihat daftar pembayaran & rincian potongan kas per tuan rumah
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs shrink-0">
                      <span className="hidden sm:inline">Buka</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  {/* 3. Login Pengurus (Admin) */}
                  <button
                    type="button"
                    id="nav-login-admin"
                    onClick={() => setCurrentView('login')}
                    className="w-full text-left bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 hover:from-emerald-900 hover:to-slate-900 active:scale-[0.99] text-white p-3.5 sm:p-4 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer border border-emerald-700/60"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center shadow-inner group-hover:bg-amber-400 group-hover:text-emerald-950 transition-all shrink-0 border border-amber-300/30">
                        <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                          <span>Login Pengurus</span>
                          <span className="bg-amber-400/20 text-amber-300 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-400/40">
                            Admin
                          </span>
                        </h3>
                        <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
                          Input arisan, atur kas, kelola anggota, & unduh laporan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs shrink-0">
                      <span className="hidden sm:inline">Masuk</span>
                      <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SUB-SERVICE VIEW (Full height with dedicated header) */}
        {currentView !== 'home' && (
          <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Top Navigation Bar with Responsive Layout */}
            <div className="bg-white px-4 sm:px-6 py-3 sm:py-3.5 shadow-xs border-b border-slate-200/80 flex items-center justify-between shrink-0 z-20">
              <button
                id="btn-back-to-prev"
                onClick={() => {
                  setCurrentView('home');
                }}
                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Kembali</span>
              </button>

              <div className="flex items-center gap-2 min-w-0 px-2 text-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center p-0.5 shrink-0 hidden sm:flex">
                  <img
                    src="https://i.ibb.co.com/HTbvMQd6/kaukabus-Syafaah.png"
                    alt="Logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2
                  id="service-view-title"
                  className="font-black text-slate-800 text-xs sm:text-sm md:text-base truncate"
                >
                  {getServiceTitle()}
                </h2>
              </div>

              <button
                id="btn-nav-home"
                onClick={() => setCurrentView('home')}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <HomeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Beranda</span>
              </button>
            </div>

            {/* Service Dynamic View Content with Responsive Padding */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 md:p-6 min-h-0 relative">
              {currentView === 'cek-tagihan' && (
                <PublicCheckBill
                  members={members}
                  records={records}
                  onToast={showToast}
                />
              )}

              {currentView === 'rekap' && (
                <PublicHostRecap
                  members={members}
                  records={records}
                  hostKasEntries={hostKasEntries}
                  onToast={showToast}
                />
              )}

              {currentView === 'login' && (
                <AdminLogin
                  settings={settings}
                  onLoginSuccess={() => setCurrentView('admin')}
                  onToast={showToast}
                />
              )}

              {currentView === 'admin' && (
                <AdminDashboard
                  members={members}
                  records={records}
                  settings={settings}
                  hostKasEntries={hostKasEntries}
                  onUpdateMembers={handleUpdateMembers}
                  onUpdateRecords={handleUpdateRecords}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateHostKas={handleUpdateHostKas}
                  onLogout={() => {
                    setCurrentView('home');
                    showToast('Berhasil keluar dari dashboard pengurus.', 'info');
                  }}
                  onToast={showToast}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      <Toast toast={toast} />
    </div>
  );
}
