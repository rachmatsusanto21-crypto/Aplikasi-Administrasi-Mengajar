import React from "react";
import { Printer, X, Download } from "lucide-react";
import { SchoolIdentity } from "../types";

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
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
        {/* Modal Controls Bar (Hidden during window.print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Pratinjau Cetak / Ekspor PDF</h3>
              <p className="text-[11px] text-slate-400">{title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
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
          {/* Kop Surat / Document Header */}
          <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center gap-6">
            {schoolIdentity.logoUrl && (
              <img
                src={schoolIdentity.logoUrl}
                alt="Logo Sekolah"
                className="w-20 h-20 object-contain rounded-md"
              />
            )}
            <div className="flex-1 text-center">
              <h2 className="font-extrabold text-xl sm:text-2xl tracking-wide uppercase text-slate-900">
                {schoolIdentity.schoolName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-800 font-medium mt-0.5">
                NPSN: {schoolIdentity.npsn} | Email: {schoolIdentity.email} | Telp: {schoolIdentity.phone}
              </p>
              <p className="text-xs text-slate-700">
                {schoolIdentity.address}, Desa {schoolIdentity.village}, Kec. {schoolIdentity.district}, {schoolIdentity.regency}, Prov. {schoolIdentity.province}
              </p>
            </div>
          </div>

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
          <div className="my-4 text-xs sm:text-sm leading-relaxed text-slate-900">
            {children}
          </div>

          {/* Signature Block */}
          <div className="mt-12 pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-900 break-inside-avoid">
            <div>
              <p>Mengetahui,</p>
              <p className="font-semibold mb-16">Kepala Sekolah {schoolIdentity.schoolName}</p>
              <p className="font-bold underline uppercase">{schoolIdentity.headmasterName}</p>
              <p className="text-[11px] text-slate-700">NIP. {schoolIdentity.headmasterHeadmasterNip || schoolIdentity.headmasterNip}</p>
            </div>
            <div>
              <p>{schoolIdentity.district}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
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
