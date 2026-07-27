import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;

// User Config File persistence for multi-device sync by Email
const USER_CONFIG_FILE = path.join(process.cwd(), "user_configs.json");
const BACKUPS_DIR = path.join(process.cwd(), "backups");

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create backups directory:", e);
  }
}

function readUserConfigs(): Record<string, any> {
  try {
    if (fs.existsSync(USER_CONFIG_FILE)) {
      const data = fs.readFileSync(USER_CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading user configs file:", e);
  }
  return {};
}

function saveUserConfig(email: string, config: { webAppUrl: string; sheetId?: string }) {
  try {
    const current = readUserConfigs();
    const cleanEmail = email.toLowerCase().trim();
    current[cleanEmail] = {
      ...current[cleanEmail],
      ...config,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving user config:", e);
  }
}

// API endpoint to fetch user Google Sheets Web App URL by email
app.get("/api/user-config", (req, res) => {
  const email = (req.query.email as string)?.toLowerCase()?.trim();
  if (!email) {
    return res.status(400).json({ error: "Email parameter required" });
  }
  const configs = readUserConfigs();
  const userConfig = configs[email] || {};
  return res.json({
    email,
    webAppUrl: userConfig.webAppUrl || "",
    sheetId: userConfig.sheetId || "",
  });
});

// API endpoint to save user Google Sheets Web App URL by email
app.post("/api/user-config", (req, res) => {
  const { email, webAppUrl, sheetId } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email required" });
  }
  saveUserConfig(email, { webAppUrl: webAppUrl || "", sheetId: sheetId || "" });
  return res.json({
    status: "success",
    message: `Konfigurasi URL Google Sheets berhasil tersambung secara otomatis dengan email: ${email}`,
  });
});

// ==========================================
// DEDICATED APP BACKUP FOLDER API ENDPOINTS
// ==========================================

// 1. List backup files in the app's dedicated backup folder
app.get("/api/backup/list", (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupList = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        let schoolName = "Sekolah";
        let backupDate = stats.mtime.toISOString();
        let totalItems = 0;

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const parsed = JSON.parse(content);
          schoolName = parsed.schoolName || parsed.data?.schoolIdentity?.schoolName || "Sekolah";
          backupDate = parsed.backupDate || parsed.timestamp || stats.mtime.toISOString();
          if (parsed.data && typeof parsed.data === "object") {
            totalItems = Object.keys(parsed.data).reduce((acc, k) => {
              const val = parsed.data[k];
              return acc + (Array.isArray(val) ? val.length : 1);
            }, 0);
          }
        } catch (e) {
          // ignore parse error
        }

        return {
          filename: file,
          schoolName,
          backupDate,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          totalItems,
          location: "Folder Backup Aplikasi Server",
        };
      })
      .sort((a, b) => new Date(b.backupDate).getTime() - new Date(a.backupDate).getTime());

    return res.json({ status: "success", backups: backupList });
  } catch (err: any) {
    console.error("Error listing backups:", err);
    return res.status(500).json({ error: "Gagal membaca folder backup aplikasi" });
  }
});

// 2. Upload / Save new backup file to dedicated app backup folder
app.post("/api/backup/upload", (req, res) => {
  try {
    const { filename, schoolName, backupDate, data, rawJson } = req.body;

    let payloadToSave: any;
    if (rawJson) {
      try {
        payloadToSave = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
      } catch (e) {
        return res.status(400).json({ error: "Format JSON tidak valid" });
      }
    } else if (data) {
      payloadToSave = {
        backupDate: backupDate || new Date().toISOString(),
        schoolName: schoolName || data?.schoolIdentity?.schoolName || "SDN PISANGCANDI 1",
        data,
      };
    } else {
      return res.status(400).json({ error: "Payload data backup tidak ditemukan" });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const cleanSchoolName = (schoolName || payloadToSave.schoolName || "Sekolah").replace(/[^a-zA-Z0-9]/g, "_");
    const targetFilename = filename || `Backup_Administrasi_Guru_${cleanSchoolName}_${dateStr}.json`;

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const targetPath = path.join(BACKUPS_DIR, targetFilename);
    fs.writeFileSync(targetPath, JSON.stringify(payloadToSave, null, 2), "utf-8");

    return res.json({
      status: "success",
      filename: targetFilename,
      message: `File backup ${targetFilename} berhasil disimpan di Folder Backup Khusus Aplikasi!`,
    });
  } catch (err: any) {
    console.error("Error uploading backup:", err);
    return res.status(500).json({ error: "Gagal menyimpan file backup ke folder server" });
  }
});

// 3. Download backup file from dedicated app backup folder
app.get("/api/backup/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const targetPath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "File backup tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    return res.sendFile(targetPath);
  } catch (err: any) {
    console.error("Error downloading backup:", err);
    return res.status(500).json({ error: "Gagal mengunduh file backup" });
  }
});

// 4. Delete backup file from dedicated app backup folder
app.delete("/api/backup/delete/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const targetPath = path.join(BACKUPS_DIR, safeFilename);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    return res.json({ status: "success", message: `File backup ${safeFilename} berhasil dihapus` });
  } catch (err: any) {
    console.error("Error deleting backup:", err);
    return res.status(500).json({ error: "Gagal menghapus file backup" });
  }
});

// API route for AI Generation
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { prompt, model = "gemini-3.6-flash", manualApiKey, systemInstruction } = req.body;

    let targetModel = model;
    if (!targetModel || targetModel.includes("2.5") || targetModel.includes("1.5") || targetModel.includes("2.0")) {
      targetModel = "gemini-3.6-flash";
    }

    const apiKey = manualApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "Kunci API Gemini tidak ditemukan. Harap masukkan API Key secara manual atau pastikan GEMINI_API_KEY telah dikonfigurasi.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: systemInstruction
        ? {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        : {
            temperature: 0.7,
          },
    });

    return res.json({ result: response.text });
  } catch (error: any) {
    console.error("AI Generation error:", error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan saat memproses permintaan AI.",
    });
  }
});

// API route for generating Google Apps Script Code
app.get("/api/gas/script", (req, res) => {
  const gasCode = `/**
 * Google Apps Script - Web App Backend & Cloud Backup Drive untuk Aplikasi Administrasi Guru
 * 
 * ==========================================================================================
 * CARA MENGATASI ERROR IZIN (DriveApp.getFoldersByName):
 * 1. Di bagian atas editor Apps Script, pilih fungsi "initPermissions" dari menu dropdown.
 * 2. Klik tombol "Jalankan" (Run) di sebelah kiri dropdown.
 * 3. Pop-up "Izin Diperlukan" akan muncul -> Klik "Tinjau Izin" (Review Permissions).
 * 4. Pilih Akun Google Anda -> Klik "Lanjutan" (Advanced) -> Klik "Buka Project (tidak aman)".
 * 5. Klik "Izinkan" (Allow).
 * 6. Setelah berhasil, klik Deploy -> Deploy baru -> Deploy.
 * ==========================================================================================
 */

/**
 * JALANKAN FUNGSI INI SEKALI DENGAN MENGKLIK "JALANKAN" (RUN) DI EDITOR UNTUK MEMBERIKAN IZIN GOOGLE DRIVE
 */
function initPermissions() {
  var folder = getBackupFolder();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("✅ IZIN GOOGLE DRIVE BERHASIL AKTIF!");
  Logger.log("Folder Backup: " + folder.getName() + " (ID: " + folder.getId() + ")");
  Logger.log("Google Sheet: " + ss.getName());
}

function myFunction() {
  initPermissions();
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

    // 3. Fallback jika action tidak sesuai
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "Aksi '" + action + "' tidak dikenali atau versi Apps Script perlu diperbarui. Silakan lakukan Deploy Baru di Google Apps Script." 
    })).setMimeType(ContentService.MimeType.JSON);

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
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(gasCode);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Administrasi Guru berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
