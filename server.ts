import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;

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
 * Google Apps Script - Web App Backend untuk Aplikasi Administrasi Guru
 * 
 * LANGKAH PENGGUNAAN:
 * 1. Buka Google Sheet Anda -> Ekstensi -> Apps Script
 * 2. HAPUS SELURUH KODE LAMA di Code.gs hingga benar-benar kosong.
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
