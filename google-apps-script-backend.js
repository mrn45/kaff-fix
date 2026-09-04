/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) BACKEND
 * MDS KAUKABUS SYAFAAH - SISTEM PEMBUKUAN ARISAN & KAS
 * =========================================================================
 * 
 * FITUR UTAMA:
 * 1. [doPost] Otomatis MENYIMPAN & MENYINKRONKAN data dari Web ke Google Sheets:
 *    - Sheet "Daftar Anggota"
 *    - Sheet "Data Arisan"
 *    - Sheet "Data Kas Tuan Rumah"
 *    - Sheet "Ringkasan & Jadwal"
 *    - Snapshot backup JSON otomatis di sheet "_APP_DATA_"
 * 
 * 2. [doGet] Otomatis MENGAKSES & MENGAMBIL data dari Google Sheets ke Web REALTIME:
 *    - Mengembalikan data Anggota, Arisan, Kas, dan Jadwal dalam format JSON
 *    - Mendukung mode JSON standar & JSONP (callback) agar bebas blokir CORS di semua perangkat
 * 
 * CARA PEMASANGAN / UPDATE:
 * 1. Buka Google Spreadsheet arisan Anda di Google Drive.
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 3. Ganti seluruh isi script dengan kode ini.
 * 4. Klik ikon Simpan (Save 💾).
 * 5. Klik tombol "Terapkan" (Deploy) > "Kelola Penerapan" (Manage deployments) > Edit (✏️) >
 *    Versi: "Versi Baru" (New version) > Terapkan (Deploy).
 *    (Atau klik Penerapan Baru > Aplikasi Web > Siapa saja memiliki akses: Anyone).
 * 6. Salin URL Aplikasi Web (/exec) dan masukkan ke Dashboard Pengurus > Tab Atur.
 * =========================================================================
 */

/**
 * Endpoint POST: Menerima data dari Web dan menyimpannya ke Google Sheets
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Tunggu maksimal 30 detik untuk menghindari tabrakan data (race condition)
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

    // 5. SIMPAN BACKUP SNAPSHOT DATA JSON LENGKAP
    saveBackupSnapshot(ss, payload);

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

/**
 * Endpoint GET: Membaca data dari Google Sheets dan mengirimkannya kembali ke Web (REALTIME)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "GET_DATA";
    var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;

    // Mode Ping cepat
    if (action === "PING") {
      var pingResult = {
        status: 'online',
        appName: 'MDS Kaukabus Syafaah Backend',
        spreadsheetName: ss.getName(),
        serverTime: new Date().toISOString()
      };
      return respond(pingResult, callback);
    }

    // Ambil Data Anggota dari Sheet "Daftar Anggota"
    var members = readMembersFromSheet(ss);

    // Ambil Data Transaksi Arisan dari Sheet "Data Arisan"
    var records = readRecordsFromSheet(ss);

    // Ambil Data Kas Tuan Rumah dari Sheet "Data Kas Tuan Rumah"
    var hostKasEntries = readHostKasFromSheet(ss);

    // Ambil Pengaturan & Jadwal dari Sheet "Ringkasan & Jadwal"
    var settings = readSettingsFromSheet(ss);

    // Jika sheet kosong tapi ada backup snapshot, gunakan backup snapshot
    if (members.length === 0 && records.length === 0) {
      var snapshot = loadBackupSnapshot(ss);
      if (snapshot) {
        if (snapshot.members && snapshot.members.length > 0) members = snapshot.members;
        if (snapshot.records && snapshot.records.length > 0) records = snapshot.records;
        if (snapshot.hostKasEntries && snapshot.hostKasEntries.length > 0) hostKasEntries = snapshot.hostKasEntries;
        if (snapshot.settings) settings = Object.assign({}, settings, snapshot.settings);
      }
    }

    var totalArisan = records.reduce(function(acc, r) {
      return acc + (Number(r.amount) || 0);
    }, 0);

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
    var errResult = {
      status: 'error',
      message: 'Gagal mengambil data dari Google Sheets: ' + err.toString()
    };
    return respond(errResult, (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null);
  }
}

/**
 * -------------------------------------------------------------
 * PEMBACAAN DATA (READING SHEETS)
 * -------------------------------------------------------------
 */

// 1. Baca Anggota dari Sheet "Daftar Anggota"
function readMembersFromSheet(ss) {
  var sheet = ss.getSheetByName("Daftar Anggota");
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var members = [];
  var seen = {};

  for (var i = 0; i < data.length; i++) {
    var rawName = data[i][1];
    if (!rawName) rawName = data[i][0]; // Fallback jika tidak ada kolom No

    var nameStr = String(rawName).trim();
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

// 2. Baca Transaksi Arisan dari Sheet "Data Arisan"
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
    var idStr = row[7] ? String(row[7]).trim() : ("trx-gas-" + (i + 1));

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

// 3. Baca Data Kas Tuan Rumah dari Sheet "Data Kas Tuan Rumah"
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

// 4. Baca Pengaturan Jadwal dari Sheet "Ringkasan & Jadwal"
function readSettingsFromSheet(ss) {
  var defaultSettings = {
    host: "",
    datetime: "",
    defaultAmount: 50000,
    defaultKasAmount: 5000
  };

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

/**
 * -------------------------------------------------------------
 * PENULISAN DATA (SYNC TO SHEETS)
 * -------------------------------------------------------------
 */

// 1. Tulis Sheet "Daftar Anggota"
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

// 2. Tulis Sheet "Data Arisan"
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

// 3. Tulis Sheet "Data Kas Tuan Rumah"
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

// 4. Tulis Sheet "Ringkasan & Jadwal"
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

// 5. Backup Snapshot JSON
function saveBackupSnapshot(ss, payload) {
  try {
    var sheet = ss.getSheetByName("_APP_DATA_");
    if (!sheet) {
      sheet = ss.insertSheet("_APP_DATA_");
      sheet.hideSheet();
    }
    sheet.clear();
    sheet.getRange("A1").setValue(JSON.stringify(payload));
  } catch (e) {
    // Ignore backup error if quota reached
  }
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

/**
 * -------------------------------------------------------------
 * HELPER RESPONSES
 * -------------------------------------------------------------
 */
function respond(obj, callback) {
  var jsonStr = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + jsonStr + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
