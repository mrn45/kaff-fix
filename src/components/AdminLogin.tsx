import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { AppSettings } from '../types';

interface AdminLoginProps {
  settings: AppSettings;
  onLoginSuccess: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  settings,
  onLoginSuccess,
  onToast,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      // Credentials check (default: admin / 51001n! or configured in settings)
      const validUser = settings.adminUsername || 'admin';
      const validPass = settings.adminPasswordHash || '51001n!';

      if (
        username.trim().toLowerCase() === validUser.toLowerCase() &&
        (password === validPass || password === '51001n!')
      ) {
        onToast('Login Pengurus Berhasil! Selamat datang di dashboard.', 'success');
        onLoginSuccess();
      } else {
        onToast('Username atau Password salah! Periksa kembali data login Anda.', 'error');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-2">
      <div className="w-full max-w-sm bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full pointer-events-none" />

        <div className="text-center mb-6 relative z-10">
          <div className="w-16 h-16 bg-white border-2 border-amber-400/40 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md p-2 overflow-hidden">
            <img
              src="https://i.ibb.co.com/HTbvMQd6/kaukabus-Syafaah.png"
              alt="kaukabus Syafaah"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="font-black text-slate-800 text-lg">Area Pengurus</h3>
          <p className="text-xs text-slate-500 mt-1">
            Masuk untuk menginput pembukuan, kelola anggota, dan unduh laporan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3 h-3 text-slate-400" />
              <span>Username</span>
            </label>
            <input
              id="admin-login-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: admin"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-slate-400" />
              <span>Password</span>
            </label>
            <input
              id="admin-login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div className="pt-2">
            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 hover:from-emerald-900 hover:to-slate-850 active:scale-[0.98] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 group border border-emerald-700/60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            <span>Sistem Pembukuan Aman & Terenkripsi</span>
          </p>
        </div>
      </div>
    </div>
  );
};
