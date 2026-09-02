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


