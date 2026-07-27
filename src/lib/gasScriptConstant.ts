export const DEFAULT_GAS_CODE = `/**
 * Google Apps Script - Web App Backend & Cloud Backup Drive untuk Aplikasi Administrasi Guru
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

function myFunction() {
  Logger.log("Web App Administrasi Guru & Cloud Drive Backup aktif!");
}

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

    if (action === 'downloadBackup' && e.parameter.fileId) {
      var file = DriveApp.getFileById(e.parameter.fileId);
      var content = file.getBlob().getDataAsString();
      return ContentService.createTextOutput(content)
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Web App Administrasi Guru & Drive Backup Aktif!",
      sheets: ss.getSheets().map(function(s) { return s.getName(); })
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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

    // 1. Upload Backup langsung ke Google Drive Folder
    if (action === 'uploadBackup' || action === 'uploadCloud' || payload.targetType === 'gdrive') {
      var folder = getBackupFolder();
      var schoolName = payload.schoolName || (payload.data && payload.data.schoolIdentity ? payload.data.schoolIdentity.schoolName : "Sekolah");
      var cleanSchoolName = String(schoolName).replace(/[^a-zA-Z0-9]/g, "_");
      var dateStr = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
      var fileName = payload.filename || ("Backup_Administrasi_Guru_" + cleanSchoolName + "_" + dateStr + ".json");
      
      var jsonString = JSON.stringify(payload.data || payload, null, 2);
      var file = folder.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "File backup berhasil diunggah dan disimpan ke folder Google Drive: " + folder.getName(),
        fileId: file.getId(),
        filename: file.getName(),
        folderName: folder.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Sync seluruh sheet
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

      // Juga simpan snapshot backup otomatis di folder Google Drive
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

