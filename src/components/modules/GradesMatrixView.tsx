import React, { useState } from "react";
import { Student, CPTPItem, GradeRecord } from "../../types";
import { GraduationCap, Save, Printer, Download, Calculator, Check, Sparkles, Filter } from "lucide-react";
import { exportToCSV } from "../../lib/storage";

interface GradesMatrixViewProps {
  students: Student[];
  cptpItems: CPTPItem[];
  grades: GradeRecord[];
  onSaveGrades: (updatedGrades: GradeRecord[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const GradesMatrixView: React.FC<GradesMatrixViewProps> = ({
  students,
  cptpItems,
  grades,
  onSaveGrades,
  onOpenPrint,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>("Bahasa Indonesia");
  const [activeTab, setActiveTab] = useState<"input" | "rekap">("input");
  const [savedAlert, setSavedAlert] = useState(false);

  const subjects = [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
  ];

  // Get relevant TPs for selected subject
  const subjectTPs = cptpItems.filter((item) => item.subject === selectedSubject);
  const tpList = subjectTPs.length > 0
    ? subjectTPs.map((t) => t.codeTP)
    : ["TP1", "TP2", "TP3"];

  // Get or initialize grade records map
  const getGradeRecord = (studentId: string, subject: string): GradeRecord => {
    const existing = grades.find((g) => g.studentId === studentId && g.subject === subject);
    if (existing) return existing;
    return {
      studentId,
      subject,
      tpScores: {},
      midSummative: undefined,
      finalSummative: undefined,
    };
  };

  const handleScoreChange = (
    studentId: string,
    field: "tp" | "mid" | "final",
    tpCode: string | null,
    val: number
  ) => {
    const numVal = Math.min(100, Math.max(0, val || 0));
    const current = getGradeRecord(studentId, selectedSubject);

    let updatedRecord: GradeRecord;
    if (field === "tp" && tpCode) {
      updatedRecord = {
        ...current,
        tpScores: { ...current.tpScores, [tpCode]: numVal },
      };
    } else if (field === "mid") {
      updatedRecord = { ...current, midSummative: numVal };
    } else {
      updatedRecord = { ...current, finalSummative: numVal };
    }

    const otherGrades = grades.filter(
      (g) => !(g.studentId === studentId && g.subject === selectedSubject)
    );
    onSaveGrades([...otherGrades, updatedRecord]);
  };

  const calculateStudentFinal = (studentId: string, subject: string) => {
    const record = getGradeRecord(studentId, subject);
    const tpVals = Object.values(record.tpScores);
    const avgTP = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : 0;
    const mid = record.midSummative ?? avgTP;
    const finalS = record.finalSummative ?? avgTP;

    const finalScore = Math.round(avgTP * 0.5 + mid * 0.25 + finalS * 0.25);
    let predicate = "D";
    if (finalScore >= 90) predicate = "A";
    else if (finalScore >= 80) predicate = "B";
    else if (finalScore >= 70) predicate = "C";

    let description = "";
    if (predicate === "A") {
      description = "Menunjukkan penguasaan yang SANGAT BAIK pada seluruh Tujuan Pembelajaran.";
    } else if (predicate === "B") {
      description = "Menunjukkan penguasaan yang BAIK dalam mencapai Tujuan Pembelajaran.";
    } else if (predicate === "C") {
      description = "Menunjukkan penguasaan CUKUP, memerlukan bimbingan lebih lanjut.";
    } else {
      description = "Memerlukan pendampingan dan remedial khusus dalam mencapai TP.";
    }

    return { avgTP: Math.round(avgTP), mid, finalS, finalScore, predicate, description };
  };

  const handleExportLegerCSV = () => {
    const headers = ["No", "NIS", "Nama Murid", ...subjects, "Rata-Rata Total"];
    const rows = students.map((s, idx) => {
      let sum = 0;
      const scores = subjects.map((sub) => {
        const calc = calculateStudentFinal(s.id, sub);
        sum += calc.finalScore;
        return calc.finalScore;
      });
      const avgTotal = Math.round(sum / subjects.length);
      return [idx + 1, s.nis, s.name, ...scores, avgTotal];
    });
    exportToCSV(headers, rows, "Leger_Nilai_Raport");
  };

  const handlePrintLeger = () => {
    onOpenPrint(
      "LEGER REKAPITULASI NILAI RAPORT SISWA",
      `Tahun Pelajaran - Semester Berjalan | Kurikulum Merdeka`,
      (
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-800">
              <th className="border border-slate-300 p-2 text-center w-10">No</th>
              <th className="border border-slate-300 p-2 text-left">Nama Murid</th>
              {subjects.map((s) => (
                <th key={s} className="border border-slate-300 p-2 text-center">
                  {s}
                </th>
              ))}
              <th className="border border-slate-300 p-2 text-center bg-emerald-50">
                Rata-Rata
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              let sum = 0;
              return (
                <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-medium">{s.name}</td>
                  {subjects.map((sub) => {
                    const calc = calculateStudentFinal(s.id, sub);
                    sum += calc.finalScore;
                    return (
                      <td key={sub} className="border border-slate-300 p-2 text-center font-semibold">
                        {calc.finalScore || "-"}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 p-2 text-center font-bold text-emerald-800 bg-emerald-50/50">
                    {Math.round(sum / subjects.length)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            Pengolahan Nilai per TP (Bulk) & Leger Raport
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Input nilai formatif per TP secara langsung dalam tabel matriks, hitung rata-rata otomatis, dan cetak Leger Nilai Raport
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("input")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "input"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Input Bulk Matriks
          </button>
          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "rekap"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Leger Nilai Raport
          </button>
        </div>
      </div>

      {/* TAB 1: INPUT NILAI BULK MATRIKS */}
      {activeTab === "input" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Pilih Mata Pelajaran:</span>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedSubject === sub
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setSavedAlert(true);
                setTimeout(() => setSavedAlert(false), 2000);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Simpan Matriks Nilai
            </button>
          </div>

          {savedAlert && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700" />
              Data nilai {selectedSubject} telah tersimpan otomatis!
            </div>
          )}

          {/* Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3 py-3 text-center w-10">No</th>
                    <th className="px-4 py-3 min-w-[160px]">Nama Murid</th>
                    {tpList.map((tp) => (
                      <th key={tp} className="px-2 py-3 text-center w-16 bg-indigo-50/50">
                        {tp}
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center w-16 bg-blue-50/50">STS</th>
                    <th className="px-2 py-3 text-center w-16 bg-purple-50/50">SAS</th>
                    <th className="px-3 py-3 text-center w-20 bg-emerald-50 text-emerald-900">
                      Nilai Akhir
                    </th>
                    <th className="px-3 py-3 text-center w-12 bg-emerald-50 text-emerald-900">
                      Pred
                    </th>
                    <th className="px-4 py-3">Deskripsi Capaian Kompetensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const rec = getGradeRecord(s.id, selectedSubject);
                    const calc = calculateStudentFinal(s.id, selectedSubject);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{s.name}</td>

                        {/* TP Inputs */}
                        {tpList.map((tp) => (
                          <td key={tp} className="px-1 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={rec.tpScores[tp] ?? ""}
                              onChange={(e) =>
                                handleScoreChange(s.id, "tp", tp, parseInt(e.target.value, 10))
                              }
                              placeholder="0"
                              className="w-14 text-center px-1 py-1 border border-slate-300 rounded font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                        ))}

                        {/* STS */}
                        <td className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={rec.midSummative ?? ""}
                            onChange={(e) =>
                              handleScoreChange(s.id, "mid", null, parseInt(e.target.value, 10))
                            }
                            placeholder="0"
                            className="w-14 text-center px-1 py-1 border border-blue-300 bg-blue-50/30 rounded font-semibold text-xs"
                          />
                        </td>

                        {/* SAS */}
                        <td className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={rec.finalSummative ?? ""}
                            onChange={(e) =>
                              handleScoreChange(s.id, "final", null, parseInt(e.target.value, 10))
                            }
                            placeholder="0"
                            className="w-14 text-center px-1 py-1 border border-purple-300 bg-purple-50/30 rounded font-semibold text-xs"
                          />
                        </td>

                        {/* Nilai Akhir & Predikat */}
                        <td className="px-3 py-2.5 text-center font-extrabold text-sm text-emerald-900 bg-emerald-50/40">
                          {calc.finalScore || 0}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              calc.predicate === "A"
                                ? "bg-emerald-100 text-emerald-800"
                                : calc.predicate === "B"
                                ? "bg-blue-100 text-blue-800"
                                : calc.predicate === "C"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {calc.predicate}
                          </span>
                        </td>

                        {/* Auto Description */}
                        <td className="px-4 py-2.5 text-slate-600 text-[11px] leading-snug italic">
                          {calc.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEGER REKAP NILAI */}
      {activeTab === "rekap" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-bold text-sm text-slate-800">Leger Nilai Akhir Seluruh Mata Pelajaran</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportLegerCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor CSV
              </button>
              <button
                onClick={handlePrintLeger}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Leger Raport
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Murid</th>
                    {subjects.map((sub) => (
                      <th key={sub} className="px-3 py-3 text-center">
                        {sub}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-900 font-extrabold">
                      Rata-Rata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    let sum = 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.nis}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        {subjects.map((sub) => {
                          const calc = calculateStudentFinal(s.id, sub);
                          sum += calc.finalScore;
                          return (
                            <td key={sub} className="px-3 py-3 text-center font-semibold text-slate-800">
                              {calc.finalScore || "-"}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-extrabold text-sm text-emerald-900 bg-emerald-50/50">
                          {Math.round(sum / subjects.length)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
