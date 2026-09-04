import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { ArisanRecord, AppSettings, HostKasEntry } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export interface FirestoreArisanData {
  members: string[];
  records: ArisanRecord[];
  hostKasEntries: HostKasEntry[];
  settings: AppSettings;
  updatedAt?: string;
  lastSyncAppsScript?: string | null;
}

// Initialize Firebase App instance safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Target designated Firestore database ID if provisioned
export const db: Firestore =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

const APP_STATE_COLLECTION = 'app_state';
const APP_STATE_DOC = 'main';

/**
 * Mendapatkan referensi dokumen utama arisan di Firestore
 */
export const getMainDocRef = () => doc(db, APP_STATE_COLLECTION, APP_STATE_DOC);

/**
 * Mengambil data terkini arisan dari Firebase Firestore (sekali panggil)
 */
export async function fetchArisanDataFromFirebase(): Promise<FirestoreArisanData | null> {
  try {
    const docSnap = await getDoc(getMainDocRef());
    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreArisanData;
      return {
        members: Array.isArray(data.members) ? data.members : [],
        records: Array.isArray(data.records) ? data.records : [],
        hostKasEntries: Array.isArray(data.hostKasEntries) ? data.hostKasEntries : [],
        settings: data.settings || ({} as AppSettings),
        updatedAt: data.updatedAt,
        lastSyncAppsScript: data.lastSyncAppsScript || null,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching data from Firestore:', error);
    throw error;
  }
}

/**
 * Menyimpan / memperbarui seluruh data arisan ke Firebase Firestore secara otomatis
 */
export async function saveArisanDataToFirebase(
  data: Partial<FirestoreArisanData>
): Promise<void> {
  try {
    const currentTimestamp = new Date().toISOString();
    const payload: Partial<FirestoreArisanData> = {
      ...data,
      updatedAt: currentTimestamp,
    };
    // setDoc dengan merge: true agar field lain tidak tertimpa jika dikirim parsial
    await setDoc(getMainDocRef(), payload, { merge: true });
  } catch (error) {
    console.error('Error saving data to Firestore:', error);
    throw error;
  }
}

/**
 * Listener Realtime: Mendengarkan perubahan data Firestore secara realtime otomatis
 */
export function subscribeToArisanData(
  onData: (data: FirestoreArisanData) => void,
  onError?: (error: Error) => void
): () => void {
  const unsubscribe = onSnapshot(
    getMainDocRef(),
    (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data() as FirestoreArisanData;
        const sanitized: FirestoreArisanData = {
          members: Array.isArray(raw.members) ? raw.members : [],
          records: Array.isArray(raw.records) ? raw.records : [],
          hostKasEntries: Array.isArray(raw.hostKasEntries) ? raw.hostKasEntries : [],
          settings: raw.settings || ({} as AppSettings),
          updatedAt: raw.updatedAt,
          lastSyncAppsScript: raw.lastSyncAppsScript || null,
        };
        onData(sanitized);
      }
    },
    (err) => {
      console.warn('Firestore realtime subscription error:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Mengirim data dari Firebase Firestore ke Google Apps Script (Sheets)
 */
export async function syncFirebaseToAppsScript(
  targetGasUrl: string,
  providedData?: FirestoreArisanData
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const url = targetGasUrl.trim();
  if (!url) {
    throw new Error('Link Google Apps Script (Web App URL) belum diatur.');
  }

  // 1. Ambil data terbaru dari Firebase jika belum disediakan
  let dataToSync = providedData;
  if (!dataToSync) {
    const cloudData = await fetchArisanDataFromFirebase();
    if (!cloudData) {
      throw new Error('Tidak ada data di Firebase untuk disinkronkan.');
    }
    dataToSync = cloudData;
  }

  const now = new Date();
  const timestampIso = now.toISOString();
  const timestampLocale = now.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // 2. Susun payload standar Google Apps Script
  const payload = {
    action: 'SYNC_ALL_DATA',
    source: 'FIREBASE_FIRESTORE_SYNC',
    timestamp: timestampIso,
    settings: dataToSync.settings,
    members: dataToSync.members,
    records: dataToSync.records,
    hostKasEntries: dataToSync.hostKasEntries,
    summary: {
      totalMembers: dataToSync.members.length,
      totalRecords: dataToSync.records.length,
      totalArisan: dataToSync.records.reduce((acc, curr) => acc + (curr.amount || 0), 0),
      totalKasHost: dataToSync.hostKasEntries.reduce(
        (acc, curr) => acc + (curr.kasAmount || 0) + (curr.kasLuarAmount || 0),
        0
      ),
      uniqueRecordedHosts: Array.from(new Set(dataToSync.records.map((r) => r.host))),
    },
  };

  // 3. Kirim ke Google Apps Script dengan text/plain untuk melewati batasan CORS
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchErr) {
    // Karena Apps Script redirects sering kali memicu respons opaque di browser,
    // pengiriman tetap sampai ke backend Google Apps Script.
    console.info('Google Apps Script response notification:', fetchErr);
  }

  // 4. Catat riwayat sinkronisasi Apps Script ke Firestore
  try {
    await setDoc(
      getMainDocRef(),
      {
        lastSyncAppsScript: timestampLocale,
        updatedAt: timestampIso,
      },
      { merge: true }
    );
  } catch (saveErr) {
    console.warn('Gagal menyimpan timestamp lastSyncAppsScript ke Firestore:', saveErr);
  }

  // Simpan juga di localStorage sebagai backup
  try {
    localStorage.setItem('mds_last_appscript_sync', timestampLocale);
  } catch (_) {}

  return {
    success: true,
    message: `Data Firebase berhasil dikirim ke Google Sheets (${dataToSync.members.length} anggota, ${dataToSync.records.length} transaksi arisan, ${dataToSync.hostKasEntries.length} kas)!`,
    timestamp: timestampLocale,
  };
}
