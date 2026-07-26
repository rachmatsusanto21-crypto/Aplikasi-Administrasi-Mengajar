import React, { useState, useRef } from "react";
import { Download, Upload, HardDrive, Cloud, RefreshCw, CheckCircle, AlertCircle, X, ShieldCheck, Database } from "lucide-react";
import { SchoolIdentity, AISettings, GASConfig } from "../types";
import { exportDataToJSON, saveToStorage, STORAGE_KEYS } from "../lib/storage";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolIdentity: SchoolIdentity;
  allData: Record<string, any>;
  onRestoreData?: (newData: Record<string, any>) => void;
  gasConfig?: GASConfig;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  schoolIdentity,
  allData,
  onRestoreData,
  gasConfig,
}) => {
  const [cloudTarget, setCloudTarget] = useState<"sheets" | "gdrive">("sheets");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download Local JSON Backup
  const handleDownloadLocalBackup = () => {
    const backupPayload = {
      backupDate: new Date().toISOString(),
      schoolName: schoolIdentity.schoolName,
      data: allData,
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    exportDataToJSON(backupPayload, `Backup_Administrasi_Guru_${schoolIdentity.schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_${dateStr}`);
  };

  // 2. Restore Local JSON File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const restoredData = json.data || json;

        if (confirm("Apakah Anda yakin ingin memulihkan seluruh data dari file backup ini? Data saat ini akan diperbarui.")) {
          if (onRestoreData) {
            onRestoreData(restoredData);
          } else {
            // Save to local storage manually
            Object.keys(restoredData).forEach((key) => {
              if ((STORAGE_KEYS as any)[key]) {
                saveToStorage((STORAGE_KEYS as any)[key], restoredData[key]);
              }
            });
            alert("Data berhasil dipulihkan! Halaman akan dimuat ulang.");
            window.location.reload();
          }
          onClose();
        }
      } catch (err) {
        alert("Gagal membaca file backup JSON. Pastikan format file benar.");
      }
    };
    reader.readAsText(file);
  };

  // 3. Cloud / Google Drive Sync
  const handleSyncToCloud = async () => {
    const webAppUrl = gasConfig?.webAppUrl?.trim();
    if (!webAppUrl) {
      setSyncMessage({
        type: "error",
        text: "URL Google Apps Script / Drive belum diatur. Silakan atur URL Web App di menu Google Sheets / Apps Script terlebih dahulu.",
      });
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "syncAll",
          targetType: cloudTarget,
          timestamp: new Date().toISOString(),
          data: allData,
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        setSyncMessage({
          type: "success",
          text: `✅ Sinkronisasi berhasil! Data tersimpan di ${cloudTarget === "sheets" ? "Google Sheets Spreadsheet" : "Google Drive Cloud Backup"}.`,
        });
      } else {
        setSyncMessage({
          type: "error",
          text: `❌ Gagal sinkronisasi: ${result.message || "Respon error dari Google Apps Script"}`,
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: "error",
        text: `❌ Terjadi kesalahan jaringan / CORS: ${err.message || err}. Pastikan Web App diset ke 'Anyone'.`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl">
              <Database className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Pusat Backup & Sinkronisasi Data</h3>
              <p className="text-xs text-emerald-200">Amankan data administrasi lokal di gawai & cloud Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm">
          {/* Section 1: Backup & Restore Lokal */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              <span>1. Cadangkan & Pemulihan Lokal (Di Gawai / Komputer)</span>
            </div>
            <p className="text-xs text-slate-600">
              Unduh seluruh file database aplikasi ke dalam gawai Anda sebagai cadangan offline aman. Anda dapat mengimpor file ini kapan saja jika berganti gawai.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleDownloadLocalBackup}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-2 text-xs shadow transition-colors"
              >
                <Download className="w-4 h-4" />
                Unduh Backup Lokal (.JSON)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg flex items-center gap-2 text-xs transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                Pulihkan Data dari File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 2: Google Drive / Cloud Sync */}
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-950 font-bold border-b border-emerald-200 pb-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              <span>2. Sinkronisasi Cloud Google Drive & Google Sheets</span>
            </div>
            <p className="text-xs text-slate-600">
              Pilih lokasi/penyimpanan cloud untuk mencadangkan seluruh rekap nilai, absensi, jurnal, BK, modul ajar, dan data guru secara terintegrasi.
            </p>

            {/* Opsi Lokasi / Tempat Penyimpanan Backup */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-700">Pilih Tempat Penyimpanan Cloud:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setCloudTarget("sheets")}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    cloudTarget === "sheets"
                      ? "bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="cloudTarget"
                    checked={cloudTarget === "sheets"}
                    onChange={() => setCloudTarget("sheets")}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Google Sheets Spreadsheet</span>
                    <span className="text-[11px] text-slate-500">
                      Format rekap terpisah otomatis per tab sheet (Nilai, Absensi, BK, Modul, dll)
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setCloudTarget("gdrive")}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    cloudTarget === "gdrive"
                      ? "bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="cloudTarget"
                    checked={cloudTarget === "gdrive"}
                    onChange={() => setCloudTarget("gdrive")}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Google Drive Folder / JSON Snapshot</span>
                    <span className="text-[11px] text-slate-500">
                      Menyimpan backup berkala berlabel tanggal di penyimpanan akun Google Drive
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Sync Button */}
            <div className="pt-2">
              <button
                onClick={handleSyncToCloud}
                disabled={isSyncing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Sedang Menyinkronkan ke Cloud..." : "Sinkronkan Seluruh Data ke Cloud Google Sekarang"}
              </button>
            </div>

            {syncMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  syncMessage.type === "success"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {syncMessage.type === "success" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{syncMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
