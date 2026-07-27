import React, { useState } from "react";
import { Student, AttendanceRecord, AttendanceStatus } from "../../types";
import { UserCheck, Calendar, CheckCircle2, Save, Printer, Download, Filter, Search, FileText } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportAttendanceToExcel } from "../../lib/exportExcel";

interface BulkAttendanceViewProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onSaveAttendance: (updatedRecords: AttendanceRecord[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const BulkAttendanceView: React.FC<BulkAttendanceViewProps> = ({
  students,
  attendanceRecords,
  onSaveAttendance,
  onOpenPrint,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  // Local state for selected date's bulk entry
  const [dailyStatusMap, setDailyStatusMap] = useState<
    Record<string, { status: AttendanceStatus; reason: string }>
  >(() => {
    const map: Record<string, { status: AttendanceStatus; reason: string }> = {};
    const existing = attendanceRecords.filter((r) => r.date === selectedDate);
    students.forEach((s) => {
      const rec = existing.find((r) => r.studentId === s.id);
      map[s.id] = {
        status: rec ? rec.status : "H",
        reason: rec ? rec.reason || "" : "",
      };
    });
    return map;
  });

  const [activeTab, setActiveTab] = useState<"input" | "rekap">("input");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [savedAlert, setSavedAlert] = useState(false);

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const map: Record<string, { status: AttendanceStatus; reason: string }> = {};
    const existing = attendanceRecords.filter((r) => r.date === newDate);
    students.forEach((s) => {
      const rec = existing.find((r) => r.studentId === s.id);
      map[s.id] = {
        status: rec ? rec.status : "H",
        reason: rec ? rec.reason || "" : "",
      };
    });
    setDailyStatusMap(map);
  };

  const handleMarkAllHadir = () => {
    setDailyStatusMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { status: "H", reason: "" };
      });
      return updated;
    });
  };

  const handleStatusChange = (
    studentId: string,
    status: AttendanceStatus,
    reason: string = ""
  ) => {
    setDailyStatusMap((prev) => ({
      ...prev,
      [studentId]: { status, reason },
    }));
  };

  const handleSaveDailyAttendance = () => {
    // Filter out existing records for selectedDate
    const otherRecords = attendanceRecords.filter((r) => r.date !== selectedDate);
    const newRecordsForDate: AttendanceRecord[] = [];

    Object.entries(dailyStatusMap).forEach(([studentId, data]: [string, { status: AttendanceStatus; reason: string }]) => {
      // Only keep record if status is not 'H' or if explicitly marked
      newRecordsForDate.push({
        id: `att_${selectedDate}_${studentId}`,
        date: selectedDate,
        studentId,
        status: data.status,
        reason: data.reason,
      });
    });

    onSaveAttendance([...otherRecords, ...newRecordsForDate]);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  // Helper for Rekap Format
  const getFormattedDateReasonLog = (studentId: string): string[] => {
    return attendanceRecords
      .filter((r) => {
        if (r.studentId !== studentId) return false;
        if (r.status === "H") return false; // Only show non-hadir
        if (selectedMonthFilter !== "all") {
          return (r.date || "").startsWith(selectedMonthFilter);
        }
        return true;
      })
      .map((r) => {
        const [yyyy, mm, dd] = (r.date || "").split("-");
        const dayFormatted = parseInt(dd || "0", 10);
        const monthFormatted = parseInt(mm || "0", 10);
        const code = r.status;
        const reasonStr = r.reason ? ` (${r.reason})` : "";
        // Strict format requested: (dd/m -- S/I/A)
        return `${dayFormatted}/${monthFormatted} -- ${code}${reasonStr}`;
      });
  };

  const getStudentStats = (studentId: string) => {
    const filtered = attendanceRecords.filter((r) => {
      if (r.studentId !== studentId) return false;
      if (selectedMonthFilter !== "all") return (r.date || "").startsWith(selectedMonthFilter);
      return true;
    });
    return {
      H: filtered.filter((r) => r.status === "H").length,
      S: filtered.filter((r) => r.status === "S").length,
      I: filtered.filter((r) => r.status === "I").length,
      A: filtered.filter((r) => r.status === "A").length,
    };
  };

  const handleExportRekapCSV = () => {
    const headers = ["No", "NIS", "Nama Siswa", "Sakit (S)", "Izin (I)", "Alpa (A)", "Log Tanggal & Penyebab Absen (dd/m -- S/I/A)"];
    const rows = students.map((s, idx) => {
      const stats = getStudentStats(s.id);
      const logs = getFormattedDateReasonLog(s.id).join(" ; ");
      return [idx + 1, s.nis, s.name, stats.S, stats.I, stats.A, logs || "Hadir Penuh"];
    });
    exportToCSV(headers, rows, "Rekap_Presensi_Murid");
  };

  const handleExportRekapDoc = () => {
    const tableHtml = `
      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead>
          <tr style="background-color:#f3f4f6; font-weight:bold;">
            <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Nama Siswa</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">S</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">I</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">A</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Tanggal & Penyebab Absen</th>
          </tr>
        </thead>
        <tbody>
          ${students
            .map((s, idx) => {
              const stats = getStudentStats(s.id);
              const logs = getFormattedDateReasonLog(s.id).join(", ");
              return `
            <tr>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #333; padding:5px;">${s.name}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${stats.S || "-"}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${stats.I || "-"}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${stats.A || "-"}</td>
              <td style="border:1px solid #333; padding:5px;">${logs || "Hadir Penuh"}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: "Rekap_Presensi_Murid.doc",
      title: "REKAPITULASI PRESENSI KEHADIRAN SISWA",
    });
  };

  const handlePrintRekap = () => {
    onOpenPrint(
      "REKAPITULASI PRESENSI KEHADIRAN SISWA",
      `Format Keterangan: Tanggal (dd/m -- S/I/A) & Cause Log`,
      (
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-800">
              <th className="border border-slate-300 p-2 text-center w-10">No</th>
              <th className="border border-slate-300 p-2 text-left">Nama Siswa</th>
              <th className="border border-slate-300 p-2 text-center w-12">S</th>
              <th className="border border-slate-300 p-2 text-center w-12">I</th>
              <th className="border border-slate-300 p-2 text-center w-12">A</th>
              <th className="border border-slate-300 p-2 text-left">Tanggal & Penyebab Absen (Format: dd/m -- S/I/A)</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const stats = getStudentStats(s.id);
              const logs = getFormattedDateReasonLog(s.id);
              return (
                <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-medium">{s.name}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-amber-700">{stats.S || "-"}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">{stats.I || "-"}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-red-700">{stats.A || "-"}</td>
                  <td className="border border-slate-300 p-2 font-mono text-[11px]">
                    {logs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {logs.map((log, i) => (
                          <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {log}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Hadir Penuh</span>
                    )}
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
      {/* Top Banner & Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            Sistem Absensi & Rekap Kehadiran Murid
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Input absen massal (bulk) & rekap otomatis dengan format detail tanggal & penyebab absen <code>(dd/m -- S/I/A)</code>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("input")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "input"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Input Absen Bulk
          </button>
          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "rekap"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rekap Absen & Detail Log
          </button>
        </div>
      </div>

      {savedAlert && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          Data presensi tanggal {selectedDate} berhasil disimpan!
        </div>
      )}

      {/* TAB 1: INPUT ABSEN BULK */}
      {activeTab === "input" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <div>
                <label className="block text-xs font-bold text-slate-700">Tanggal Presensi</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleMarkAllHadir}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors"
              >
                ⚡ Tandai Hadir Semua
              </button>
              <button
                type="button"
                onClick={handleSaveDailyAttendance}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Simpan Presensi Hari Ini
              </button>
            </div>
          </div>

          {/* Bulk Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Lengkap Murid</th>
                    <th className="px-4 py-3 text-center">Status Kehadiran</th>
                    <th className="px-4 py-3">Penyebab / Alasan Absen (Jika S/I/A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const current = dailyStatusMap[s.id] || { status: "H", reason: "" };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.nis}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center space-x-1.5">
                            {[
                              { code: "H" as AttendanceStatus, label: "Hadir", color: "bg-emerald-600 text-white" },
                              { code: "S" as AttendanceStatus, label: "Sakit", color: "bg-amber-600 text-white" },
                              { code: "I" as AttendanceStatus, label: "Izin", color: "bg-blue-600 text-white" },
                              { code: "A" as AttendanceStatus, label: "Alpa", color: "bg-red-600 text-white" },
                            ].map((item) => {
                              const selected = current.status === item.code;
                              return (
                                <button
                                  key={item.code}
                                  type="button"
                                  onClick={() => handleStatusChange(s.id, item.code, current.reason)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                    selected
                                      ? `${item.color} ring-2 ring-slate-400/40 shadow-xs`
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {item.code}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={current.reason}
                            disabled={current.status === "H"}
                            onChange={(e) => handleStatusChange(s.id, current.status, e.target.value)}
                            placeholder={
                              current.status === "H"
                                ? "Siswa hadir"
                                : "Contoh: Demam, Acara keluarga..."
                            }
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
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

      {/* TAB 2: REKAP ABSEN & LOG DETAIL */}
      {activeTab === "rekap" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Filter Bulan:</span>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Semua Bulan Semester Ini</option>
                <option value="2025-07">Juli 2025</option>
                <option value="2025-08">Agustus 2025</option>
                <option value="2025-09">September 2025</option>
                <option value="2025-10">Oktober 2025</option>
                <option value="2025-11">November 2025</option>
                <option value="2025-12">Desember 2025</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportAttendanceToExcel(students, attendanceRecords, selectedMonthFilter)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Ekspor ke Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-100" />
                Ekspor Excel (.xlsx)
              </button>
              <button
                onClick={handleExportRekapDoc}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Simpan dalam bentuk Word (.docx / .doc)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Simpan Word (.docx)
              </button>
              <button
                onClick={handlePrintRekap}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                title="Cetak Laporan / PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / PDF
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
                    <th className="px-3 py-3 text-center text-amber-700 w-12">S</th>
                    <th className="px-3 py-3 text-center text-blue-700 w-12">I</th>
                    <th className="px-3 py-3 text-center text-red-700 w-12">A</th>
                    <th className="px-4 py-3">Detail Tanggal & Penyebab Absen (Format: dd/m -- S/I/A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const stats = getStudentStats(s.id);
                    const logs = getFormattedDateReasonLog(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.nis}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="px-3 py-3 text-center font-bold text-amber-700 bg-amber-50/50">
                          {stats.S || "-"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-blue-700 bg-blue-50/50">
                          {stats.I || "-"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-red-700 bg-red-50/50">
                          {stats.A || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {logs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {logs.map((logStr, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]"
                                >
                                  {logStr}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Tidak ada catatan absen (Nir-Absen)</span>
                          )}
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
