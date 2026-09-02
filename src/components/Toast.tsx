import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  const bgStyle =
    toast.type === 'error'
      ? 'bg-rose-600 text-white'
      : toast.type === 'info'
      ? 'bg-slate-800 text-white'
      : 'bg-emerald-800 text-white';

  return (
    <div
      id="app-toast"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold z-50 flex items-center gap-2 max-w-[90vw] whitespace-nowrap animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/20 ${bgStyle}`}
    >
      {toast.type === 'error' ? (
        <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
      ) : toast.type === 'info' ? (
        <Info className="w-4 h-4 text-amber-300 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
      )}
      <span className="truncate">{toast.text}</span>
    </div>
  );
};
