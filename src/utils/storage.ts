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

export const GOOGLE_APPS_SCRIPT_BACKEND_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) BACKEND
 * MDS KAUKABUS SYAFAAH - SISTEM PEMBUKUAN ARISAN & KAS
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Tidak ada data yang dikirim (Payload kosong).' });
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. SINKRONKAN DAFTAR ANGGOTA
    if (payload.members && Array.isArray(payload.members)) {
      syncMembersSheet(ss, payload.members);
    }

    // 2. SINKRONKAN DATA TRANSAKSI ARISAN
    if (payload.records && Array.isArray(payload.records)) {
      syncRecordsSheet(ss, payload.records);
    }

    // 3. SINKRONKAN DATA KAS TUAN RUMAH / KAS PERTEMUAN
    if (payload.hostKasEntries && Array.isArray(payload.hostKasEntries)) {
      syncHostKasSheet(ss, payload.hostKasEntries);
    }

    // 4. SINKRONKAN RINGKASAN & JADWAL TERBARU
    if (payload.settings || payload.summary) {
      syncSummarySheet(ss, payload.settings, payload.summary, payload.timestamp);
    }

    return responseJSON({
      status: 'success',
      message: 'Semua data (Anggota, Arisan, Kas, & Jadwal) berhasil diperbarui di Google Sheets!',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return responseJSON({
      status: 'error',
      message: 'Gagal memproses data: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetRecords = ss.getSheetByName("Data Arisan");
    var sheetMembers = ss.getSheetByName("Daftar Anggota");
    var sheetKas = ss.getSheetByName("Data Kas Tuan Rumah");

    return responseJSON({
      status: 'online',
      appName: 'MDS Kaukabus Syafaah Backend',
      spreadsheetName: ss.getName(),
      totalMembers: sheetMembers ? Math.max(0, sheetMembers.getLastRow() - 1) : 0,
      totalRecords: sheetRecords ? Math.max(0, sheetRecords.getLastRow() - 1) : 0,
      totalKasEntries: sheetKas ? Math.max(0, sheetKas.getLastRow() - 1) : 0,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function syncMembersSheet(ss, members) {
  var sheet = ss.getSheetByName("Daftar Anggota") || ss.insertSheet("Daftar Anggota");
  sheet.clear();

  var headers = [["No", "Nama Anggota", "Status", "Terakhir Diperbarui"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length)
    .setBackground("#064e3b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  if (members.length === 0) return;
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  var rows = members.map(function(m, idx) {
    return [idx + 1, m, "Aktif", nowStr];
  });

  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

function syncRecordsSheet(ss, records) {
  var sheet = ss.getSheetByName("Data Arisan") || ss.insertSheet("Data Arisan");
  sheet.clear();

  var headers = [[
    "No",
    "Tuan Rumah (Host)",
    "Nama Anggota",
    "Nominal Arisan (Rp)",
    "Nominal Kas (Rp)",
    "Arisan Bersih (Rp)",
    "Waktu Transaksi / Pertemuan",
    "ID Transaksi"
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length)
    .setBackground("#1e293b")
    .setFontColor("#fbbf24")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

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

  var headers = [[
    "No",
    "Tuan Rumah (Host)",
    "Jenis Opsi Kas",
    "Nominal Kas Pokok (Rp)",
    "Ada Kas Luar?",
    "Nominal Kas Luar (Rp)",
    "Total Kas Disetor (Rp)",
    "Keterangan / Waktu Update"
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length)
    .setBackground("#047857")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

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
}`;


