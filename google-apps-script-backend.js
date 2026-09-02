/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) BACKEND
 * MDS KAUKABUS SYAFAAH - SISTEM PEMBUKUAN ARISAN & KAS
 * =========================================================================
 * 
 * PETUNJUK PEMASANGAN:
 * 1. Buka Google Spreadsheet baru di Google Drive Anda.
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 3. Hapus semua kode default, lalu Paste seluruh kode ini.
 * 4. Klik ikon Simpan (Save 💾).
 * 5. Klik tombol "Terapkan" (Deploy) > "Penerapan baru" (New deployment).
 * 6. Pilih jenis: "Aplikasi Web" (Web app).
 * 7. Konfigurasi:
 *    - Deskripsi: Backend MDS Kaukabus Syafaah v1
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone) -> WAJIB agar aplikasi web bisa mengirim data!
 * 8. Klik "Terapkan" (Deploy) dan berikan izin otorisasi Google jika diminta.
 * 9. Salin "URL Aplikasi Web" (Web app URL) yang berakhiran "/exec".
 * 10. Buka Dashboard Pengurus > Tab "Atur" (Settings) > Masukkan URL tersebut pada kolom Link Google Apps Script.
 * =========================================================================
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

    var totalRecords = sheetRecords ? Math.max(0, sheetRecords.getLastRow() - 1) : 0;
    var totalMembers = sheetMembers ? Math.max(0, sheetMembers.getLastRow() - 1) : 0;
    var totalKas = sheetKas ? Math.max(0, sheetKas.getLastRow() - 1) : 0;

    return responseJSON({
      status: 'online',
      appName: 'MDS Kaukabus Syafaah Backend',
      spreadsheetName: ss.getName(),
      totalMembers: totalMembers,
      totalRecords: totalRecords,
      totalKasEntries: totalKas,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return responseJSON({
      status: 'error',
      message: err.toString()
    });
  }
}

/**
 * -------------------------------------------------------------
 * 1. FUNGSI SINKRONISASI SHEET "Daftar Anggota"
 * -------------------------------------------------------------
 */
function syncMembersSheet(ss, members) {
  var sheetName = "Daftar Anggota";
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  // Header
  var headers = [["No", "Nama Anggota", "Status", "Terakhir Diperbarui"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length)
    .setBackground("#064e3b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  if (members.length === 0) return;

  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  var rows = [];

  for (var i = 0; i < members.length; i++) {
    rows.push([
      i + 1,
      members[i],
      "Aktif",
      nowStr
    ]);
  }

  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * -------------------------------------------------------------
 * 2. FUNGSI SINKRONISASI SHEET "Data Arisan"
 * -------------------------------------------------------------
 */
function syncRecordsSheet(ss, records) {
  var sheetName = "Data Arisan";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  // Header
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

  var rows = [];
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    var arisan = Number(r.amount) || 0;
    var kas = Number(r.kasAmount) || 0;
    var bersih = Math.max(0, arisan - kas);
    var timeFormatted = r.timestamp ? formatDateString(r.timestamp) : "-";

    rows.push([
      i + 1,
      r.host || "-",
      r.member || "-",
      arisan,
      kas,
      bersih,
      timeFormatted,
      r.id || ("trx-" + (i + 1))
    ]);
  }

  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);

  // Format kolom angka ke Rupiah
  sheet.getRange(2, 4, rows.length, 3).setNumberFormat("#,##0");
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.getRange(2, 7, rows.length, 2).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * -------------------------------------------------------------
 * 3. FUNGSI SINKRONISASI SHEET "Data Kas Tuan Rumah"
 * -------------------------------------------------------------
 */
function syncHostKasSheet(ss, hostKasEntries) {
  var sheetName = "Data Kas Tuan Rumah";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  // Header
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

  var rows = [];
  for (var i = 0; i < hostKasEntries.length; i++) {
    var k = hostKasEntries[i];
    var kasPokok = Number(k.kasAmount) || 0;
    var kasLuar = (k.hasKasLuar && Number(k.kasLuarAmount)) ? Number(k.kasLuarAmount) : 0;
    var totalKas = kasPokok + kasLuar;
    var updated = k.updatedAt ? formatDateString(k.updatedAt) : "-";

    rows.push([
      i + 1,
      k.host || "-",
      k.kasOptionLabel || k.kasOptionType || "-",
      kasPokok,
      k.hasKasLuar ? "YA" : "TIDAK",
      kasLuar,
      totalKas,
      updated
    ]);
  }

  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat("#,##0");
  sheet.getRange(2, 6, rows.length, 2).setNumberFormat("#,##0");
  sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
  sheet.getRange(2, 5, rows.length, 1).setHorizontalAlignment("center");
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * -------------------------------------------------------------
 * 4. FUNGSI SINKRONISASI SHEET "Ringkasan & Jadwal"
 * -------------------------------------------------------------
 */
function syncSummarySheet(ss, settings, summary, timestamp) {
  var sheetName = "Ringkasan & Jadwal";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

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
  
  // Styling Judul
  sheet.getRange(1, 1, 1, 2)
    .setBackground("#0f172a")
    .setFontColor("#38bdf8")
    .setFontWeight("bold");
    
  sheet.getRange(8, 1, 1, 2)
    .setBackground("#0f172a")
    .setFontColor("#facc15")
    .setFontWeight("bold");

  // Format angka rupiah
  sheet.getRange(5, 2, 2, 1).setNumberFormat("#,##0");
  sheet.getRange(11, 2, 2, 1).setNumberFormat("#,##0");
  
  sheet.getRange(1, 1, infoData.length, 1).setFontWeight("bold");
  sheet.autoResizeColumns(1, 2);
}

/**
 * Helper JSON Response
 */
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper Format Tanggal
 */
function formatDateString(isoString) {
  try {
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return Utilities.formatDate(d, "Asia/Jakarta", "dd MMM yyyy, HH:mm");
  } catch (e) {
    return isoString;
  }
}
