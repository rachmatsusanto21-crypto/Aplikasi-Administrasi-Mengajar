import React, { useRef } from "react";
import { Printer, X, FileText } from "lucide-react";
import { SchoolIdentity } from "../types";
import { KopSurat } from "./KopSurat";
import { exportHtmlToDoc } from "../lib/exportDoc";

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  schoolIdentity: SchoolIdentity;
  children: React.ReactNode;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  schoolIdentity,
  children,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportDoc = () => {
    if (contentRef.current) {
      exportHtmlToDoc({
        htmlContent: contentRef.current.innerHTML,
        filename: `${title.replace(/[^a-zA-Z0-0_]/g, "_")}.doc`,
        title,
        schoolIdentity,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
        {/* Modal Controls Bar (Hidden during window.print) */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Pratinjau Cetak / Ekspor Dokumen</h3>
              <p className="text-[11px] text-slate-400">{title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportDoc}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
              title="Unduh sebagai dokumen Word (.doc / .docx)"
            >
              <FileText className="w-4 h-4" />
              Simpan Word (.docx)
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
              title="Cetak atau Simpan sebagai PDF via dialog cetak browser"
            >
              <Printer className="w-4 h-4" />
              Cetak / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Visible in modal & print layout) */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-900 printable-area font-sans">
          {/* Kop Surat Resmi */}
          <KopSurat schoolIdentity={schoolIdentity} />

          {/* Document Title & Metadata */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold uppercase underline tracking-wider text-slate-900">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-600 font-medium mt-1">{subtitle}</p>}
            <div className="flex justify-between items-center text-xs text-slate-700 mt-3 pt-2 border-t border-slate-200">
              <div>
                <b>Tahun Pelajaran:</b> {schoolIdentity.academicYear} | <b>Semester:</b> {schoolIdentity.semester}
              </div>
              <div>
                <b>Kelas/Fase:</b> {schoolIdentity.gradeClass} ({schoolIdentity.phase})
              </div>
            </div>
          </div>

          {/* Document Dynamic Content */}
          <div ref={contentRef} className="my-4 text-xs sm:text-sm leading-relaxed text-slate-900">
            {children}
          </div>

          {/* Signature Block */}
          <div className="mt-12 pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-900 break-inside-avoid">
            <div>
              <p>Mengetahui,</p>
              <p className="font-semibold mb-16">Kepala Sekolah {schoolIdentity.schoolName}</p>
              <p className="font-bold underline uppercase">{schoolIdentity.headmasterName}</p>
              <p className="text-[11px] text-slate-700">NIP. {schoolIdentity.headmasterNip}</p>
            </div>
            <div>
              <p>{schoolIdentity.regency || schoolIdentity.district || "Malang"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="font-semibold mb-16">Guru Kelas / Mata Pelajaran</p>
              <p className="font-bold underline uppercase">{schoolIdentity.teacherName}</p>
              <p className="text-[11px] text-slate-700">NIP. {schoolIdentity.teacherNip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
