import { ArisanRecord, AppSettings, HostKasEntry, HostKasOptionType } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const STORAGE_KEYS = {
  MEMBERS: 'mds_arisan_members_v3',
  DATABASE: 'mds_arisan_db_v3',
  SETTINGS: 'mds_arisan_settings_v3',
  HOST_KAS: 'mds_arisan_host_kas_v3',
};

// Cleanup any legacy demo storage keys
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    [
      'mds_arisan_members_v1',
      'mds_arisan_db_v1',
      'mds_arisan_settings_v1',
      'mds_arisan_host_kas_v2',
      'mds_arisan_members_v2',
      'mds_arisan_db_v2',
    ].forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch (_) {}
}

export const KAS_PRESET_OPTIONS: Array<{
  type: HostKasOptionType;
  label: string;
  amount: number;
  reducesArisan: boolean;
  timeSlot?: 'Maghrib' | 'Ashar';
  description: string;
}> = [
  {
    type: 'kontrol_maghrib',
    label: 'KAS + Kontrol (Maghrib)',
    amount: 200000,
    reducesArisan: true,
    timeSlot: 'Maghrib',
    description: 'Nominal kas Rp 200.000 (Mengurangi Arisan)',
  },
  {
    type: 'kontrol_ashar',
    label: 'KAS + Kontrol (Ashar)',
    amount: 250000,
    reducesArisan: true,
    timeSlot: 'Ashar',
    description: 'Nominal kas Rp 250.000 (Mengurangi Arisan)',
  },
  {
    type: 'sound_maghrib',
    label: 'KAS + Sound (Maghrib)',
    amount: 300000,
    reducesArisan: true,
    timeSlot: 'Maghrib',
    description: 'Nominal kas Rp 300.000 (Mengurangi Arisan)',
  },
  {
    type: 'sound_ashar',
    label: 'KAS + Sound (Ashar)',
    amount: 350000,
    reducesArisan: true,
    timeSlot: 'Ashar',
    description: 'Nominal kas Rp 350.000 (Mengurangi Arisan)',
  },
  {
    type: 'manual',
    label: 'KAS Manual',
    amount: 0,
    reducesArisan: true,
    description: 'Input nominal kas bebas (Mengurangi Arisan)',
  },
  {
    type: 'kas_luar',
    label: 'KAS Luar',
    amount: 0,
    reducesArisan: false,
    description: 'Input manual dan TIDAK mengurangi arisan (Sumbangan/Kas Tambahan)',
  },
];

export const INITIAL_MEMBERS: string[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  host: '',
  datetime: '',
  defaultAmount: 50000,
  defaultKasAmount: 5000,
  gasUrl: 'https://script.google.com/macros/s/AKfycbyn0MHvuKT6dVMkH-WFFC1KljepsCYY9ifWiJeGxnwNnzZtYfn5o1Ro6IWHFHq7-k2kzg/exec',
  adminUsername: 'admin',
  adminPasswordHash: '51001n!',
};

export const INITIAL_RECORDS: ArisanRecord[] = [];

export const INITIAL_HOST_KAS: HostKasEntry[] = [];

export function getStoredHostKas(): HostKasEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOST_KAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.HOST_KAS, JSON.stringify(INITIAL_HOST_KAS));
      return INITIAL_HOST_KAS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_HOST_KAS;
  } catch {
    return INITIAL_HOST_KAS;
  }
}

export function saveStoredHostKas(entries: HostKasEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.HOST_KAS, JSON.stringify(entries));
}

export function getStoredMembers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
      return INITIAL_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
}

export function saveStoredMembers(members: string[]): void {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

export function getStoredDatabase(): ArisanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DATABASE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_RECORDS;
  } catch {
    return INITIAL_RECORDS;
  }
}

export function saveStoredDatabase(records: ArisanRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(records));
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('Rp', 'Rp ');
}

export function exportToCSV(records: ArisanRecord[], filterHost?: string): void {
  const filtered = filterHost && filterHost !== 'ALL' 
    ? records.filter((r) => r.host.toLowerCase() === filterHost.toLowerCase())
    : records;

  let csvContent = 'data:text/csv;charset=utf-8,Tuan Rumah,Anggota,Nominal Arisan,Nominal Kas,Arisan Bersih,Tanggal\n';
  filtered.forEach((r) => {
    const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString('id-ID') : '-';
    const arisan = r.amount || 0;
    const kas = r.kasAmount || 0;
    const bersih = Math.max(0, arisan - kas);
    csvContent += `"${r.host}","${r.member}",${arisan},${kas},${bersih},"${dateStr}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Laporan_Arisan_MDS_${filterHost || 'Semua'}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadArisanInputTemplate(
  members: string[],
  host?: string,
  defaultNominal: number = 50000,
  defaultKasNominal: number = 5000
): void {
  const currentHost = host || 'Bpk. Tuan Rumah';
  let csvContent = '\uFEFFNo,Tuan Rumah,Nama Anggota,Nominal Arisan,Nominal Kas\n';
  
  if (members.length > 0) {
    members.forEach((m, idx) => {
      csvContent += `${idx + 1},"${currentHost}","${m}",${defaultNominal},${defaultKasNominal}\n`;
    });
  } else {
    csvContent += `1,"${currentHost}","Bpk. Ahmad Fauzi",${defaultNominal},${defaultKasNominal}\n`;
    csvContent += `2,"${currentHost}","Bpk. Budi Pratama",${defaultNominal},${defaultKasNominal}\n`;
    csvContent += `3,"${currentHost}","Ibu Hj. Aminah",${defaultNominal},${defaultKasNominal}\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Template_Input_Arisan_MDS_${currentHost.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMembersTemplate(currentMembers?: string[]): void {
  let csvContent = '\uFEFFNo,Nama Anggota\n';
  
  if (currentMembers && currentMembers.length > 0) {
    currentMembers.forEach((m, idx) => {
      csvContent += `${idx + 1},"${m}"\n`;
    });
  } else {
    csvContent += '1,"Bpk. Ahmad Fauzi"\n' +
      '2,"Bpk. Budi Pratama"\n' +
      '3,"Ibu Hj. Aminah"\n' +
      '4,"Ibu Siti Fatimah"\n' +
      '5,"Bpk. Faisal"\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Template_Daftar_Anggota_MDS.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

export async function exportToImage(element: HTMLElement, filename: string, format: 'jpg' | 'pdf'): Promise<void> {
  // Create a temporary container clone to render the full content without scroll limits or clipping
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Style the clone container for high-res clean capture
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = '780px';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.backgroundColor = '#ffffff';
  clone.style.zIndex = '-9999';
  clone.style.padding = '24px';
  clone.style.boxSizing = 'border-box';

  // Fix any scrollable children inside the clone
  const scrollables = clone.querySelectorAll('*');
  scrollables.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      htmlEl.style.overflow = 'visible';
      htmlEl.style.maxHeight = 'none';
    }
  });

  // Handle images inside the clone to prevent CORS taint errors
  const images = clone.querySelectorAll('img');
  images.forEach((img) => {
    img.crossOrigin = 'anonymous';
    // If the image fails to load or has CORS issues, we ensure it won't crash rendering
    img.onerror = () => {
      img.style.display = 'none';
    };
  });

  document.body.appendChild(clone);

  try {
    // Wait a brief tick for fonts/layout to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 1024,
      scrollY: 0,
      scrollX: 0,
    });

    if (format === 'jpg') {
      let dataUrl: string;
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } catch {
        // Fallback to png if jpeg toDataURL is tainted
        dataUrl = canvas.toDataURL('image/png');
      }

      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF Export
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let dataUrl: string;
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } catch {
        dataUrl = canvas.toDataURL('image/png');
      }

      if (imgHeight <= printableHeight) {
        // Single page fits perfectly
        pdf.addImage(dataUrl, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        // Multi-page slicing using sub-canvas slices to prevent distortion
        const pageCanvasHeight = (canvas.width * printableHeight) / printableWidth;
        let renderedHeight = 0;

        while (renderedHeight < canvas.height) {
          const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
          
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              renderedHeight,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );

            const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
            const sliceDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);

            if (renderedHeight > 0) {
              pdf.addPage();
            }
            pdf.addImage(sliceDataUrl, 'JPEG', margin, margin, imgWidth, sliceImgHeight);
          }

          renderedHeight += sliceHeight;
        }
      }

      pdf.save(`${filename}.pdf`);
    }
  } finally {
    // Always clean up clone from DOM
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
  }
}

// -------------------------------------------------------------
// GOOGLE APPS SCRIPT REALTIME DATA ENGINE
// -------------------------------------------------------------

export interface GasDataResponse {
  status: 'success' | 'error';
  message?: string;
  appName?: string;
  spreadsheetName?: string;
  timestamp?: string;
  members?: string[];
  records?: ArisanRecord[];
  hostKasEntries?: HostKasEntry[];
  settings?: Partial<AppSettings>;
  summary?: {
    totalMembers: number;
    totalRecords: number;
    totalArisan: number;
    totalKasHost: number;
    lastSynced?: string;
  };
}

/**
 * Mengambil data secara realtime dari Google Apps Script Web App.
 * Mendukung 2 strategi otomatis:
 * 1. Standard CORS Fetch (Modern Browsers).
 * 2. Dynamic JSONP Callback Fallback (Bebas blokir CORS di semua webview/iframe).
 */
export async function fetchDataFromGoogleAppsScript(gasUrl: string): Promise<GasDataResponse> {
  const cleanUrl = gasUrl.trim();
  if (!cleanUrl) {
    throw new Error('Link Google Apps Script belum diisi');
  }

  const separator = cleanUrl.includes('?') ? '&' : '?';
  const timestampParam = `_t=${Date.now()}`;

  // 1. Coba via standard fetch terlebih dahulu
  try {
    const fetchUrl = `${cleanUrl}${separator}action=GET_DATA&${timestampParam}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    if (response.ok) {
      const data = (await response.json()) as GasDataResponse;
      if (data && (data.status === 'success' || Array.isArray(data.members) || Array.isArray(data.records))) {
        return sanitizeGasDataResponse(data);
      }
    }
  } catch (err) {
    console.info('Standard fetch redirected or blocked by CORS, trying JSONP fallback...', err);
  }

  // 2. Fallback ke JSONP (100% kompatibel tanpa masalah CORS)
  return new Promise<GasDataResponse>((resolve, reject) => {
    const callbackName = `gas_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout mengambil data dari Google Apps Script (15 detik). Pastikan Web App diset "Who has access: Anyone".'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      try {
        delete (window as unknown as Record<string, unknown>)[callbackName];
      } catch {
        (window as unknown as Record<string, unknown>)[callbackName] = undefined;
      }
    };

    (window as unknown as Record<string, unknown>)[callbackName] = (data: GasDataResponse) => {
      cleanup();
      if (data && (data.status === 'success' || Array.isArray(data.members) || Array.isArray(data.records))) {
        resolve(sanitizeGasDataResponse(data));
      } else {
        reject(new Error(data?.message || 'Format data dari Google Apps Script tidak valid'));
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat data dari Google Apps Script. Periksa kembali link Web App URL.'));
    };

    script.src = `${cleanUrl}${separator}action=GET_DATA&callback=${callbackName}&${timestampParam}`;
    document.head.appendChild(script);
  });
}

function sanitizeGasDataResponse(raw: GasDataResponse): GasDataResponse {
  const members = Array.isArray(raw.members)
    ? raw.members.map((m) => String(m).trim()).filter(Boolean)
    : [];

  const records: ArisanRecord[] = Array.isArray(raw.records)
    ? raw.records.map((r, idx) => ({
        id: r.id || `trx-${idx + 1}-${Date.now()}`,
        host: String(r.host || '').trim(),
        member: String(r.member || '').trim(),
        amount: Number(r.amount) || 0,
        kasAmount: Number(r.kasAmount) || 0,
        timestamp: r.timestamp || new Date().toISOString(),
      })).filter((r) => r.host && r.member)
    : [];

  const hostKasEntries: HostKasEntry[] = Array.isArray(raw.hostKasEntries)
    ? raw.hostKasEntries.map((k, idx) => ({
        id: k.id || `kas-${idx + 1}-${Date.now()}`,
        host: String(k.host || '').trim(),
        kasOptionType: k.kasOptionType || 'manual',
        kasOptionLabel: String(k.kasOptionLabel || 'Kas Tuan Rumah').trim(),
        kasAmount: Number(k.kasAmount) || 0,
        hasKasLuar: Boolean(k.hasKasLuar),
        kasLuarAmount: Number(k.kasLuarAmount) || 0,
        notes: k.notes,
        updatedAt: k.updatedAt || new Date().toISOString(),
      })).filter((k) => k.host)
    : [];

  return {
    status: 'success',
    appName: raw.appName || 'MDS Kaukabus Syafaah',
    spreadsheetName: raw.spreadsheetName,
    timestamp: raw.timestamp || new Date().toISOString(),
    members,
    records,
    hostKasEntries,
    settings: raw.settings,
    summary: raw.summary,
  };
}

export const GOOGLE_APPS_SCRIPT_BACKEND_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) BACKEND
 * MDS KAUKABUS SYAFAAH - SISTEM PEMBUKUAN ARISAN & KAS
 * =========================================================================
 * 
 * FITUR:
 * 1. [doPost] MENERIMA & MENYIMPAN data dari web ke Google Sheets
 * 2. [doGet] MENGIRIM data dari Google Sheets ke web (REALTIME DUAL-SYNC)
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Payload data kosong.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sinkronkan Daftar Anggota
    if (payload.members && Array.isArray(payload.members)) {
      syncMembersSheet(ss, payload.members);
    }

    // 2. Sinkronkan Data Arisan
    if (payload.records && Array.isArray(payload.records)) {
      syncRecordsSheet(ss, payload.records);
    }

    // 3. Sinkronkan Kas Tuan Rumah
    if (payload.hostKasEntries && Array.isArray(payload.hostKasEntries)) {
      syncHostKasSheet(ss, payload.hostKasEntries);
    }

    // 4. Sinkronkan Ringkasan & Jadwal
    if (payload.settings || payload.summary) {
      syncSummarySheet(ss, payload.settings, payload.summary, payload.timestamp);
    }

    saveBackupSnapshot(ss, payload);

    return responseJSON({
      status: 'success',
      message: 'Semua data (Anggota, Arisan, Kas, & Jadwal) berhasil diperbarui di Google Sheets!',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: 'Gagal memproses data: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "GET_DATA";
    var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;

    if (action === "PING") {
      return respond({ status: 'online', serverTime: new Date().toISOString() }, callback);
    }

    var members = readMembersFromSheet(ss);
    var records = readRecordsFromSheet(ss);
    var hostKasEntries = readHostKasFromSheet(ss);
    var settings = readSettingsFromSheet(ss);

    if (members.length === 0 && records.length === 0) {
      var snapshot = loadBackupSnapshot(ss);
      if (snapshot) {
        if (snapshot.members) members = snapshot.members;
        if (snapshot.records) records = snapshot.records;
        if (snapshot.hostKasEntries) hostKasEntries = snapshot.hostKasEntries;
        if (snapshot.settings) settings = Object.assign({}, settings, snapshot.settings);
      }
    }

    var totalArisan = records.reduce(function(acc, r) { return acc + (Number(r.amount) || 0); }, 0);
    var totalKasHost = hostKasEntries.reduce(function(acc, k) {
      return acc + (Number(k.kasAmount) || 0) + (k.hasKasLuar ? (Number(k.kasLuarAmount) || 0) : 0);
    }, 0);

    var result = {
      status: 'success',
      appName: 'MDS Kaukabus Syafaah',
      spreadsheetName: ss.getName(),
      timestamp: new Date().toISOString(),
      members: members,
      records: records,
      hostKasEntries: hostKasEntries,
      settings: settings,
      summary: {
        totalMembers: members.length,
        totalRecords: records.length,
        totalArisan: totalArisan,
        totalKasHost: totalKasHost,
        lastSynced: new Date().toISOString()
      }
    };

    return respond(result, callback);

  } catch (err) {
    return respond({ status: 'error', message: err.toString() }, (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null);
  }
}

function readMembersFromSheet(ss) {
  var sheet = ss.getSheetByName("Daftar Anggota");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var members = [];
  var seen = {};

  for (var i = 0; i < data.length; i++) {
    var rawName = data[i][1] ? data[i][1] : data[i][0];
    var nameStr = String(rawName || "").trim();
    if (nameStr && nameStr.toLowerCase() !== "nama anggota" && nameStr.toLowerCase() !== "nama") {
      var lower = nameStr.toLowerCase();
      if (!seen[lower]) {
        seen[lower] = true;
        members.push(nameStr);
      }
    }
  }
  return members;
}

function readRecordsFromSheet(ss) {
  var sheet = ss.getSheetByName("Data Arisan");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 3) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, Math.max(8, lastCol)).getValues();
  var records = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var host = String(row[1] || "").trim();
    var member = String(row[2] || "").trim();
    var amount = Number(row[3]) || 0;
    var kasAmount = Number(row[4]) || 0;
    var timestampStr = row[6] ? String(row[6]).trim() : new Date().toISOString();
    var idStr = row[7] ? String(row[7]).trim() : ("trx-" + (i + 1));

    if (host && member && (amount > 0 || kasAmount > 0)) {
      records.push({
        id: idStr,
        host: host,
        member: member,
        amount: amount,
        kasAmount: kasAmount,
        timestamp: timestampStr
      });
    }
  }
  return records;
}

function readHostKasFromSheet(ss) {
  var sheet = ss.getSheetByName("Data Kas Tuan Rumah");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 3) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, Math.max(8, lastCol)).getValues();
  var entries = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var host = String(row[1] || "").trim();
    var kasLabel = String(row[2] || "").trim();
    var kasPokok = Number(row[3]) || 0;
    var hasKasLuarStr = String(row[4] || "").toUpperCase();
    var hasKasLuar = hasKasLuarStr.indexOf("YA") !== -1 || hasKasLuarStr.indexOf("TRUE") !== -1;
    var kasLuarAmount = Number(row[5]) || 0;
    var updatedAt = row[7] ? String(row[7]).trim() : new Date().toISOString();

    if (host) {
      entries.push({
        id: "kas-host-" + host.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        host: host,
        kasOptionType: "manual",
        kasOptionLabel: kasLabel || "Kas Tuan Rumah",
        kasAmount: kasPokok,
        hasKasLuar: hasKasLuar,
        kasLuarAmount: kasLuarAmount,
        updatedAt: updatedAt
      });
    }
  }
  return entries;
}

function readSettingsFromSheet(ss) {
  var defaultSettings = { host: "", datetime: "", defaultAmount: 50000, defaultKasAmount: 5000 };
  var sheet = ss.getSheetByName("Ringkasan & Jadwal");
  if (!sheet) return defaultSettings;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return defaultSettings;

  var data = sheet.getRange(1, 1, lastRow, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][0] || "").trim().toLowerCase();
    var val = data[i][1];
    if (key.indexOf("tuan rumah") !== -1) {
      defaultSettings.host = String(val || "").trim();
    } else if (key.indexOf("waktu") !== -1 || key.indexOf("tanggal") !== -1) {
      defaultSettings.datetime = String(val || "").trim();
    } else if (key.indexOf("standar nominal arisan") !== -1) {
      var num = Number(val);
      if (!isNaN(num) && num > 0) defaultSettings.defaultAmount = num;
    } else if (key.indexOf("standar kas anggota") !== -1) {
      var numKas = Number(val);
      if (!isNaN(numKas) && numKas >= 0) defaultSettings.defaultKasAmount = numKas;
    }
  }
  return defaultSettings;
}

function syncMembersSheet(ss, members) {
  var sheet = ss.getSheetByName("Daftar Anggota") || ss.insertSheet("Daftar Anggota");
  sheet.clear();
  var headers = [["No", "Nama Anggota", "Status", "Terakhir Diperbarui"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setBackground("#064e3b").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  if (members.length === 0) return;
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  var rows = members.map(function(m, idx) { return [idx + 1, m, "Aktif", nowStr]; });
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

function syncRecordsSheet(ss, records) {
  var sheet = ss.getSheetByName("Data Arisan") || ss.insertSheet("Data Arisan");
  sheet.clear();
  var headers = [["No", "Tuan Rumah (Host)", "Nama Anggota", "Nominal Arisan (Rp)", "Nominal Kas (Rp)", "Arisan Bersih (Rp)", "Waktu Transaksi / Pertemuan", "ID Transaksi"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setBackground("#1e293b").setFontColor("#fbbf24").setFontWeight("bold").setHorizontalAlignment("center");
  if (records.length === 0) return;
  var rows = records.map(function(r, idx) {
    var arisan = Number(r.amount) || 0;
    var kas = Number(r.kasAmount) || 0;
    var bersih = Math.max(0, arisan - kas);
    var timeFormatted = r.timestamp ? formatDateString(r.timestamp) : "-";
    return [idx + 1, r.host || "-", r.member || "-", arisan, kas, bersih, timeFormatted, r.id || ("trx-" + (idx + 1))];
  });
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.getRange(2, 4, rows.length, 3).setNumberFormat("#,##0");
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.getRange(2, 7, rows.length, 2).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

function syncHostKasSheet(ss, hostKasEntries) {
  var sheet = ss.getSheetByName("Data Kas Tuan Rumah") || ss.insertSheet("Data Kas Tuan Rumah");
  sheet.clear();
  var headers = [["No", "Tuan Rumah (Host)", "Jenis Opsi Kas", "Nominal Kas Pokok (Rp)", "Ada Kas Luar?", "Nominal Kas Luar (Rp)", "Total Kas Disetor (Rp)", "Keterangan / Waktu Update"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  if (hostKasEntries.length === 0) return;
  var rows = hostKasEntries.map(function(k, idx) {
    var kasPokok = Number(k.kasAmount) || 0;
    var kasLuar = (k.hasKasLuar && Number(k.kasLuarAmount)) ? Number(k.kasLuarAmount) : 0;
    var totalKas = kasPokok + kasLuar;
    var updated = k.updatedAt ? formatDateString(k.updatedAt) : "-";
    return [idx + 1, k.host || "-", k.kasOptionLabel || k.kasOptionType || "-", kasPokok, k.hasKasLuar ? "YA" : "TIDAK", kasLuar, totalKas, updated];
  });
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat("#,##0");
  sheet.getRange(2, 6, rows.length, 2).setNumberFormat("#,##0");
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.getRange(2, 5, rows.length, 1).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

function syncSummarySheet(ss, settings, summary, timestamp) {
  var sheet = ss.getSheetByName("Ringkasan & Jadwal") || ss.insertSheet("Ringkasan & Jadwal");
  sheet.clear();
  var updateTime = timestamp ? formatDateString(timestamp) : Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  var hostNext = (settings && settings.host) ? settings.host : "-";
  var eventTime = (settings && settings.datetime) ? formatDateString(settings.datetime) : "-";
  var defaultArisan = (settings && settings.defaultAmount) ? settings.defaultAmount : 50000;
  var defaultKas = (settings && settings.defaultKasAmount) ? settings.defaultKasAmount : 5000;
  var totalMembers = summary && summary.totalMembers !== undefined ? summary.totalMembers : 0;
  var totalRecords = summary && summary.totalRecords !== undefined ? summary.totalRecords : 0;
  var totalArisan = summary && summary.totalArisan !== undefined ? summary.totalArisan : 0;
  var totalKasHost = summary && summary.totalKasHost !== undefined ? summary.totalKasHost : 0;

  var infoData = [
    ["INFORMASI SISTEM & JADWAL MDS KAUKABUS SYAFAAH", ""],
    ["Terakhir Disinkronkan", updateTime],
    ["Tuan Rumah Berikutnya", hostNext],
    ["Waktu / Tanggal Acara", eventTime],
    ["Standar Nominal Arisan", defaultArisan],
    ["Standar Kas Anggota", defaultKas],
    ["", ""],
    ["RINGKASAN DATABASE", ""],
    ["Total Anggota Terdaftar", totalMembers + " Orang"],
    ["Total Riwayat Transaksi", totalRecords + " Transaksi"],
    ["Total Akumulasi Arisan", totalArisan],
    ["Total Akumulasi Kas Masuk", totalKasHost]
  ];
  sheet.getRange(1, 1, infoData.length, 2).setValues(infoData);
  sheet.getRange(1, 1, 1, 2).setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold");
  sheet.getRange(8, 1, 1, 2).setBackground("#0f172a").setFontColor("#facc15").setFontWeight("bold");
  sheet.getRange(5, 2, 2, 1).setNumberFormat("#,##0");
  sheet.getRange(11, 2, 2, 1).setNumberFormat("#,##0");
  sheet.getRange(1, 1, infoData.length, 1).setFontWeight("bold");
  sheet.autoResizeColumns(1, 2);
}

function saveBackupSnapshot(ss, payload) {
  try {
    var sheet = ss.getSheetByName("_APP_DATA_");
    if (!sheet) {
      sheet = ss.insertSheet("_APP_DATA_");
      sheet.hideSheet();
    }
    sheet.clear();
    sheet.getRange("A1").setValue(JSON.stringify(payload));
  } catch (e) {}
}

function loadBackupSnapshot(ss) {
  try {
    var sheet = ss.getSheetByName("_APP_DATA_");
    if (!sheet) return null;
    var val = sheet.getRange("A1").getValue();
    if (!val) return null;
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

function respond(obj, callback) {
  var jsonStr = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + jsonStr + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatDateString(isoString) {
  try {
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return Utilities.formatDate(d, "Asia/Jakarta", "dd MMM yyyy, HH:mm");
  } catch (e) {
    return isoString;
  }
}
`;



