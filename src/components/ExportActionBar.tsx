import React from "react";
import { Printer, Download, FileText, FileSpreadsheet, Cloud } from "lucide-react";
import { SchoolIdentity } from "../types";
import { exportToCSV } from "../lib/storage";
import { exportHtmlToDoc } from "../lib/exportDoc";

interface ExportActionBarProps {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  schoolIdentity: SchoolIdentity;
  onOpenPrintModal?: () => void;
  onSyncGoogleSheets?: () => void;
  htmlContentForDoc?: string;
  customButtons?: React.ReactNode;
}

export const ExportActionBar: React.FC<ExportActionBarProps> = ({
  title,
  filename,
  headers,
  rows,
  schoolIdentity,
  onOpenPrintModal,
  onSyncGoogleSheets,
  htmlContentForDoc,
  customButtons,
}) => {
  const handleExportCSV = () => {
    exportToCSV(headers, rows, filename);
  };

  const handleExportDoc = () => {
    if (htmlContentForDoc) {
      exportHtmlToDoc({
        htmlContent: htmlContentForDoc,
        filename: `${filename}.doc`,
        title,
        schoolIdentity,
      });
    } else {
      // Build an HTML table automatically from headers & rows
      const tableHtml = `
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background-color:#f3f4f6; font-weight:bold;">
              ${headers.map((h) => `<th style="border:1px solid #333; padding:6px; text-align:left;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td style="border:1px solid #333; padding:6px;">${cell ?? ""}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: `${filename}.doc`,
        title,
        schoolIdentity,
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 sm:p-3 rounded-xl border border-slate-200 no-print">
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1 hidden sm:inline">
        Opsi Ekspor & Cetak:
      </span>

      {onOpenPrintModal && (
        <button
          onClick={onOpenPrintModal}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow transition-colors"
          title="Cetak Laporan / Simpan dalam format PDF"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak / PDF</span>
        </button>
      )}

      <button
        onClick={handleExportCSV}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow transition-colors"
        title="Simpan data dalam bentuk file Excel / CSV"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>Excel / CSV</span>
      </button>

      <button
        onClick={handleExportDoc}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow transition-colors"
        title="Simpan dokumen dalam bentuk DOC / DOCX Word"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>DOC / DOCX</span>
      </button>

      {onSyncGoogleSheets && (
        <button
          onClick={onSyncGoogleSheets}
          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow transition-colors"
          title="Sinkronkan data modul ini ke Google Sheets"
        >
          <Cloud className="w-3.5 h-3.5 text-teal-200" />
          <span>Google Sheets</span>
        </button>
      )}

      {customButtons}
    </div>
  );
};
