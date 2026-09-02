export interface ArisanRecord {
  id: string;
  host: string;
  member: string;
  amount: number;
  kasAmount?: number;
  timestamp: string;
}

export type HostKasOptionType =
  | 'kontrol_maghrib'
  | 'kontrol_ashar'
  | 'sound_maghrib'
  | 'sound_ashar'
  | 'manual'
  | 'kas_luar';

export interface HostKasEntry {
  id: string;
  host: string;
  kasOptionType: HostKasOptionType;
  kasOptionLabel: string;
  kasAmount: number; // Mengurangi arisan
  hasKasLuar: boolean;
  kasLuarAmount: number; // Tidak mengurangi arisan
  notes?: string;
  updatedAt: string;
}

export interface AppSettings {
  host: string;
  datetime: string;
  defaultAmount: number;
  defaultKasAmount?: number;
  gasUrl?: string;
  adminUsername: string;
  adminPasswordHash?: string;
}

export type ServiceType = 'home' | 'cek-tagihan' | 'rekap' | 'login' | 'admin';

export type AdminTab = 'input' | 'kas' | 'edit' | 'members' | 'database' | 'settings';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}
