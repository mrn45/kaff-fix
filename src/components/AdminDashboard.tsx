import React, { useState, useRef, useMemo } from 'react';
import {
  PlusCircle,
  Coins,
  FileEdit,
  Users,
  Database,
  Settings as SettingsIcon,
  Save,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Check,
  AlertTriangle,
  Search,
  Sparkles,
  RefreshCw,
  LogOut,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Volume2,
  Sliders,
  DollarSign,
  Info,
  Lock,
  Unlock,
  ChevronRight,
  CloudUpload,
  CloudDownload,
  Link2,
  Code2,
  CheckCircle,
  ExternalLink,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  ArisanRecord,
  AppSettings,
  AdminTab,
  HostKasEntry,
  HostKasOptionType,
} from '../types';
import {
  formatRupiah,
  exportToCSV,
  exportToImage,
  downloadArisanInputTemplate,
  downloadMembersTemplate,
  parseCSVLine,
  KAS_PRESET_OPTIONS,
  GOOGLE_APPS_SCRIPT_BACKEND_CODE,
  fetchDataFromGoogleAppsScript,
} from '../utils/storage';

interface AdminDashboardProps {
  members: string[];
  records: ArisanRecord[];
  settings: AppSettings;
  hostKasEntries: HostKasEntry[];
  isLiveSyncing?: boolean;
  firebaseConnected?: boolean;
  lastSyncAppsScript?: string | null;
  lastSyncTime?: string | null;
  syncStatus?: 'idle' | 'syncing' | 'online' | 'offline' | 'error';
  isRealtimeEnabled?: boolean;
  onToggleRealtime?: (enabled: boolean) => void;
  onPullFromAppsScript?: (silent?: boolean) => Promise<void>;
  onSyncFirebaseToAppsScript?: () => Promise<void>;
  onUpdateMembers: (newMembers: string[]) => void;
  onUpdateRecords: (newRecords: ArisanRecord[]) => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onUpdateHostKas: (newKas: HostKasEntry[]) => void;
  onLogout: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  records,
  settings,
  hostKasEntries,
  isLiveSyncing = false,
  firebaseConnected = true,
  lastSyncAppsScript,
  lastSyncTime: propLastSyncTime,
  syncStatus = 'idle',
  isRealtimeEnabled = true,
  onToggleRealtime,
  onPullFromAppsScript,
  onSyncFirebaseToAppsScript,
  onUpdateMembers,
  onUpdateRecords,
  onUpdateSettings,
  onUpdateHostKas,
  onLogout,
  onToast,
}) => {


  const [activeTab, setActiveTab] = useState<AdminTab>('input');

  // ==========================================
  // TAB 1: INPUT ARISAN STATE
  // ==========================================
  const [inputHost, setInputHost] = useState(settings.host || (members[0] || ''));
  const [isNotJoiningArisan, setIsNotJoiningArisan] = useState<boolean>(false);
  const [globalNominal, setGlobalNominal] = useState<string>(
    settings.defaultAmount ? String(settings.defaultAmount) : '50000'
  );
  const [inputMemberSearch, setInputMemberSearch] = useState('');
  const [inputAmounts, setInputAmounts] = useState<{ [member: string]: string }>({});
  const inputTemplateFileRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // TAB 2: INPUT KAS STATE
  // ==========================================
  const [kasSelectedHost, setKasSelectedHost] = useState<string>('');
  const [kasFilterStatus, setKasFilterStatus] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [selectedKasOption, setSelectedKasOption] = useState<HostKasOptionType>('kontrol_maghrib');
  const [customKasAmount, setCustomKasAmount] = useState<string>('200000');
  const [enableKasLuar, setEnableKasLuar] = useState<boolean>(false);
  const [kasLuarAmount, setKasLuarAmount] = useState<string>('50000');
  const [kasNotes, setKasNotes] = useState<string>('');

  // ==========================================
  // TAB 3: EDIT STATE
  // ==========================================
  const [editHost, setEditHost] = useState('');
  const [editAmounts, setEditAmounts] = useState<{ [member: string]: string }>({});
  const [isEditLoaded, setIsEditLoaded] = useState(false);

  // ==========================================
  // TAB 4: MEMBERS STATE
  // ==========================================
  const [singleMemberName, setSingleMemberName] = useState('');
  const [bulkMemberText, setBulkMemberText] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const memberTemplateFileRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // TAB 5: DATABASE STATE
  // ==========================================
  const [dbFilterHost, setDbFilterHost] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const exportAreaRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // TAB 6: SETTINGS STATE
  // ==========================================
  const [settingHost, setSettingHost] = useState(settings.host || '');
  const [settingDateTime, setSettingDateTime] = useState(settings.datetime || '');
  const [settingDefaultAmount, setSettingDefaultAmount] = useState(
    settings.defaultAmount ? String(settings.defaultAmount) : '50000'
  );
  const [settingDefaultKasAmount, setSettingDefaultKasAmount] = useState(
    settings.defaultKasAmount ? String(settings.defaultKasAmount) : '5000'
  );
  const [settingGasUrl, setSettingGasUrl] = useState(settings.gasUrl || '');
  const [settingAdminUsername, setSettingAdminUsername] = useState(settings.adminUsername || 'admin');
  const [settingAdminPassword, setSettingAdminPassword] = useState(settings.adminPasswordHash || '51001n!');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showAppsScriptCode, setShowAppsScriptCode] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('mds_last_appscript_sync') || null;
  });

  // -------------------------------------------------------------
  // COMPUTED: Unique hosts from database
  // -------------------------------------------------------------
  const existingRecordedHosts = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.host)));
  }, [records]);

  // Map of total arisan collected per host
  const hostArisanSummary = useMemo(() => {
    const map = new Map<string, { totalArisan: number; count: number; members: string[] }>();
    records.forEach((r) => {
      const prev = map.get(r.host) || { totalArisan: 0, count: 0, members: [] };
      map.set(r.host, {
        totalArisan: prev.totalArisan + (r.amount || 0),
        count: prev.count + 1,
        members: [...prev.members, r.member],
      });
    });
    return map;
  }, [records]);

  // Host Kas configuration map
  const hostKasMap = useMemo(() => {
    const map = new Map<string, HostKasEntry>();
    hostKasEntries.forEach((k) => {
      map.set(k.host.toLowerCase(), k);
    });
    return map;
  }, [hostKasEntries]);

  // Hosts list for KAS tab with statuses
  const hostKasStatusList = useMemo(() => {
    // Combine recorded hosts and all registered members
    const candidateHosts = Array.from(new Set([...existingRecordedHosts, ...members]));
    return candidateHosts.map((h) => {
      const hasRecord = existingRecordedHosts.includes(h);
      const summary = hostArisanSummary.get(h) || { totalArisan: 0, count: 0, members: [] };
      const kasConfig = hostKasMap.get(h.toLowerCase());
      const hasKas = Boolean(kasConfig && (kasConfig.kasAmount > 0 || kasConfig.kasLuarAmount > 0));

      return {
        host: h,
        hasRecord,
        totalArisan: summary.totalArisan,
        memberCount: summary.count,
        hasKas,
        kasConfig,
      };
    });
  }, [existingRecordedHosts, members, hostArisanSummary, hostKasMap]);

  // Filtered hosts for KAS tab
  const unassignedKasCount = useMemo(() => {
    return hostKasStatusList.filter((item) => !item.hasKas).length;
  }, [hostKasStatusList]);

  const assignedKasCount = useMemo(() => {
    return hostKasStatusList.filter((item) => item.hasKas).length;
  }, [hostKasStatusList]);

  const filteredKasHosts = useMemo(() => {
    if (kasFilterStatus === 'unassigned') {
      // Show ALL candidate hosts without kas config (including those who didn't join arisan / arisan Rp 0)
      return hostKasStatusList.filter((item) => !item.hasKas);
    }
    if (kasFilterStatus === 'assigned') {
      return hostKasStatusList.filter((item) => item.hasKas);
    }
    return hostKasStatusList;
  }, [hostKasStatusList, kasFilterStatus]);

  // Automatically select first available host for KAS if none selected
  React.useEffect(() => {
    if (!kasSelectedHost && filteredKasHosts.length > 0) {
      setKasSelectedHost(filteredKasHosts[0].host);
    }
  }, [kasFilterStatus, filteredKasHosts, kasSelectedHost]);

  // When kasSelectedHost changes, load existing kas settings if any
  React.useEffect(() => {
    if (!kasSelectedHost) return;
    const existing = hostKasMap.get(kasSelectedHost.toLowerCase());
    if (existing) {
      setSelectedKasOption(existing.kasOptionType);
      setCustomKasAmount(String(existing.kasAmount));
      setEnableKasLuar(existing.hasKasLuar || false);
      setKasLuarAmount(String(existing.kasLuarAmount || 0));
      setKasNotes(existing.notes || '');
    } else {
      // Default to kontrol maghrib
      setSelectedKasOption('kontrol_maghrib');
      setCustomKasAmount('200000');
      setEnableKasLuar(false);
      setKasLuarAmount('50000');
      setKasNotes('');
    }
  }, [kasSelectedHost, hostKasMap]);

  // -------------------------------------------------------------
  // HANDLERS: TAB 1 (INPUT ARISAN)
  // -------------------------------------------------------------
  const handleApplyGlobalNominal = () => {
    const val = globalNominal.trim();
    if (!val) return;
    const newMap: { [key: string]: string } = {};
    members.forEach((m) => {
      newMap[m] = val;
    });
    setInputAmounts(newMap);
    onToast(`Nominal Arisan ${formatRupiah(Number(val))} diterapkan ke SEMUA (${members.length}) anggota.`, 'info');
  };

  const handleSetMemberAmount = (memberName: string, amount: string) => {
    setInputAmounts((prev) => ({
      ...prev,
      [memberName]: amount,
    }));
  };

  const handleDownloadInputTemplate = () => {
    downloadArisanInputTemplate(
      members,
      inputHost || (members.length > 0 ? members[0] : 'Bpk. H. Ahmad'),
      parseInt(globalNominal, 10) || 50000,
      0
    );
    onToast('Template input arisan (.csv) berhasil diunduh.', 'success');
  };

  const handleUploadInputTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          onToast('File kosong atau tidak terbaca!', 'error');
          return;
        }

        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
          onToast('File tidak memiliki data baris!', 'error');
          return;
        }

        let detectedHost = '';
        const newAmounts: { [member: string]: string } = { ...inputAmounts };
        let filledCount = 0;
        const discoveredNewMembers: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cols = parseCSVLine(line);
          if (cols.length === 0) continue;

          // Skip header line
          const firstColLower = cols[0].toLowerCase();
          const secondColLower = cols[1] ? cols[1].toLowerCase() : '';
          const thirdColLower = cols[2] ? cols[2].toLowerCase() : '';

          if (
            firstColLower.includes('tuan rumah') ||
            firstColLower.includes('nama anggota') ||
            firstColLower.includes('anggota') ||
            firstColLower === 'no' ||
            firstColLower === 'no.' ||
            firstColLower === 'nomor' ||
            firstColLower === 'no urut' ||
            secondColLower.includes('tuan rumah') ||
            secondColLower.includes('nama') ||
            secondColLower.includes('nominal') ||
            thirdColLower.includes('nama')
          ) {
            continue;
          }

          let hostVal = '';
          let memberVal = '';
          let amountVal = '';

          // Check if column 0 is a sequence number (e.g. 1, 2, 3...)
          if (cols.length >= 4 && !isNaN(Number(cols[0].trim()))) {
            // [No, Tuan Rumah, Nama Anggota, Nominal Arisan, (Nominal Kas)]
            hostVal = cols[1].trim();
            memberVal = cols[2].trim();
            amountVal = cols[3].trim();
          } else if (cols.length >= 3) {
            if (!isNaN(Number(cols[0].trim()))) {
              // [No, Nama Anggota, Nominal Arisan]
              memberVal = cols[1].trim();
              amountVal = cols[2].trim();
            } else {
              // [Tuan Rumah, Nama Anggota, Nominal Arisan]
              hostVal = cols[0].trim();
              memberVal = cols[1].trim();
              amountVal = cols[2].trim();
            }
          } else if (cols.length === 2) {
            if (!isNaN(Number(cols[0].trim())) && isNaN(Number(cols[1].trim()))) {
              // [No, Nama Anggota]
              memberVal = cols[1].trim();
              amountVal = globalNominal || '50000';
            } else {
              // [Nama Anggota, Nominal]
              memberVal = cols[0].trim();
              amountVal = cols[1].trim();
            }
          } else if (cols.length === 1) {
            memberVal = cols[0].trim();
            amountVal = globalNominal || '50000';
          }

          // Clean up leading numbers if memberVal contains "1. Pak Ahmad"
          memberVal = memberVal.replace(/^\d+[\.\-\s\)]+/, '').trim();

          if (hostVal && !detectedHost) {
            detectedHost = hostVal;
          }

          const cleanAmount = amountVal.replace(/[^0-9]/g, '');
          
          if (memberVal) {
            const existingMember = members.find(
              (m) => m.toLowerCase() === memberVal.toLowerCase()
            );

            const targetMember = existingMember || memberVal;
            if (!existingMember && !discoveredNewMembers.includes(memberVal)) {
              discoveredNewMembers.push(memberVal);
            }

            if (cleanAmount) {
              newAmounts[targetMember] = cleanAmount;
              filledCount++;
            }
          }
        }

        if (detectedHost && !inputHost) {
          const matchedHost = members.find(
            (m) => m.toLowerCase() === detectedHost.toLowerCase()
          );
          if (matchedHost) {
            setInputHost(matchedHost);
          } else {
            setInputHost(detectedHost);
            if (!discoveredNewMembers.includes(detectedHost)) {
              discoveredNewMembers.push(detectedHost);
            }
          }
        }

        if (discoveredNewMembers.length > 0) {
          const updatedMembers = [...members, ...discoveredNewMembers];
          onUpdateMembers(updatedMembers);
        }

        setInputAmounts(newAmounts);
        onToast(`Berhasil memuat ${filledCount} nominal dari file template!`, 'success');
      } catch (err) {
        onToast('Gagal memproses file template input: ' + String(err), 'error');
      } finally {
        if (e.target) e.target.value = '';
      }
    };

    reader.onerror = () => {
      onToast('Gagal membaca file template!', 'error');
      if (e.target) e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleSaveInput = () => {
    if (!inputHost) {
      onToast('Silakan pilih Tuan Rumah terlebih dahulu!', 'error');
      return;
    }

    // Jika opsi "Tidak Ikut Arisan" dicentang
    if (isNotJoiningArisan) {
      setKasSelectedHost(inputHost);
      setActiveTab('kas');
      onToast(
        `Tuan Rumah ${inputHost} ditandai Tidak Ikut Arisan (Arisan Rp 0). Silakan atur penetapan KAS pada menu KAS di bawah.`,
        'info'
      );
      return;
    }

    const newEntries: ArisanRecord[] = [];
    let sumArisan = 0;

    members.forEach((m) => {
      const amountVal = parseInt(inputAmounts[m] || '0', 10);

      if (amountVal > 0) {
        sumArisan += amountVal;
        newEntries.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          host: inputHost,
          member: m,
          amount: amountVal,
          timestamp: new Date().toISOString(),
        });
      }
    });

    if (newEntries.length === 0) {
      onToast('Belum ada nominal pembayaran arisan yang diisi!', 'error');
      return;
    }

    // Append to existing database
    const updated = [...records, ...newEntries];
    onUpdateRecords(updated);
    setInputAmounts({});
    
    onToast(
      `Berhasil menyimpan ${newEntries.length} data setoran arisan! Total Kotor Tuan Rumah ${inputHost}: ${formatRupiah(sumArisan)}. Silakan lanjut ke menu KAS untuk menentukan potongan kas.`,
      'success'
    );
  };

  // -------------------------------------------------------------
  // HANDLERS: TAB 2 (INPUT KAS)
  // -------------------------------------------------------------
  const getNominalForKasOption = (optionType: HostKasOptionType): number => {
    switch (optionType) {
      case 'kontrol_maghrib':
        return 200000;
      case 'kontrol_ashar':
        return 250000;
      case 'sound_maghrib':
        return 300000;
      case 'sound_ashar':
        return 350000;
      case 'manual':
        return parseInt(customKasAmount.replace(/[^0-9]/g, '') || '0', 10);
      case 'kas_luar':
        return 0; // Kas luar is tracked separately
      default:
        return 0;
    }
  };

  const currentKasDeduction = getNominalForKasOption(selectedKasOption);
  const currentKasLuarNominal = enableKasLuar
    ? parseInt(kasLuarAmount.replace(/[^0-9]/g, '') || '0', 10)
    : 0;

  const currentHostStats = useMemo(() => {
    if (!kasSelectedHost) return { totalArisan: 0, count: 0 };
    return hostArisanSummary.get(kasSelectedHost) || { totalArisan: 0, count: 0 };
  }, [kasSelectedHost, hostArisanSummary]);

  const currentNetHostReceived = Math.max(0, currentHostStats.totalArisan - currentKasDeduction);
  const currentTotalKasToMDS = currentKasDeduction + currentKasLuarNominal;

  const handleSaveKas = () => {
    if (!kasSelectedHost) {
      onToast('Pilih Tuan Rumah untuk input KAS!', 'error');
      return;
    }

    const optionPreset = KAS_PRESET_OPTIONS.find((p) => p.type === selectedKasOption);
    const label = optionPreset ? optionPreset.label : 'KAS Manual';

    const newEntry: HostKasEntry = {
      id: `kas-${Date.now()}-${kasSelectedHost.replace(/[^a-zA-Z0-9]/g, '')}`,
      host: kasSelectedHost,
      kasOptionType: selectedKasOption,
      kasOptionLabel: label,
      kasAmount: currentKasDeduction,
      hasKasLuar: enableKasLuar,
      kasLuarAmount: currentKasLuarNominal,
      notes: kasNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    // Filter out previous kas entry for this host
    const filtered = hostKasEntries.filter(
      (k) => k.host.toLowerCase() !== kasSelectedHost.toLowerCase()
    );
    const updatedKasList = [...filtered, newEntry];

    onUpdateHostKas(updatedKasList);

    onToast(
      `KAS Tuan Rumah ${kasSelectedHost} berhasil disimpan! Potongan Kas: ${formatRupiah(currentKasDeduction)}, Bersih Tuan Rumah: ${formatRupiah(currentNetHostReceived)}`,
      'success'
    );
  };

  // -------------------------------------------------------------
  // HANDLERS: TAB 3 (EDIT)
  // -------------------------------------------------------------
  const handleLoadEditData = () => {
    if (!editHost) {
      onToast('Pilih Tuan Rumah yang ingin diedit!', 'error');
      return;
    }

    const hostEntries = records.filter(
      (r) => r.host.toLowerCase() === editHost.toLowerCase()
    );

    const amountsMap: { [key: string]: string } = {};

    members.forEach((m) => {
      const entry = hostEntries.find(
        (e) => e.member.toLowerCase() === m.toLowerCase()
      );
      if (entry) {
        amountsMap[m] = entry.amount > 0 ? String(entry.amount) : '';
      } else {
        amountsMap[m] = '';
      }
    });

    setEditAmounts(amountsMap);
    setIsEditLoaded(true);
    onToast(`Data Arisan Tuan Rumah ${editHost} berhasil dimuat.`, 'info');
  };

  const handleSaveEdit = () => {
    if (!editHost) return;

    // Filter out previous records for this host
    const preservedRecords = records.filter(
      (r) => r.host.toLowerCase() !== editHost.toLowerCase()
    );

    const updatedEntries: ArisanRecord[] = [];
    let sumArisan = 0;

    members.forEach((m) => {
      const amountVal = parseInt(editAmounts[m] || '0', 10);

      if (amountVal > 0) {
        sumArisan += amountVal;
        updatedEntries.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          host: editHost,
          member: m,
          amount: amountVal,
          timestamp: new Date().toISOString(),
        });
      }
    });

    const finalRecords = [...preservedRecords, ...updatedEntries];
    onUpdateRecords(finalRecords);
    onToast(`Data Tuan Rumah ${editHost} berhasil diperbarui! Total Kotor: ${formatRupiah(sumArisan)}`, 'success');
  };

  // -------------------------------------------------------------
  // HANDLERS: TAB 4 (MEMBERS)
  // -------------------------------------------------------------
  const handleDownloadMembersTemplate = () => {
    downloadMembersTemplate(members);
    onToast('Template daftar anggota (.csv) berhasil diunduh.', 'success');
  };

  const handleUploadMembersTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          onToast('File kosong atau tidak terbaca!', 'error');
          return;
        }

        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
          onToast('File tidak memiliki data anggota!', 'error');
          return;
        }

        const existingLower = new Set(members.map((m) => m.toLowerCase()));
        const newNames: string[] = [];

        lines.forEach((line) => {
          const cols = parseCSVLine(line);
          if (cols.length === 0) return;

          const col0Lower = cols[0].toLowerCase();
          const col1Lower = cols[1] ? cols[1].toLowerCase() : '';

          if (
            col0Lower.includes('nama anggota') ||
            col0Lower === 'nama' ||
            col0Lower === 'name' ||
            col0Lower === 'no' ||
            col0Lower === 'nomor' ||
            col0Lower === 'no.' ||
            col0Lower === 'no urut' ||
            col1Lower.includes('nama') ||
            col1Lower.includes('name')
          ) {
            return;
          }

          let candidate = '';
          // If first column is sequence number and second column is name
          if (cols.length >= 2 && !isNaN(Number(cols[0].trim())) && cols[1].trim()) {
            candidate = cols[1].trim();
          } else {
            for (const col of cols) {
              const trimmed = col.trim();
              if (trimmed && isNaN(Number(trimmed))) {
                candidate = trimmed;
                break;
              }
            }
          }

          if (!candidate && cols[0]) {
            candidate = cols[0].trim();
          }

          // Strip any prefix like "1. ", "1 - ", "1) "
          candidate = candidate.replace(/^\d+[\.\-\s\)]+/, '').trim();

          if (candidate.length > 0 && !existingLower.has(candidate.toLowerCase())) {
            existingLower.add(candidate.toLowerCase());
            newNames.push(candidate);
          }
        });

        if (newNames.length === 0) {
          onToast('Semua nama anggota dalam file sudah terdaftar!', 'info');
          return;
        }

        const updated = [...members, ...newNames];
        onUpdateMembers(updated);
        onToast(`Berhasil menambahkan ${newNames.length} anggota baru dari file template!`, 'success');
      } catch (err) {
        onToast('Gagal memproses file template anggota: ' + String(err), 'error');
      } finally {
        if (e.target) e.target.value = '';
      }
    };

    reader.onerror = () => {
      onToast('Gagal membaca file!', 'error');
      if (e.target) e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleAddSingleMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = singleMemberName.trim();
    if (!cleanName) return;

    if (members.some((m) => m.toLowerCase() === cleanName.toLowerCase())) {
      onToast(`Anggota '${cleanName}' sudah ada di daftar!`, 'error');
      return;
    }

    const updated = [...members, cleanName];
    onUpdateMembers(updated);
    setSingleMemberName('');
    onToast(`Anggota '${cleanName}' berhasil ditambahkan.`, 'success');
  };

  const handleAddBulkMembers = () => {
    if (!bulkMemberText.trim()) return;

    const lines = bulkMemberText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const existingLower = new Set(members.map((m) => m.toLowerCase()));
    const newValidNames: string[] = [];

    lines.forEach((line) => {
      if (!existingLower.has(line.toLowerCase())) {
        existingLower.add(line.toLowerCase());
        newValidNames.push(line);
      }
    });

    if (newValidNames.length === 0) {
      onToast('Semua nama yang dimasukkan sudah terdaftar!', 'info');
      return;
    }

    const updated = [...members, ...newValidNames];
    onUpdateMembers(updated);
    setBulkMemberText('');
    onToast(`Berhasil menambahkan ${newValidNames.length} anggota baru!`, 'success');
  };

  const handleDeleteMember = (memberName: string) => {
    if (window.confirm(`Hapus anggota '${memberName}' dari daftar?`)) {
      const updated = members.filter((m) => m !== memberName);
      onUpdateMembers(updated);
      onToast(`Anggota '${memberName}' telah dihapus.`, 'info');
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: TAB 5 (DATABASE)
  // -------------------------------------------------------------
  const filteredDbRecords =
    dbFilterHost === 'ALL'
      ? records
      : records.filter((r) => r.host.toLowerCase() === dbFilterHost.toLowerCase());

  const totalDbArisan = filteredDbRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleClearDatabase = () => {
    onUpdateRecords([]);
    setShowClearModal(false);
    onToast('Seluruh database arisan berhasil dikosongkan.', 'info');
  };

  const handleExport = async (type: 'csv' | 'pdf' | 'jpg') => {
    if (filteredDbRecords.length === 0) {
      onToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    if (type === 'csv') {
      exportToCSV(records, dbFilterHost);
      onToast('Laporan CSV berhasil diunduh.', 'success');
      return;
    }

    if (!exportAreaRef.current) return;

    setIsExporting(true);
    onToast(`Menyiapkan file ${type.toUpperCase()}...`, 'info');

    try {
      await exportToImage(
        exportAreaRef.current,
        `Laporan_Arisan_MDS_${dbFilterHost === 'ALL' ? 'Semua' : dbFilterHost}_${Date.now()}`,
        type
      );
      onToast(`File ${type.toUpperCase()} berhasil diunduh.`, 'success');
    } catch (err) {
      onToast('Gagal mengekspor laporan: ' + String(err), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: TAB 6 (SETTINGS) & GOOGLE APPS SCRIPT SYNC
  // -------------------------------------------------------------
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: AppSettings = {
      ...settings,
      host: settingHost.trim(),
      datetime: settingDateTime,
      defaultAmount: parseInt(settingDefaultAmount, 10) || 50000,
      defaultKasAmount: parseInt(settingDefaultKasAmount, 10) || 5000,
      gasUrl: settingGasUrl.trim(),
      adminUsername: settingAdminUsername.trim() || 'admin',
      adminPasswordHash: settingAdminPassword.trim() || '51001n!',
    };

    onUpdateSettings(updatedSettings);
    onToast('Pengaturan jadwal, akun pengurus, & link Apps Script berhasil disimpan!', 'success');
  };

  const handleSyncToAppsScript = async () => {
    const targetUrl = settingGasUrl.trim();
    if (!targetUrl) {
      onToast('Silakan masukkan Link Web App Google Apps Script terlebih dahulu!', 'error');
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      onToast('Format Link Apps Script tidak valid! URL harus diawali dengan https://', 'error');
      return;
    }

    setIsSyncing(true);
    onToast('Sedang mengirim & menyinkronkan data ke Google Apps Script...', 'info');

    const updatedSettings: AppSettings = {
      ...settings,
      host: settingHost.trim(),
      datetime: settingDateTime,
      defaultAmount: parseInt(settingDefaultAmount, 10) || 50000,
      defaultKasAmount: parseInt(settingDefaultKasAmount, 10) || 5000,
      gasUrl: targetUrl,
      adminUsername: settingAdminUsername.trim() || 'admin',
      adminPasswordHash: settingAdminPassword.trim() || '51001n!',
    };

    // Save settings if changed
    onUpdateSettings(updatedSettings);

    if (onSyncFirebaseToAppsScript) {
      try {
        await onSyncFirebaseToAppsScript();
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    const payload = {
      action: 'SYNC_ALL_DATA',
      source: 'MDS_KAUKABUS_SYAFAAH_APP',
      timestamp: new Date().toISOString(),
      settings: updatedSettings,
      members,
      records,
      hostKasEntries,
      summary: {
        totalMembers: members.length,
        totalRecords: records.length,
        totalArisan: records.reduce((acc, curr) => acc + (curr.amount || 0), 0),
        totalKasHost: hostKasEntries.reduce(
          (acc, curr) => acc + (curr.kasAmount || 0) + (curr.kasLuarAmount || 0),
          0
        ),
        uniqueRecordedHosts: Array.from(new Set(records.map((r) => r.host))),
      },
    };

    try {
      // Send with text/plain header to avoid CORS preflight options blocking on Google Apps Script
      await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const nowStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      setLastSyncTime(nowStr);
      localStorage.setItem('mds_last_appscript_sync', nowStr);
      onToast('Data aplikasi berhasil disinkronkan ke Google Apps Script!', 'success');
    } catch (err) {
      console.warn('Apps Script sync response notice:', err);
      // Browser cross-origin redirects from Google Apps Script can throw a fetch error while the script executed successfully
      const nowStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      setLastSyncTime(nowStr);
      localStorage.setItem('mds_last_appscript_sync', nowStr);
      onToast('Data telah dikirimkan ke Google Apps Script.', 'success');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromAppsScript = async () => {
    const targetUrl = settingGasUrl.trim();
    if (!targetUrl) {
      onToast('Silakan masukkan Link Web App Google Apps Script terlebih dahulu!', 'error');
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      onToast('Format Link Apps Script tidak valid! URL harus diawali dengan https://', 'error');
      return;
    }

    if (onPullFromAppsScript) {
      await onPullFromAppsScript(false);
      return;
    }

    setIsSyncing(true);
    onToast('Sedang mengambil data terbaru dari Google Sheets...', 'info');

    try {
      const data = await fetchDataFromGoogleAppsScript(targetUrl);
      if (data && data.status === 'success') {
        if (data.members && data.members.length > 0) onUpdateMembers(data.members);
        if (data.records) onUpdateRecords(data.records);
        if (data.hostKasEntries) onUpdateHostKas(data.hostKasEntries);
        if (data.settings) {
          const updated: AppSettings = {
            ...settings,
            host: data.settings.host || settings.host,
            datetime: data.settings.datetime || settings.datetime,
            defaultAmount: data.settings.defaultAmount || settings.defaultAmount,
            defaultKasAmount: data.settings.defaultKasAmount || settings.defaultKasAmount,
            gasUrl: targetUrl,
          };
          onUpdateSettings(updated);
        }
        const nowStr = new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        setLastSyncTime(nowStr);
        onToast(
          `Berhasil mengambil data: ${data.members?.length || 0} anggota, ${data.records?.length || 0} transaksi, ${data.hostKasEntries?.length || 0} kas!`,
          'success'
        );
      } else {
        onToast('Respon dari Google Apps Script tidak valid.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Gagal mengambil data dari Google Sheets: ${msg}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };


  // Filtered members for Tab 1
  const displayedInputMembers = useMemo(() => {
    if (!inputMemberSearch.trim()) return members;
    return members.filter((m) =>
      m.toLowerCase().includes(inputMemberSearch.toLowerCase())
    );
  }, [members, inputMemberSearch]);

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Top Bar with Logout / Status */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shadow-2xs overflow-hidden shrink-0">
            <img
              src="https://i.ibb.co.com/HTbvMQd6/kaukabus-Syafaah.png"
              alt="kaukabus Syafaah"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">
                Dashboard Pengurus
              </h3>
              <span
                title="Penyimpanan otomatis ke cloud Firebase Firestore aktif"
                className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Firebase DB</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500">MDS Kaukabus Syafaah • Auto-Save Cloud</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSyncFirebaseToAppsScript && (
            <button
              type="button"
              id="btn-admin-header-sync-gas"
              onClick={onSyncFirebaseToAppsScript}
              disabled={isLiveSyncing || isSyncing}
              title="Kirim dan sinkronkan data Firebase ke Google Apps Script (Sheets)"
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Send className={`w-3 h-3 ${isLiveSyncing ? 'animate-bounce text-emerald-600' : 'text-emerald-700'}`} />
              <span className="hidden sm:inline">Singkron ke Sheets</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>


      {/* Main Tab Content Panel */}
      <div className="relative flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-slate-200 rounded-2xl shadow-sm mb-2">
        {/* ========================================================= */}
        {/* TAB 1: INPUT ARISAN (SEMUA ANGGOTA TAMPIL JELAS & MINIMAL SCROLL) */}
        {/* ========================================================= */}
        {activeTab === 'input' && (
          <div id="admin-tab-input" className="flex flex-col h-full overflow-hidden">
            {/* Header Form Controls - Compact */}
            <div className="p-2 sm:p-3 border-b border-slate-100 bg-slate-50/90 shrink-0 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Tuan Rumah
                    </label>
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {members.length} Anggota
                    </span>
                  </div>
                  <select
                    id="admin-input-host"
                    value={inputHost}
                    onChange={(e) => setInputHost(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Pilih Tuan Rumah --</option>
                    {members.map((m) => (
                      <option key={`input-host-${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                    Cari Anggota
                  </label>
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inputMemberSearch}
                      onChange={(e) => setInputMemberSearch(e.target.value)}
                      placeholder="Ketik nama anggota..."
                      disabled={isNotJoiningArisan}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox "Tidak Ikut Arisan" & Action Bar */}
              <div className="pt-1.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 transition-colors shadow-2xs">
                  <input
                    type="checkbox"
                    id="checkbox-tidak-ikut-arisan"
                    checked={isNotJoiningArisan}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsNotJoiningArisan(checked);
                      if (checked) {
                        onToast('Mode Tidak Ikut Arisan aktif: Input manual dikunci. Kas tetap dapat diinput pada menu KAS.', 'info');
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      {isNotJoiningArisan ? (
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Tidak Ikut Arisan</span>
                    </span>
                    {isNotJoiningArisan && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                        🔒 Input Terkunci
                      </span>
                    )}
                  </div>
                </label>

                <div className="flex items-center justify-end gap-1.5">
                  <input
                    ref={inputTemplateFileRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleUploadInputTemplate}
                    disabled={isNotJoiningArisan}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleDownloadInputTemplate}
                    disabled={isNotJoiningArisan}
                    className="bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-200 py-1 px-2.5 rounded-lg text-[9px] font-bold shadow-2xs transition-all flex items-center gap-1"
                  >
                    <Download className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => inputTemplateFileRef.current?.click()}
                    disabled={isNotJoiningArisan}
                    className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white border border-slate-800 py-1 px-2.5 rounded-lg text-[9px] font-bold shadow-2xs transition-all flex items-center gap-1"
                  >
                    <Upload className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                    <span>Upload CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Banner when "Tidak Ikut Arisan" is checked */}
            {isNotJoiningArisan && (
              <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-[11px] font-bold leading-tight">
                    Opsi <strong>Tidak Ikut Arisan</strong> aktif. Input nominal manual dikunci (Rp 0). Anda tetap dapat mengisi KAS pada <strong>Menu KAS</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (inputHost) setKasSelectedHost(inputHost);
                    setActiveTab('kas');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1 shrink-0"
                >
                  <Coins className="w-3 h-3" />
                  <span>Buka Menu KAS</span>
                </button>
              </div>
            )}

            {/* List All Members - High Density Grid for Minimal Scroll on Mobile & PC */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 sm:p-2.5 md:p-3 bg-slate-50/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {displayedInputMembers.length === 0 ? (
                  <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Belum ada daftar anggota terdaftar</p>
                    <p className="text-[11px] text-slate-400">
                      Silakan buka tab <strong>Anggota</strong> untuk menambahkan nama anggota secara manual atau impor dari file CSV.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('members')}
                      className="mt-2 inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Buka Tab Anggota</span>
                    </button>
                  </div>
                ) : (
                  displayedInputMembers.map((m, idx) => {
                  const currentVal = isNotJoiningArisan ? '' : inputAmounts[m] || '';
                  const numVal = parseInt(currentVal, 10) || 0;
                  const isFilled = numVal > 0;

                  return (
                    <div
                      key={`input-member-row-${m}`}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 transition-all ${
                        isNotJoiningArisan
                          ? 'border-slate-200 bg-slate-100/70 opacity-60'
                          : isFilled
                          ? 'border-emerald-400 bg-emerald-50/40 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className={`w-5 h-5 rounded-md font-black text-[9px] flex items-center justify-center shrink-0 ${
                            isNotJoiningArisan
                              ? 'bg-slate-300 text-slate-700'
                              : isFilled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span
                          className={`text-xs font-bold truncate ${
                            isNotJoiningArisan
                              ? 'text-slate-500 line-through'
                              : isFilled
                              ? 'text-emerald-950'
                              : 'text-slate-800'
                          }`}
                          title={m}
                        >
                          {m}
                        </span>
                      </div>

                      {/* Controls: Quick Chips + Input + Clear */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Quick 50rb chip */}
                        <button
                          type="button"
                          disabled={isNotJoiningArisan}
                          onClick={() => handleSetMemberAmount(m, '50000')}
                          className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 text-emerald-800 border border-emerald-200 text-[9px] font-bold py-0.5 px-1.5 rounded-md transition-colors"
                          title="Set Rp 50.000"
                        >
                          50rb
                        </button>

                        {/* Quick 100rb chip */}
                        <button
                          type="button"
                          disabled={isNotJoiningArisan}
                          onClick={() => handleSetMemberAmount(m, '100000')}
                          className="bg-teal-50 hover:bg-teal-100 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 text-teal-800 border border-teal-200 text-[9px] font-bold py-0.5 px-1.5 rounded-md transition-colors"
                          title="Set Rp 100.000"
                        >
                          100rb
                        </button>

                        {/* Nominal Input Field */}
                        <div
                          className={`relative w-22 sm:w-26 border rounded-lg overflow-hidden transition-colors ${
                            isNotJoiningArisan
                              ? 'bg-slate-200/80 border-slate-300 cursor-not-allowed'
                              : 'bg-slate-50 border-slate-300 focus-within:border-emerald-500 focus-within:bg-white'
                          }`}
                        >
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">
                            {isNotJoiningArisan ? '🔒' : 'Rp'}
                          </span>
                          <input
                            type="number"
                            value={currentVal}
                            disabled={isNotJoiningArisan}
                            onChange={(e) => handleSetMemberAmount(m, e.target.value)}
                            placeholder={isNotJoiningArisan ? 'Terkunci' : '0'}
                            className="w-full bg-transparent py-0.5 pl-6 pr-1.5 text-xs font-black text-right text-emerald-800 disabled:text-slate-400 disabled:cursor-not-allowed outline-none"
                          />
                        </div>

                        {/* Clear button */}
                        {!isNotJoiningArisan && isFilled && (
                          <button
                            type="button"
                            onClick={() => handleSetMemberAmount(m, '')}
                            className="w-5 h-5 flex items-center justify-center rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold transition-colors"
                            title="Hapus / Kosongkan"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>

            {/* Input Live Summary & Save - Compact */}
            <div className="p-2 sm:p-3 border-t border-slate-200 bg-white shrink-0 shadow-lg space-y-1.5">
              {(() => {
                if (isNotJoiningArisan) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Mode Tidak Ikut Arisan (Arisan Rp 0)</span>
                      </div>
                      <span className="text-amber-800 text-[11px] font-black">
                        Kas dapat diisi di Menu KAS
                      </span>
                    </div>
                  );
                }

                let liveArisan = 0;
                let filledCount = 0;
                members.forEach((m) => {
                  const a = parseInt(inputAmounts[m] || '0', 10);
                  if (a > 0) {
                    liveArisan += a;
                    filledCount++;
                  }
                });

                return (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-600">
                      <span>Terisi: </span>
                      <strong className="text-slate-900 font-extrabold">
                        {filledCount}/{members.length}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <span className="text-slate-600 font-semibold text-[11px]">Total:</span>
                      <span className="text-emerald-700 text-sm font-black">
                        {formatRupiah(liveArisan)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                id="btn-save-input-arisan"
                onClick={handleSaveInput}
                className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex justify-center items-center gap-1.5 active:scale-[0.98] ${
                  isNotJoiningArisan
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isNotJoiningArisan ? (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Simpan (Tidak Ikut Arisan) & Atur KAS</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Setoran Arisan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MENU KHUSUS KAS (DENGAN 6 PILIHAN OPSI KAS) */}
        {/* ========================================================= */}
        {activeTab === 'kas' && (
          <div id="admin-tab-kas" className="flex flex-col h-full overflow-hidden">
            {/* Top Selector & Status Filter */}
            <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>Penetapan KAS Tuan Rumah</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Tentukan potongan KAS pertemuan dan KAS Luar
                  </p>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setKasFilterStatus('unassigned')}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    kasFilterStatus === 'unassigned'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Belum Input KAS ({unassignedKasCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKasFilterStatus('assigned')}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    kasFilterStatus === 'assigned'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Sudah Ada KAS ({assignedKasCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKasFilterStatus('all')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    kasFilterStatus === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({hostKasStatusList.length})
                </button>
              </div>

              {/* Tuan Rumah Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Pilih Tuan Rumah
                </label>
                <select
                  id="admin-kas-host"
                  value={kasSelectedHost}
                  onChange={(e) => setKasSelectedHost(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="">-- Pilih Tuan Rumah --</option>
                  {filteredKasHosts.map((item) => (
                    <option key={`kas-host-opt-${item.host}`} value={item.host}>
                      {item.host} {item.hasRecord ? `(Arisan: ${formatRupiah(item.totalArisan)})` : '(Arisan: Rp 0 / Bebas)'} {item.hasKas ? '✅ [KAS Ada]' : '🔴 [Belum KAS]'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Options & Calculations */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-100/40">
              {kasSelectedHost ? (
                <>
                  {/* Host Info Box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Tuan Rumah Terpilih
                      </span>
                      {currentHostStats.count > 0 ? (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {currentHostStats.count} Anggota Setor
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Arisan Rp 0 / Tidak Ikut
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-800">
                        {kasSelectedHost}
                      </h3>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Total Arisan Kotor:</span>
                        <strong className="text-xs font-black text-emerald-700">
                          {formatRupiah(currentHostStats.totalArisan)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 6 OPSI KAS CHECKLIST / SELECTION */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                        Pilih Opsi KAS Pertemuan
                      </h4>
                      <span className="text-[9px] text-slate-400">Pilih salah satu (1-5)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      {/* 1. KAS + Kontrol (Maghrib) */}
                      <label
                        onClick={() => setSelectedKasOption('kontrol_maghrib')}
                        className={`cursor-pointer rounded-2xl p-3 border transition-all flex items-center justify-between ${
                          selectedKasOption === 'kontrol_maghrib'
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="kasOption"
                            checked={selectedKasOption === 'kontrol_maghrib'}
                            onChange={() => setSelectedKasOption('kontrol_maghrib')}
                            className="accent-emerald-600 w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              1. KAS + Kontrol (Maghrib)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Mengurangi arisan tuan rumah
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl">
                          Rp 200.000
                        </span>
                      </label>

                      {/* 2. KAS + Kontrol (Ashar) */}
                      <label
                        onClick={() => setSelectedKasOption('kontrol_ashar')}
                        className={`cursor-pointer rounded-2xl p-3 border transition-all flex items-center justify-between ${
                          selectedKasOption === 'kontrol_ashar'
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="kasOption"
                            checked={selectedKasOption === 'kontrol_ashar'}
                            onChange={() => setSelectedKasOption('kontrol_ashar')}
                            className="accent-emerald-600 w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              2. KAS + Kontrol (Ashar)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Mengurangi arisan tuan rumah
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl">
                          Rp 250.000
                        </span>
                      </label>

                      {/* 3. KAS + Sound (Maghrib) */}
                      <label
                        onClick={() => setSelectedKasOption('sound_maghrib')}
                        className={`cursor-pointer rounded-2xl p-3 border transition-all flex items-center justify-between ${
                          selectedKasOption === 'sound_maghrib'
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="kasOption"
                            checked={selectedKasOption === 'sound_maghrib'}
                            onChange={() => setSelectedKasOption('sound_maghrib')}
                            className="accent-emerald-600 w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              3. KAS + Sound (Maghrib)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Mengurangi arisan tuan rumah
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl">
                          Rp 300.000
                        </span>
                      </label>

                      {/* 4. KAS + Sound (Ashar) */}
                      <label
                        onClick={() => setSelectedKasOption('sound_ashar')}
                        className={`cursor-pointer rounded-2xl p-3 border transition-all flex items-center justify-between ${
                          selectedKasOption === 'sound_ashar'
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="kasOption"
                            checked={selectedKasOption === 'sound_ashar'}
                            onChange={() => setSelectedKasOption('sound_ashar')}
                            className="accent-emerald-600 w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              4. KAS + Sound (Ashar)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Mengurangi arisan tuan rumah
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl">
                          Rp 350.000
                        </span>
                      </label>

                      {/* 5. KAS Manual */}
                      <label
                        onClick={() => setSelectedKasOption('manual')}
                        className={`cursor-pointer rounded-2xl p-3 border transition-all space-y-2 ${
                          selectedKasOption === 'manual'
                            ? 'bg-amber-50/90 border-amber-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="kasOption"
                              checked={selectedKasOption === 'manual'}
                              onChange={() => setSelectedKasOption('manual')}
                              className="accent-amber-600 w-4 h-4"
                            />
                            <div>
                              <p className="font-bold text-xs text-slate-800">
                                5. KAS Manual (Input Bebas)
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Mengurangi arisan tuan rumah
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            Kustom
                          </span>
                        </div>

                        {selectedKasOption === 'manual' && (
                          <div className="pt-2 border-t border-amber-200/80">
                            <div className="relative bg-white border border-amber-300 rounded-xl overflow-hidden">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700">
                                Rp
                              </span>
                              <input
                                type="number"
                                value={customKasAmount}
                                onChange={(e) => setCustomKasAmount(e.target.value)}
                                placeholder="Masukkan nominal kas..."
                                className="w-full pl-10 pr-3 py-2 text-xs font-black text-right text-slate-800 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </label>

                      {/* 6. KAS Luar (Checkbox Tambahan - TIDAK Mengurangi Arisan) */}
                      <div
                        className={`rounded-2xl p-3 border transition-all space-y-2 ${
                          enableKasLuar
                            ? 'bg-teal-50/90 border-teal-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <label className="cursor-pointer flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={enableKasLuar}
                              onChange={(e) => setEnableKasLuar(e.target.checked)}
                              className="accent-teal-600 w-4 h-4 rounded"
                            />
                            <div>
                              <p className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <span>6. Tambah KAS Luar / Sumbangan</span>
                                <span className="text-[9px] font-extrabold bg-teal-200/80 text-teal-900 px-1.5 py-0.2 rounded">
                                  TIDAK Potong Arisan
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Input manual & nominalnya TIDAK mengurangi arisan tuan rumah
                              </p>
                            </div>
                          </div>
                        </label>

                        {enableKasLuar && (
                          <div className="pt-2 border-t border-teal-200/80">
                            <div className="relative bg-white border border-teal-300 rounded-xl overflow-hidden">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700">
                                Rp
                              </span>
                              <input
                                type="number"
                                value={kasLuarAmount}
                                onChange={(e) => setKasLuarAmount(e.target.value)}
                                placeholder="Masukkan nominal kas luar..."
                                className="w-full pl-10 pr-3 py-2 text-xs font-black text-right text-teal-900 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Catatan Tambahan (Opsional) */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                      Catatan / Keterangan KAS (Opsional)
                    </label>
                    <input
                      type="text"
                      value={kasNotes}
                      onChange={(e) => setKasNotes(e.target.value)}
                      placeholder="Contoh: Soundman Pak Joko / Kontrol Rutin Maghrib..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <Coins className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">Pilih Tuan Rumah di atas</p>
                  <p className="text-[11px] text-slate-400">
                    Pilih Tuan Rumah yang sudah diinput arisannya untuk menetapkan KAS.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Live Calculation & Save Button */}
            {kasSelectedHost && (
              <div className="p-3 border-t border-slate-200 bg-white shrink-0 shadow-lg space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span>Total Arisan (Kotor):</span>
                    <strong className="text-slate-800">{formatRupiah(currentHostStats.totalArisan)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span>Potongan KAS Pertemuan:</span>
                      <span className="text-[9px] bg-rose-100 text-rose-700 px-1 rounded">Memotong</span>
                    </span>
                    <strong className="text-rose-600">- {formatRupiah(currentKasDeduction)}</strong>
                  </div>

                  {enableKasLuar && (
                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                      <span className="flex items-center gap-1">
                        <span>KAS Luar / Tambahan:</span>
                        <span className="text-[9px] bg-teal-100 text-teal-800 px-1 rounded">Tidak Potong</span>
                      </span>
                      <strong className="text-teal-700">+ {formatRupiah(currentKasLuarNominal)}</strong>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-black text-xs">
                    <span className="text-slate-800">Bersih Diterima Tuan Rumah:</span>
                    <span className="text-emerald-700 text-sm font-black">
                      {formatRupiah(currentNetHostReceived)}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-teal-800">
                    <span>Total Uang Masuk Kas MDS:</span>
                    <span>{formatRupiah(currentTotalKasToMDS)}</span>
                  </div>
                </div>

                <button
                  id="btn-save-kas-host"
                  onClick={handleSaveKas}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all flex justify-center items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan KAS Tuan Rumah</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EDIT ARISAN */}
        {/* ========================================================= */}
        {activeTab === 'edit' && (
          <div id="admin-tab-edit" className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5 uppercase tracking-wide">
                Pilih Tuan Rumah yg akan diedit
              </label>
              <div className="flex gap-2">
                <select
                  id="admin-edit-host"
                  value={editHost}
                  onChange={(e) => {
                    setEditHost(e.target.value);
                    setIsEditLoaded(false);
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-emerald-800 focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  <option value="">-- Pilih Tuan Rumah --</option>
                  {members.map((m) => (
                    <option key={`edit-host-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLoadEditData}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Muat Data</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 sm:p-3.5 bg-slate-50/30">
              {isEditLoaded ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((m, idx) => {
                    const arisanNum = parseInt(editAmounts[m] || '0', 10);

                    return (
                      <div
                        key={`edit-member-${m}`}
                        className="bg-white p-2.5 sm:p-3 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2 hover:border-amber-400 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                              {m}
                            </span>
                          </div>
                          {arisanNum > 0 && (
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                              {formatRupiah(arisanNum)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center bg-amber-50/40 border border-amber-200 rounded-xl overflow-hidden">
                          <span className="text-[9px] font-bold text-amber-800 px-2 py-1.5 bg-amber-100/70 border-r border-amber-200 shrink-0">
                            Nominal Arisan
                          </span>
                          <input
                            type="number"
                            value={editAmounts[m] || ''}
                            onChange={(e) =>
                              setEditAmounts({ ...editAmounts, [m]: e.target.value })
                            }
                            placeholder="0"
                            className="w-full bg-transparent py-1.5 px-2 text-xs font-bold text-right outline-none text-amber-950"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <FileEdit className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">Pilih Tuan Rumah dan Klik "Muat Data"</p>
                  <p className="text-[11px] text-slate-400">
                    Sistem akan memuat data setoran arisan untuk diedit ulang.
                  </p>
                </div>
              )}
            </div>

            {isEditLoaded && (
              <div className="p-3 border-t border-slate-200 bg-white shrink-0 shadow-lg space-y-2">
                {(() => {
                  let editArisanSum = 0;
                  members.forEach((m) => {
                    editArisanSum += parseInt(editAmounts[m] || '0', 10);
                  });

                  return (
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between font-black text-xs text-slate-900">
                      <span>Total Arisan Kotor:</span>
                      <span className="text-amber-800 text-sm font-black">
                        {formatRupiah(editArisanSum)}
                      </span>
                    </div>
                  );
                })()}

                <button
                  id="btn-save-edit-arisan"
                  onClick={handleSaveEdit}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all flex justify-center items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Perbarui Data Tuan Rumah</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: KELOLA ANGGOTA */}
        {/* ========================================================= */}
        {activeTab === 'members' && (
          <div id="admin-tab-members" className="flex flex-col h-full bg-slate-50/50">
            <div className="p-3 space-y-2.5 shrink-0">
              {/* Template Download & Upload Card */}
              <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Template & Upload Anggota</span>
                  </h4>
                  <span className="text-[9px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                    Format: No, Nama Anggota
                  </span>
                </div>

                <input
                  ref={memberTemplateFileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleUploadMembersTemplate}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadMembersTemplate}
                    className="bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-400 py-2 px-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 truncate"
                    title="Download format CSV template daftar anggota"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Download Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => memberTemplateFileRef.current?.click()}
                    className="bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white border border-emerald-700 py-2 px-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 truncate"
                    title="Upload file CSV / TXT untuk import daftar anggota massal"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                    <span className="truncate">Upload Anggota</span>
                  </button>
                </div>
              </div>

              {/* Single Member Add Form */}
              <form onSubmit={handleAddSingleMember} className="flex gap-2">
                <input
                  type="text"
                  value={singleMemberName}
                  onChange={(e) => setSingleMemberName(e.target.value)}
                  placeholder="Tambah 1 nama anggota..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-colors shrink-0 shadow-xs"
                >
                  Tambah
                </button>
              </form>

              {/* Member Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama anggota..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members
                  .filter((m) => m.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map((m, idx) => (
                    <div
                      key={`member-item-${m}`}
                      className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          {m}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m)}
                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                        title={`Hapus ${m}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DATABASE & EXPORT */}
        {/* ========================================================= */}
        {activeTab === 'database' && (
          <div id="admin-tab-database" className="flex flex-col h-full bg-slate-50/50">
            <div className="p-3 space-y-2 shrink-0 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                  Filter Laporan Pertemuan
                </label>
                <div className="flex items-center gap-1.5">
                  {Boolean(settingGasUrl.trim()) && (
                    <button
                      type="button"
                      id="btn-db-pull-cloud"
                      onClick={handlePullFromAppsScript}
                      disabled={isSyncing || isLiveSyncing}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-emerald-200 shadow-2xs"
                      title="Ambil data transaksi terbaru dari Google Sheets"
                    >
                      <CloudDownload className={`w-3 h-3 ${isSyncing || isLiveSyncing ? 'animate-bounce text-emerald-600' : ''}`} />
                      <span>{isSyncing || isLiveSyncing ? 'Memuat...' : 'Tarik Cloud'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowClearModal(true)}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Kosongkan DB</span>
                  </button>
                </div>
              </div>


              <select
                id="admin-db-filter-host"
                value={dbFilterHost}
                onChange={(e) => setDbFilterHost(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="ALL">Semua Tuan Rumah ({records.length} Transaksi)</option>
                {existingRecordedHosts.map((h) => (
                  <option key={`db-host-${h}`} value={h}>
                    Tuan Rumah: {h}
                  </option>
                ))}
              </select>

              {/* Export Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1.5 px-2 rounded-xl text-[11px] shadow-2xs transition-all flex items-center justify-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-bold py-1.5 px-2 rounded-xl text-[11px] shadow-2xs transition-all flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('jpg')}
                  disabled={isExporting}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1.5 px-2 rounded-xl text-[11px] shadow-2xs transition-all flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JPG</span>
                </button>
              </div>
            </div>

            {/* Database Table & Summary */}
            <div ref={exportAreaRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-white">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Total Arisan:</span>
                <span className="text-emerald-700 text-sm">{formatRupiah(totalDbArisan)}</span>
              </div>

              {filteredDbRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">Belum ada riwayat transaksi arisan tersimpan.</p>
                  <p className="text-[11px] text-slate-400">
                    Data transaksi yang disimpan pada tab <strong>Input Arisan</strong> akan tercatat dan ditampilkan di sini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredDbRecords.map((r, idx) => (
                    <div
                      key={`db-record-${r.id || idx}`}
                      className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-800 text-xs sm:text-sm truncate">{r.member}</h5>
                        <p className="text-[10px] text-slate-400 truncate">
                          Tuan Rumah: <strong>{r.host}</strong>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-emerald-700 block text-xs sm:text-sm">
                          {formatRupiah(r.amount)}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {r.timestamp ? new Date(r.timestamp).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PENGATURAN & SINKRONISASI APPS SCRIPT */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div
            id="admin-tab-settings"
            className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-5 space-y-4 pb-14 bg-slate-50/50"
          >
            {/* Card 1: Firebase Cloud Storage Status & Auto-Save Information */}
            <div className="bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">
                        Database Utama: Firebase Firestore
                      </h4>
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Auto-Save Aktif</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Setiap data anggota, transaksi arisan, kas, & pengaturan langsung tersimpan otomatis ke Cloud Firebase Firestore.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Realtime Cloud Firestore</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Anggota</span>
                  <span className="font-extrabold text-slate-800 text-sm">{members.length}</span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Transaksi Arisan</span>
                  <span className="font-extrabold text-slate-800 text-sm">{records.length}</span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">KAS Tuan Rumah</span>
                  <span className="font-extrabold text-slate-800 text-sm">{hostKasEntries.length}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Google Apps Script Synchronization */}
            <div className="bg-white p-3.5 sm:p-4.5 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <CloudUpload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">
                      Sinkronisasi Google Apps Script (Sheets)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kirim data dari Firebase ke Google Spreadsheet untuk arsip & rekap lembar kerja
                    </p>
                  </div>
                </div>

                <div className="self-start sm:self-auto shrink-0">
                  {settingGasUrl.trim() ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Link Terpasang</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Belum Diatur</span>
                    </span>
                  )}
                </div>
              </div>

              {/* URL Input Section */}
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                  <label
                    htmlFor="admin-setting-gas-url"
                    className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Link Web App Apps Script</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (URL berakhiran /exec)
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="url"
                    id="admin-setting-gas-url"
                    value={settingGasUrl}
                    onChange={(e) => setSettingGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 rounded-xl pl-3 pr-9 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs transition-colors"
                  />
                  {settingGasUrl && (
                    <button
                      type="button"
                      onClick={() => setSettingGasUrl('')}
                      className="absolute right-2.5 text-slate-400 hover:text-rose-600 p-1 text-xs rounded transition-colors"
                      title="Hapus tautan"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sync Status Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Status Sinkronisasi
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        syncStatus === 'online'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isLiveSyncing || isSyncing
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : syncStatus === 'error'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {syncStatus === 'online'
                        ? '🟢 Terhubung ke Sheets'
                        : isLiveSyncing || isSyncing
                        ? '🟡 Menyinkronkan...'
                        : syncStatus === 'error'
                        ? '🔴 Gagal Terhubung'
                        : '⚪ Siap Kirim'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {lastSyncAppsScript || propLastSyncTime || lastSyncTime
                        ? `Terakhir ke Sheets: ${lastSyncAppsScript || propLastSyncTime || lastSyncTime}`
                        : 'Belum pernah dikirim ke Sheets'}
                    </span>
                  </div>
                </div>

                {/* Auto-Sync Toggle */}
                {onToggleRealtime && (
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={isRealtimeEnabled}
                      onChange={(e) => onToggleRealtime(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700 select-none">
                      Pengecekan Rutin (25s)
                    </span>
                  </label>
                )}
              </div>

              {/* PRIMARY ACTION: SINKRONKAN DATA DARI FIREBASE KE APPS SCRIPT */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  id="btn-sync-firebase-to-gas"
                  onClick={handleSyncToAppsScript}
                  disabled={isSyncing || isLiveSyncing || !settingGasUrl.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title="Kirim dan sinkronkan seluruh data dari Firebase ke Google Spreadsheet"
                >
                  <Send className={`w-4 h-4 ${isSyncing || isLiveSyncing ? 'animate-bounce' : ''}`} />
                  <span>
                    {isSyncing || isLiveSyncing
                      ? 'Sedang Mengirim Data dari Firebase ke Apps Script...'
                      : 'Kirim / Sinkronkan Data dari Firebase ke Google Apps Script'}
                  </span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-pull-appscript"
                    onClick={handlePullFromAppsScript}
                    disabled={isSyncing || isLiveSyncing || !settingGasUrl.trim()}
                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Ambil data dari Google Sheets jika diperlukan"
                  >
                    <CloudDownload className="w-4 h-4 text-amber-600" />
                    <span>Tarik Data dari Sheets (Pull)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAppsScriptCode(!showAppsScriptCode)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Code2 className="w-4 h-4 text-slate-600" />
                    <span>{showAppsScriptCode ? 'Tutup Kode' : 'Petunjuk Kode GAS'}</span>
                  </button>
                </div>
              </div>


              {/* Code Snippet Box */}
              {showAppsScriptCode && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 text-xs font-mono space-y-2 border border-slate-800 animate-in fade-in">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-400 text-[11px]">
                      Kode Lengkap Google Apps Script (Auto-Sync 4 Sheet):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_BACKEND_CODE);
                        onToast('Kode Google Apps Script lengkap berhasil disalin ke clipboard!', 'success');
                      }}
                      className="bg-emerald-800 hover:bg-emerald-700 text-amber-300 px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Salin Semua Kode GAS</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-[10px] text-emerald-300/90 leading-relaxed custom-scrollbar max-h-60 py-1">
{GOOGLE_APPS_SCRIPT_BACKEND_CODE}
                  </pre>
                  <p className="text-[10px] text-slate-400 font-sans pt-1">
                    ℹ️ Kode ini otomatis membuat & memperbarui 4 Sheet di Google Spreadsheet: <strong>Daftar Anggota</strong>, <strong>Data Arisan</strong>, <strong>Data Kas Tuan Rumah</strong>, dan <strong>Ringkasan & Jadwal</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Card 2: Schedule & Preference Settings Form */}
            <form
              onSubmit={handleSaveSettings}
              className="space-y-3.5 bg-white p-3.5 sm:p-4.5 md:p-5 rounded-2xl border border-slate-200 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">
                    Jadwal & Preferensi Pertemuan
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pengaturan tuan rumah berikutnya, waktu acara, dan nominal bawaan
                  </p>
                </div>
              </div>

              {/* Host Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Tuan Rumah Pertemuan Berikutnya
                </label>
                <select
                  value={settingHost}
                  onChange={(e) => setSettingHost(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Pilih Tuan Rumah --</option>
                  {members.map((m) => (
                    <option key={`setting-host-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* DateTime Picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Waktu & Tanggal Acara
                </label>
                <input
                  type="datetime-local"
                  value={settingDateTime}
                  onChange={(e) => setSettingDateTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Amount Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Default Nominal Arisan (Rp)
                  </label>
                  <input
                    type="number"
                    value={settingDefaultAmount}
                    onChange={(e) => setSettingDefaultAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Default Nominal Kas Anggota (Rp)
                  </label>
                  <input
                    type="number"
                    value={settingDefaultKasAmount}
                    onChange={(e) => setSettingDefaultKasAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Admin Credentials & Security */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs border border-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                      Akun & Keamanan Pengurus (Login Admin)
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Kelola username dan password untuk hak akses dashboard pengurus
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-3 rounded-2xl border border-amber-200/70">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Username Admin
                    </label>
                    <input
                      id="setting-admin-username"
                      type="text"
                      required
                      value={settingAdminUsername}
                      onChange={(e) => setSettingAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Password Admin
                    </label>
                    <input
                      id="setting-admin-password"
                      type="text"
                      required
                      value={settingAdminPassword}
                      onChange={(e) => setSettingAdminPassword(e.target.value)}
                      placeholder="51001n!"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-save-settings"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Simpan Semua Pengaturan</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Clear Database Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xs w-full shadow-2xl border border-slate-200 text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm">
              Kosongkan Seluruh Database?
            </h4>
            <p className="text-xs text-slate-500">
              Semua data riwayat setoran arisan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearDatabase}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6-TAB BOTTOM NAVIGATION BAR */}
      {/* ========================================================= */}
      <div className="grid grid-cols-6 gap-0.5 sm:gap-1.5 bg-white p-1 sm:p-2 rounded-2xl text-center shrink-0 shadow-lg border border-slate-200 z-20">
        <button
          id="btn-admin-tab-input"
          onClick={() => setActiveTab('input')}
          className={`py-1.5 sm:py-2 px-0.5 sm:px-1 font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
            activeTab === 'input'
              ? 'bg-emerald-850 text-amber-300 shadow-xs border border-amber-400/40'
              : 'text-slate-400 hover:text-emerald-700'
          }`}
        >
          <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[10px] md:text-xs leading-tight">Input</span>
        </button>

        <button
          id="btn-admin-tab-kas"
          onClick={() => setActiveTab('kas')}
          className={`py-1.5 sm:py-2 px-0.5 sm:px-1 font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
            activeTab === 'kas'
              ? 'bg-emerald-850 text-amber-300 shadow-xs border border-amber-400/40'
              : 'text-slate-400 hover:text-emerald-700'
          }`}
        >
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[10px] md:text-xs leading-tight">KAS</span>
        </button>

        <button
          id="btn-admin-tab-edit"
          onClick={() => setActiveTab('edit')}
          className={`py-1.5 sm:py-2 px-0.5 sm:px-1 font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
            activeTab === 'edit'
              ? 'bg-emerald-850 text-amber-300 shadow-xs border border-amber-400/40'
              : 'text-slate-400 hover:text-emerald-700'
          }`}
        >
          <FileEdit className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[10px] md:text-xs leading-tight">Edit</span>
        </button>

        <button
          id="btn-admin-tab-members"
          onClick={() => setActiveTab('members')}
          className={`py-1.5 sm:py-2 px-0.5 sm:px-1 font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
            activeTab === 'members'
              ? 'bg-emerald-850 text-amber-300 shadow-xs border border-amber-400/40'
              : 'text-slate-400 hover:text-emerald-700'
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[10px] md:text-xs leading-tight">Anggota</span>
        </button>

        <button
          id="btn-admin-tab-database"
          onClick={() => setActiveTab('database')}
          className={`py-1.5 sm:py-2 px-0.5 sm:px-1 font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
            activeTab === 'database'
              ? 'bg-emerald-850 text-amber-300 shadow-xs border border-amber-400/40'
              : 'text-slate-400 hover:text-emerald-700'
          }`}
        >
          <Database className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[10px] md:text-xs leading-tight">Data</span>
        </button>

        <button
          id="btn-admin-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`py-1.5 sm:py-2 px-0.5 sm:px-1 font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
            activeTab === 'settings'
              ? 'bg-emerald-850 text-amber-300 shadow-xs border border-amber-400/40'
              : 'text-slate-400 hover:text-emerald-700'
          }`}
        >
          <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[10px] md:text-xs leading-tight">Atur</span>
        </button>
      </div>
    </div>
  );
};
