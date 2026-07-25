export const DEFAULT_GAS_CODE = `/**
 * Google Apps Script - Web App Backend untuk Aplikasi Administrasi Guru
 * 
 * LANGKAH PENGGUNAAN:
 * 1. Buka Google Sheet Anda -> Ekstensi -> Apps Script
 * 2. HAPUS SELURUH KODE LAMA di Code.gs hingga benar-benar kosong (kosongkan semuanya!).
 * 3. Tempelkan (Paste) seluruh kode di bawah ini.
 * 4. Klik 'Terapkan' (Deploy) -> 'Deployment baru' (New deployment).
 * 5. Pilih Jenis: 'Web App'.
 * 6. Pilih Akses (Who has access): 'Siapa saja' (Anyone).
 * 7. Klik Deploy, berikan izin akses (Authorize access), lalu salin Web App URL.
 */

// Fungsi bawaan agar tidak timbul error jika Anda mengklik tombol "Jalankan" (Run) di Apps Script Editor
function myFunction() {
  Logger.log("Web App Administrasi Guru aktif dan siap menerima data!");
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "success", 
    message: "Web App Administrasi Guru Aktif!",
    sheets: ss.getSheets().map(function(s) { return s.getName(); })
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Payload kosong" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'syncAll' && payload.data) {
      var allData = payload.data;
      
      Object.keys(allData).forEach(function(key) {
        var val = allData[key];
        if (!val) return;
        
        var sheetName = getSheetTitle(key);
        var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
        sheet.clear();
        
        if (Array.isArray(val)) {
          if (val.length > 0) {
            var headers = [];
            val.forEach(function(item) {
              if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(function(k) {
                  if (headers.indexOf(k) === -1 && typeof item[k] !== 'object') {
                    headers.push(k);
                  }
                });
              }
            });
            if (headers.length > 0) {
              sheet.appendRow(headers);
              val.forEach(function(item) {
                var row = headers.map(function(h) { 
                  var cellVal = item[h];
                  return cellVal !== undefined && cellVal !== null ? String(cellVal) : ''; 
                });
                sheet.appendRow(row);
              });
            }
          }
        } else if (typeof val === 'object') {
          sheet.appendRow(['Kategori / Parameter', 'Nilai / Isian']);
          Object.keys(val).forEach(function(k) {
            var v = val[k];
            sheet.appendRow([k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
          });
        }
      });
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Seluruh data modul berhasil disinkronkan ke Google Sheet!" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "OK" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetTitle(key) {
  var titles = {
    schoolIdentity: "Identitas_Sekolah",
    students: "Data_Murid",
    attendanceRecords: "Presensi_Siswa",
    cptpItems: "CP_Dan_TP",
    incidents: "Catatan_BK_Disiplin",
    grades: "Nilai_Siswa",
    timetable: "Jadwal_Pelajaran",
    guestBook: "Buku_Tamu",
    incidentalJournals: "Jurnal_Mengajar",
    dailyLogs: "Log_Harian",
    calendarEvents: "Kalender_Akademik",
    protaList: "Prota",
    promesList: "Promes",
    teachingModules: "Modul_Ajar"
  };
  return titles[key] || key;
}
`;
