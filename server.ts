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
      model: model,
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
 * Salin dan tempel kode ini ke Apps Script Editor Google Sheets Anda.
 * Langkah deployment:
 * 1. Buka Google Sheet Anda -> Ekstensi -> Apps Script
 * 2. Hapus kode bawaan dan tempel kode ini
 * 3. Klik 'Terapkan' (Deploy) -> 'Deploy sebagai Web App'
 * 4. Akses: 'Siapa saja' (Anyone), Lalu Deploy dan salin URL Web App.
 */

function doGet(e) {
  var action = e.parameter.action || 'getData';
  var sheetName = e.parameter.sheet || 'MasterData';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet " + sheetName + " tidak ditemukan" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var sheetName = payload.sheet || 'MasterData';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    if (action === 'syncAll') {
      sheet.clear();
      var data = payload.data;
      if (data && data.length > 0) {
        var headers = Object.keys(data[0]);
        sheet.appendRow(headers);
        data.forEach(function(item) {
          var row = headers.map(function(h) { return item[h] !== undefined ? item[h] : ''; });
          sheet.appendRow(row);
        });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data berhasil disinkronkan ke Google Sheet!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak dikenal" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
