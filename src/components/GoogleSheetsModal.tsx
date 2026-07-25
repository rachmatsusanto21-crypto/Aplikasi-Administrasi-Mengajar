import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Copy, Check, RefreshCw, X, Database, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { GASConfig } from "../types";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GASConfig;
  onSaveConfig?: (config: GASConfig) => void;
  sheetsUrl?: string;
  onUpdateSheetsUrl?: (url: string) => void;
  onSyncAllData?: () => Promise<boolean>;
  allData?: any;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  sheetsUrl: propSheetsUrl,
  onUpdateSheetsUrl,
  onSyncAllData,
  allData,
}) => {
  const [copied, setCopied] = useState(false);
  const [gasScript, setGasScript] = useState<string>("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const activeSheetsUrl = propSheetsUrl ?? config?.webAppUrl ?? "";

  const handleUrlChange = (url: string) => {
    if (onUpdateSheetsUrl) {
      onUpdateSheetsUrl(url);
    }
    if (onSaveConfig && config) {
      onSaveConfig({ ...config, webAppUrl: url });
    }
  };

  useEffect(() => {
    if (isOpen && !gasScript) {
      setLoadingScript(true);
      fetch("/api/gas/script")
        .then((res) => res.text())
        .then((text) => setGasScript(text))
        .catch((err) => console.error("Error fetching GAS script:", err))
        .finally(() => setLoadingScript(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncNow = async () => {
    if (!activeSheetsUrl || !activeSheetsUrl.trim()) {
      setSyncStatus("⚠️ Masukkan Web App Deployment URL terlebih dahulu.");
      return;
    }

    setSyncing(true);
    setSyncStatus(null);

    try {
      if (onSyncAllData) {
        const success = await onSyncAllData();
        if (success) {
          setSyncStatus("✅ Seluruh data berhasil tersimpan & tersinkronisasi ke Google Sheet!");
        } else {
          setSyncStatus("⚠️ Gagal terhubung. Pastikan URL Web App sudah tepat dan hak akses diset ke 'Siapa Saja' (Anyone).");
        }
      } else {
        // Direct fetch handling with safe text parsing
        const cleanUrl = activeSheetsUrl.trim();
        const payload = {
          action: "syncAll",
          sheet: "MasterData",
          data: allData || {},
          timestamp: new Date().toISOString(),
        };

        const res = await fetch(cleanUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(payload),
        });

        const textResponse = await res.text();

        try {
          const json = JSON.parse(textResponse);
          if (json.status === "success" || json.result === "success") {
            setSyncStatus("✅ Seluruh data berhasil tersimpan & tersinkronisasi ke Google Sheet!");
          } else {
            setSyncStatus(`⚠️ Respon Apps Script: ${json.message || json.error || "Gagal sinkronisasi"}`);
          }
        } catch {
          if (textResponse.includes("<!DOCTYPE") || textResponse.includes("<html") || textResponse.startsWith("The page")) {
            setSyncStatus("❌ Gagal: Unexpected token 'T', \"The page c\"... is not valid JSON. Google Apps Script mengembalikan halaman HTML/Login. Buka panduan Solusi di bawah!");
            setShowTroubleshooting(true);
          } else {
            setSyncStatus(`❌ Respon server bukan JSON: "${textResponse.slice(0, 80)}..."`);
          }
        }
      }
    } catch (err: any) {
      setSyncStatus(`❌ Kesalahan koneksi: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Integrasi Google Sheets & Google Apps Script</h3>
              <p className="text-xs text-emerald-100">
                Hubungkan Google Sheet sebagai Database Utama & Tempat Penyimpanan Data Administrasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700">
          {/* Step 1: Apps Script Generator */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-slate-800 text-sm">
                  Salin Kode Google Apps Script (Code.gs)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin!" : "Salin Kode GAS"}
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Buka Google Sheet Anda &gt; klik menu <b>Ekstensi</b> &gt; <b>Apps Script</b>. Hapus kode lama lalu tempel kode di bawah ini:
            </p>
            <div className="relative bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-40 border border-slate-800">
              {loadingScript ? (
                <div className="text-slate-400 text-xs py-4 text-center">Memuat skrip Apps Script...</div>
              ) : (
                <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre font-normal">
                  {gasScript}
                </pre>
              )}
            </div>
          </div>

          {/* Step 2: Input Web App URL */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-slate-800 text-sm">
                Isikan Google Sheets Web App Deployment URL
              </h4>
            </div>
            <p className="text-xs text-slate-600 mb-2.5">
              Masukkan <b>Web App URL</b> yang Anda dapatkan setelah klik <b>Deploy / Terapkan</b> di Google Apps Script (pilih <i>Akses: Siapa Saja / Anyone</i>):
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={activeSheetsUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-mono text-slate-800"
              />
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing || !activeSheetsUrl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
              >
                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {syncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
              </button>
            </div>

            {syncStatus && (
              <div
                className={`text-xs mt-3 p-3 rounded-lg border font-medium ${
                  syncStatus.startsWith("✅")
                    ? "bg-emerald-100/70 border-emerald-300 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {syncStatus}
              </div>
            )}
          </div>

          {/* Troubleshooting Section for Unexpected token T */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              className="w-full p-3.5 text-left flex items-center justify-between font-bold text-xs text-amber-900 hover:bg-amber-100/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Cara Mengatasi Error: <i>Unexpected token 'T', "The page c"... is not valid JSON</i>
              </span>
              {showTroubleshooting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTroubleshooting && (
              <div className="p-4 pt-0 text-xs text-amber-950 space-y-2.5 border-t border-amber-200/60 mt-1">
                <p className="font-semibold text-rose-800">
                  Penyebab Error: Google Apps Script mengembalikan halaman HTML Login/Akses Ditolak bukannya data JSON. Hal ini terjadi karena setting izin akses di Google Apps Script belum benar.
                </p>
                <div className="space-y-2 bg-white/80 p-3 rounded-lg border border-amber-200">
                  <p className="font-bold text-slate-800">Langkah Perbaikan (Wajib Dilakukan di Google Apps Script):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                    <li>
                      Buka Google Apps Script Editor Anda (menu <b>Ekstensi &gt; Apps Script</b> di Google Sheet).
                    </li>
                    <li>
                      Klik tombol biru <b>Terapkan (Deploy)</b> di pojok kanan atas &gt; pilih <b>Kelola Deployment (Manage deployments)</b> atau <b>Deployment Baru</b>.
                    </li>
                    <li>
                      Pada kolom <b>Akses (Who has access / Siapa yang memiliki akses)</b>, PASTIKAN memilih: <span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded">Siapa saja (Anyone)</span>. <i>Jangan pilih "Hanya saya" atau "Pemilik akun".</i>
                    </li>
                    <li>
                      Pastikan URL yang disalin berakhiran <code className="bg-slate-100 px-1 font-bold text-indigo-700">/exec</code>, BUKAN <code className="bg-slate-100 px-1 text-rose-600 font-bold">/dev</code>.
                    </li>
                    <li>
                      Jika sebelumnya Anda mengedit kode Apps Script, Anda Wajib melakukan <b>Deployment Baru (New Deployment)</b> agar perubahan kodenya aktif.
                    </li>
                    <li>
                      Salin ulang URL Web App terbaru tersebut dan tempelkan pada kolom di atas, lalu klik <b>Sinkronkan Sekarang</b>.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

