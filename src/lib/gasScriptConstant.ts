export const DEFAULT_GAS_CODE = `/**
 * Google Apps Script - Web App Backend & Cloud Backup Drive untuk Aplikasi Administrasi Guru
 * 
 * ==========================================================================================
 * BAGAIMANA MENGATASI ERROR IZIN GOOGLE DRIVE ("DriveApp.getFoldersByName"):
 * 1. Buka editor Google Apps Script.
 * 2. Di toolbar atas, pilih fungsi "initPermissions" dari dropdown (di samping tombol Run/Jalankan).
 * 3. Klik tombol "Jalankan" (Run).
 * 4. Pop-up "Izin Diperlukan" akan muncul -> Klik "Tinjau Izin" (Review Permissions).
 * 5. Pilih Akun Google Anda -> Klik "Lanjutan" (Advanced) -> Klik "Buka Project (tidak aman)".
 * 6. Klik "Izinkan" (Allow).
 * 7. Setelah itu, klik "Terapkan" (Deploy) -> "Deployment Baru" -> Pilih Jenis "Web App" -> Akses: "Siapa saja" (Anyone) -> Deploy!
 * ==========================================================================================
 */

/**
 * FUNGSI UNTUK MENGAKTIFKAN OTORISASI DRIVEAPP & SPREADSHEETAPP
 * Jalankan fungsi ini sekali dari editor Google Apps Script dengan tombol 'Run'
 */
function initPermissions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folder = getBackupFolder();
  Logger.log("====================================");
  Logger.log("✅ OTORISASI GOOGLE DRIVE BERHASIL!");
  Logger.log("Nama Sheet: " + ss.getName());
  Logger.log("Folder Backup Drive: " + folder.getName() + " (ID: " + folder.getId() + ")");
  Logger.log("====================================");
}

function myFunction() {
  initPermissions();
}

/**
 * Mendapatkan atau membuat folder backup khusus di Google Drive pengguna
 */
function getBackupFolder() {
  var folderName = "Folder_Backup_Administrasi_Guru";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e && e.parameter ? e.parameter.action : null;

    // 1. List backup files in Google Drive folder
    if (action === 'listBackups') {
      var folder = getBackupFolder();
      var files = folder.getFiles();
      var list = [];
      while (files.hasNext()) {
        var file = files.next();
        if (file.getName().indexOf('.json') !== -1) {
          list.push({
            id: file.getId(),
            filename: file.getName(),
            backupDate: file.getLastUpdated().toISOString(),
            sizeBytes: file.getSize(),
            sizeFormatted: Math.round(file.getSize() / 1024) + ' KB',
            downloadUrl: file.getDownloadUrl(),
            location: "Google Drive (" + folder.getName() + ")"
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        folderName: folder.getName(),
        backups: list
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Download specific backup content from Google Drive
    if (action === 'downloadBackup' && e.parameter.fileId) {
      var file = DriveApp.getFileById(e.parameter.fileId);
      var content = file.getBlob().getDataAsString();
      return ContentService.createTextOutput(content)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Status Check / Ping
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Web App Administrasi Guru & Drive Backup Aktif!",
      version: "2.5-drive-backup",
      sheets: ss.getSheets().map(function(s) { return s.getName(); })
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (pErr) {
        payload = { rawContent: e.postData.contents };
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = (payload && payload.action) || (e && e.parameter && e.parameter.action);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Save Backup JSON to Google Drive Folder
    if (action === 'uploadBackup' || action === 'uploadCloud' || payload.targetType === 'gdrive' || payload.backupDate || payload.data) {
      var folder = getBackupFolder();
      var schoolName = payload.schoolName || (payload.data && payload.data.schoolIdentity ? payload.data.schoolIdentity.schoolName : "Sekolah");
      var cleanSchoolName = String(schoolName).replace(/[^a-zA-Z0-9]/g, "_");
      var dateStr = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
      var fileName = payload.filename || ("Backup_Administrasi_Guru_" + cleanSchoolName + "_" + dateStr + ".json");

      var dataToSave = payload.data || payload;
      var jsonString = typeof dataToSave === "string" ? dataToSave : JSON.stringify(dataToSave, null, 2);

      var file = folder.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "File backup '" + file.getName() + "' berhasil disimpan di Google Drive: " + folder.getName(),
        fileId: file.getId(),
        filename: file.getName(),
        folderName: folder.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Sync all tables to Google Sheet tabs
    if (action === 'syncAll' && payload.data) {
      var allData = payload.data;

      Object.keys(allData).forEach(function(key) {
        var items = allData[key];
        if (Array.isArray(items) && items.length > 0) {
          var sheetName = getSheetTitle(key);
          var sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
            sheet = ss.insertSheet(sheetName);
          }

          sheet.clearContents();
          var headers = Object.keys(items[0]);
          sheet.appendRow(headers);

          items.forEach(function(item) {
            var row = headers.map(function(h) {
              var val = item[h];
              if (typeof val === 'object') return JSON.stringify(val);
              return val !== undefined && val !== null ? val : "";
            });
            sheet.appendRow(row);
          });
        }
      });

      // Also create auto-snapshot in Google Drive folder
      try {
        var autoFolder = getBackupFolder();
        var autoFileName = "AutoSync_Administrasi_Guru_" + new Date().toISOString().substring(0, 10) + ".json";
        autoFolder.createFile(autoFileName, JSON.stringify(payload.data, null, 2), MimeType.PLAIN_TEXT);
      } catch(eDrive) {}

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Seluruh data modul berhasil disinkronkan ke Google Sheet & Drive Backup!" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "Aksi '" + action + "' tidak dikenali. Pastikan versi Apps Script sudah terbaru (Deploy Baru)." 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetTitle(key) {
  var titles = {
    'school_identity': 'Identitas Sekolah',
    'students': 'Data Siswa',
    'cptp_items': 'CP dan TP',
    'atp_items': 'ATP',
    'prota_allocations': 'Prota',
    'promes_allocations': 'Promes',
    'daily_teaching_logs': 'Jurnal Mengajar Harian',
    'grades': 'Nilai Rapor',
    'extracurriculars': 'Ekstrakurikuler',
    'p5_projects': 'Proyek P5',
    'attendance_records': 'Absensi Bulk',
    'agendas': 'Agenda'
  };
  return titles[key] || key;
}
`;
