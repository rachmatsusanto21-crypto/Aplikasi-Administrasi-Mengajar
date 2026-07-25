import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Code2, Copy, Check, ExternalLink, RefreshCw, X, Database } from "lucide-react";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetsUrl: string;
  onUpdateSheetsUrl: (url: string) => void;
  onSyncAllData: () => Promise<boolean>;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  sheetsUrl,
  onUpdateSheetsUrl,
  onSyncAllData,
}) => {
  const [copied, setCopied] = useState(false);
  const [gasScript, setGasScript] = useState<string>("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

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
    setSyncing(true);
    setSyncStatus(null);
    try {
      const success = await onSyncAllData();
      if (success) {
        setSyncStatus("✅ Seluruh data berhasil tersimpan & tersinkronisasi ke Google Sheet!");
      } else {
        setSyncStatus("⚠️ Gagal terhubung ke Google Sheet Web App URL. Pastikan URL sudah tepat.");
      }
    } catch (err: any) {
      setSyncStatus(`❌ Kesalahan: ${err.message}`);
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
                Ekspor, Sinkronkan, atau Gunakan Google Sheet sebagai Database Utama
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700">
          {/* Step 1: Apps Script Generator */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-slate-800 text-sm">
                  Google Apps Script Generator (Code.gs)
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
              Buka Google Sheet Anda &gt; menu <b>Ekstensi</b> &gt; <b>Apps Script</b>, lalu tempel kode di bawah ini untuk membuat Web App backend otomatis:
            </p>
            <div className="relative bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-48 border border-slate-800">
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
                Hubungkan Web App URL Google Sheets
              </h4>
            </div>
            <p className="text-xs text-slate-600 mb-2.5">
              Setelah mendeploy Apps Script sebagai <i>Web App (Siapa saja / Anyone)</i>, masukkan URL hasil deployment di bawah ini:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetsUrl}
                onChange={(e) => onUpdateSheetsUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing || !sheetsUrl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {syncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
              </button>
            </div>
            {syncStatus && (
              <p
                className={`text-xs mt-2.5 font-semibold ${
                  syncStatus.startsWith("✅") ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {syncStatus}
              </p>
            )}
          </div>

          {/* Guidelines note */}
          <div className="text-xs text-slate-500 bg-amber-50 p-3.5 rounded-lg border border-amber-200/80">
            💡 <b>Tips Administrasi Guru:</b> Anda juga dapat mengunduh format CSV / Excel di setiap modul halaman secara langsung untuk disimpan di laptop maupun Google Drive pribadi.
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
