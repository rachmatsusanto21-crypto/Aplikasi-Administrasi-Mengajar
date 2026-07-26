import React, { useState, useMemo } from "react";
import { AcademicCalendarEvent, SchoolIdentity, TimetableSlot, IncidentalJournalEntry, ProtaItem } from "../../types";
import { Calendar, Plus, Trash2, Edit2, Printer, Download, Calculator, FileText, Settings, Clock, BookOpen } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";

interface AcademicCalendarViewProps {
  schoolIdentity: SchoolIdentity;
  events: AcademicCalendarEvent[];
  timetable: TimetableSlot[];
  subjects: string[];
  incidentalJournals?: IncidentalJournalEntry[];
  protaList?: ProtaItem[];
  onUpdateSchoolIdentity: (updated: SchoolIdentity) => void;
  onSaveEvents: (updated: AcademicCalendarEvent[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  schoolIdentity,
  events,
  timetable,
  subjects,
  incidentalJournals = [],
  protaList = [],
  onUpdateSchoolIdentity,
  onSaveEvents,
  onOpenPrint,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Form states for calendar config
  const [startDate, setStartDate] = useState(schoolIdentity.academicYearStartDate || "2025-07-14");
  const [endDate, setEndDate] = useState(schoolIdentity.academicYearEndDate || "2026-06-20");
  const [academicYearStr, setAcademicYearStr] = useState(schoolIdentity.academicYear || "2025/2026");

  const [form, setForm] = useState<Partial<AcademicCalendarEvent>>({
    date: new Date().toISOString().slice(0, 10),
    type: "Libur",
  });

  const handleSaveConfig = () => {
    onUpdateSchoolIdentity({
      ...schoolIdentity,
      academicYear: academicYearStr,
      academicYearStartDate: startDate,
      academicYearEndDate: endDate,
    });
    setIsConfigOpen(false);
  };

  const months = [
    { name: "Juli 2025", totalDays: 31, defaultEffective: 14, defaultWeeks: 2 },
    { name: "Agustus 2025", totalDays: 31, defaultEffective: 21, defaultWeeks: 4 },
    { name: "September 2025", totalDays: 30, defaultEffective: 22, defaultWeeks: 4 },
    { name: "Oktober 2025", totalDays: 31, defaultEffective: 23, defaultWeeks: 5 },
    { name: "November 2025", totalDays: 30, defaultEffective: 21, defaultWeeks: 4 },
    { name: "Desember 2025", totalDays: 31, defaultEffective: 12, defaultWeeks: 2 },
    { name: "Januari 2026", totalDays: 31, defaultEffective: 20, defaultWeeks: 4 },
    { name: "Februari 2026", totalDays: 28, defaultEffective: 19, defaultWeeks: 4 },
    { name: "Maret 2026", totalDays: 31, defaultEffective: 18, defaultWeeks: 3 },
    { name: "April 2026", totalDays: 30, defaultEffective: 20, defaultWeeks: 4 },
    { name: "Mei 2026", totalDays: 31, defaultEffective: 18, defaultWeeks: 3 },
    { name: "Juni 2026", totalDays: 30, defaultEffective: 10, defaultWeeks: 2 },
  ];

  // Helper map for Day Names to JS Date getDay()
  const dayNameToIndex: Record<string, number> = {
    Minggu: 0,
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
    Sabtu: 6,
  };

  // Helper to check if a YYYY-MM-DD date falls on a holiday or event
  const isDateHolidayOrEvent = (dateStr: string) => {
    // Check calendar events
    const matchingEvt = events.find((e) => {
      if (e.type !== "Libur" && e.type !== "Kegiatan Sekolah") return false;
      if (!e.endDate) return e.date === dateStr;
      return dateStr >= e.date && dateStr <= e.endDate;
    });

    if (matchingEvt) return { isHoliday: true, reason: matchingEvt.title, type: matchingEvt.type };

    // Check incidental journals if any
    const matchingInc = incidentalJournals.find((j) => j.date === dateStr);
    if (matchingInc) return { isHoliday: true, reason: matchingInc.activityName, type: "Insidental" };

    return { isHoliday: false, reason: "", type: "" };
  };

  // Calculation of Effective Days & Hours per Subject
  const subjectCalculations = useMemo(() => {
    // Parse YYYY-MM-DD at noon local time to avoid timezone drift
    const parseLocalYMD = (str: string) => {
      const parts = (str || "").split("-").map(Number);
      if (parts.length < 3) return new Date();
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    };

    const formatLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const start = parseLocalYMD(startDate);
    const end = parseLocalYMD(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
    }

    // Build map of weekly timetable slots per subject
    // e.g., subject -> { "Senin": 3, "Selasa": 2 }
    const subjectDaySlots: Record<string, Record<string, number>> = {};

    subjects.forEach((sub) => {
      subjectDaySlots[sub] = {
        Senin: 0,
        Selasa: 0,
        Rabu: 0,
        Kamis: 0,
        Jumat: 0,
        Sabtu: 0,
      };
    });

    // Normalize subject strings to eliminate whitespace/casing mismatches
    const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");

    // Deduplicate slots by unique key `${slot.day}_${slot.period}` to prevent duplicate entries
    const uniqueSlotsMap = new Map<string, TimetableSlot>();
    (timetable || []).forEach((slot) => {
      if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
        const key = `${slot.day.trim()}_${slot.period}`;
        uniqueSlotsMap.set(key, slot);
      }
    });

    uniqueSlotsMap.forEach((slot) => {
      const slotSubNorm = normalizeSub(slot.subject);
      const matchedSub = subjects.find((s) => normalizeSub(s) === slotSubNorm);
      if (matchedSub && subjectDaySlots[matchedSub]) {
        const dayKey = slot.day.trim();
        if (subjectDaySlots[matchedSub][dayKey] !== undefined) {
          subjectDaySlots[matchedSub][dayKey] += 1; // 1 JP per period slot
        }
      }
    });

    // Loop date by date from start to end
    const results: Record<
      string,
      {
        subject: string;
        weeklyScheduleSummary: string;
        weeklyJP: number;
        totalScheduledMeetings: number;
        holidayMeetingsLost: number;
        effectiveMeetings: number;
        totalJP: number;
        lostJP: number;
        effectiveJP: number;
        sem1EffectiveMeetings: number;
        sem1EffectiveJP: number;
        sem2EffectiveMeetings: number;
        sem2EffectiveJP: number;
      }
    > = {};

    subjects.forEach((sub) => {
      const scheduleMap = subjectDaySlots[sub] || {};
      const scheduledDays = Object.entries(scheduleMap).filter(([_, count]) => count > 0);
      const weeklyJP = scheduledDays.reduce((acc, [_, count]) => acc + count, 0);
      const weeklyScheduleSummary =
        scheduledDays.length > 0
          ? scheduledDays.map(([day, count]) => `${day} (${count} JP)`).join(", ") + ` → Total ${weeklyJP} JP/minggu`
          : "Belum Diatur di Jadwal";

      results[sub] = {
        subject: sub,
        weeklyScheduleSummary,
        weeklyJP,
        totalScheduledMeetings: 0,
        holidayMeetingsLost: 0,
        effectiveMeetings: 0,
        totalJP: 0,
        lostJP: 0,
        effectiveJP: 0,
        sem1EffectiveMeetings: 0,
        sem1EffectiveJP: 0,
        sem2EffectiveMeetings: 0,
        sem2EffectiveJP: 0,
      };
    });

    const curr = new Date(start);
    while (curr <= end) {
      const dayIdx = curr.getDay(); // 0 = Sun, 1 = Mon ...
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const currentDayName = dayNames[dayIdx];

      // Format date YYYY-MM-DD cleanly using local date getters
      const dateStr = formatLocalYMD(curr);
      const holidayInfo = isDateHolidayOrEvent(dateStr);

      const monthIdx = curr.getMonth();
      const isSem1 = monthIdx >= 6; // July(6) to Dec(11) is Semester 1 (Ganjil)

      if (dayIdx !== 0) {
        // Skip Sundays
        subjects.forEach((sub) => {
          const jpOnDay = subjectDaySlots[sub]?.[currentDayName] || 0;
          if (jpOnDay > 0) {
            results[sub].totalScheduledMeetings += 1;
            results[sub].totalJP += jpOnDay;

            if (holidayInfo.isHoliday) {
              results[sub].holidayMeetingsLost += 1;
              results[sub].lostJP += jpOnDay; // Deducts the exact JP allocated for that day
            } else {
              results[sub].effectiveMeetings += 1;
              results[sub].effectiveJP += jpOnDay;

              if (isSem1) {
                results[sub].sem1EffectiveMeetings += 1;
                results[sub].sem1EffectiveJP += jpOnDay;
              } else {
                results[sub].sem2EffectiveMeetings += 1;
                results[sub].sem2EffectiveJP += jpOnDay;
              }
            }
          }
        });
      }

      curr.setDate(curr.getDate() + 1);
    }

    return Object.values(results);
  }, [startDate, endDate, subjects, timetable, events, incidentalJournals]);

  const handleDelete = (id: string) => {
    if (confirm("Hapus agenda kalender pendidikan ini?")) {
      onSaveEvents(events.filter((e) => e.id !== id));
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      title: "",
      type: "Libur",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: AcademicCalendarEvent) => {
    setEditingId(evt.id);
    setForm(evt);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    if (editingId) {
      onSaveEvents(
        events.map((evt) => (evt.id === editingId ? ({ ...evt, ...form } as AcademicCalendarEvent) : evt))
      );
    } else {
      const newEvt: AcademicCalendarEvent = {
        id: "cal_" + Date.now(),
        date: form.date || new Date().toISOString().slice(0, 10),
        endDate: form.endDate || undefined,
        title: form.title || "",
        type: form.type as any,
        description: form.description || "",
      };
      onSaveEvents([...events, newEvt]);
    }
    setIsModalOpen(false);
  };

  const totalEffectiveDaysSem1 = months.slice(0, 6).reduce((a, b) => a + b.defaultEffective, 0);
  const totalEffectiveDaysSem2 = months.slice(6, 12).reduce((a, b) => a + b.defaultEffective, 0);

  const handleExportCSV = () => {
    const headers = ["No", "Mata Pelajaran", "Jadwal & JP/Minggu", "Total Pertemuan", "Batal (Libur/Event)", "Pertemuan Efektif", "JP Efektif Net"];
    const rows = subjectCalculations.map((sc, idx) => [
      idx + 1,
      sc.subject,
      sc.weeklyScheduleSummary,
      sc.totalScheduledMeetings,
      sc.holidayMeetingsLost,
      sc.effectiveMeetings,
      `${sc.effectiveJP} JP`,
    ]);
    exportToCSV(headers, rows, `Jam_Efektif_Per_Mapel_${academicYearStr.replace("/", "-")}`);
  };

  const handleExportDoc = () => {
    const tableHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 11pt;">
        <h3 style="text-align: center; font-size: 14pt; margin-bottom: 5px;">KALENDER PENDIDIKAN & ANALISIS HARI/JAM EFEKTIF BELAJAR</h3>
        <p style="text-align: center; margin-top: 0; font-weight: bold; color: #333;">Tahun Pelajaran ${academicYearStr} | ${schoolIdentity.schoolName}</p>
        <p style="text-align: center; font-size: 10pt; color: #555;">Periode: ${startDate} s.d. ${endDate}</p>
        <hr style="margin: 15px 0; border: 1px solid #000;"/>

        <h4 style="margin-top: 20px; font-size: 12pt;">1. Hitungan Hari & Jam Pelajaran (JP) Efektif Per Mata Pelajaran</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #333; padding: 6px;">No</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Mata Pelajaran</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Jadwal Hari & JP/Minggu</th>
              <th style="border: 1px solid #333; padding: 6px;">Pertemuan Rencana</th>
              <th style="border: 1px solid #333; padding: 6px;">Berkurang (Libur/Event)</th>
              <th style="border: 1px solid #333; padding: 6px;">Pertemuan Efektif</th>
              <th style="border: 1px solid #333; padding: 6px;">Net JP Efektif</th>
            </tr>
          </thead>
          <tbody>
            ${subjectCalculations
              .map(
                (sc, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${sc.subject}</td>
                <td style="border: 1px solid #333; padding: 6px;">${sc.weeklyScheduleSummary}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${sc.totalScheduledMeetings} Hari</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; color: #dc2626;">-${sc.holidayMeetingsLost} Hari (${sc.lostJP} JP)</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; color: #059669;">${sc.effectiveMeetings} Hari</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; background-color: #ecfdf5; color: #065f46;">${sc.effectiveJP} JP</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top: 25px; font-size: 12pt;">2. Agenda Kalender Pendidikan & Hari Libur</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #333; padding: 6px; width: 40px;">No</th>
              <th style="border: 1px solid #333; padding: 6px; width: 140px;">Tanggal / Periode</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Nama Agenda / Kegiatan</th>
              <th style="border: 1px solid #333; padding: 6px;">Kategori</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${events
              .map(
                (e, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${e.endDate ? `${e.date} s.d. ${e.endDate}` : e.date}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${e.title}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${e.type}</td>
                <td style="border: 1px solid #333; padding: 6px;">${e.description || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: `Kalender_Pendidikan_Dan_Jam_Efektif_${academicYearStr.replace("/", "-")}.doc`,
      title: `KALENDER PENDIDIKAN & HARI EFEKTIF BELAJAR`,
    });
  };

  const handlePrint = () => {
    onOpenPrint(
      "KALENDER PENDIDIKAN & REKAPITULASI HARI/JAM EFEKTIF BELAJAR",
      `Tahun Pelajaran ${academicYearStr} - ${schoolIdentity.schoolName}`,
      (
        <div className="space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-2">1. Hitungan Hari & Jam Pelajaran (JP) Efektif Per Mata Pelajaran</h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-300 p-2 text-left">Jadwal Minggu</th>
                  <th className="border border-slate-300 p-2 text-center">Rencana Pertemuan</th>
                  <th className="border border-slate-300 p-2 text-center">Libur / Event</th>
                  <th className="border border-slate-300 p-2 text-center">Pertemuan Efektif</th>
                  <th className="border border-slate-300 p-2 text-center font-bold">Net JP Efektif</th>
                </tr>
              </thead>
              <tbody>
                {subjectCalculations.map((sc, idx) => (
                  <tr key={sc.subject} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-bold">{sc.subject}</td>
                    <td className="border border-slate-300 p-2 text-slate-600">{sc.weeklyScheduleSummary}</td>
                    <td className="border border-slate-300 p-2 text-center">{sc.totalScheduledMeetings} Hari</td>
                    <td className="border border-slate-300 p-2 text-center text-red-600">-{sc.holidayMeetingsLost} Hari</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">{sc.effectiveMeetings} Hari</td>
                    <td className="border border-slate-300 p-2 text-center font-extrabold text-emerald-900 bg-emerald-50/50">{sc.effectiveJP} JP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-2">2. Daftar Agenda & Hari Libur Kalender Pendidikan</h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="border border-slate-300 p-2 text-center w-10">No</th>
                  <th className="border border-slate-300 p-2 text-center w-32">Tanggal</th>
                  <th className="border border-slate-300 p-2 text-left">Nama Agenda / Kegiatan</th>
                  <th className="border border-slate-300 p-2 text-center w-28">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, idx) => (
                  <tr key={e.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{e.endDate ? `${e.date} s.d. ${e.endDate}` : e.date}</td>
                    <td className="border border-slate-300 p-2 font-bold">{e.title}</td>
                    <td className="border border-slate-300 p-2 text-center">{e.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Kalender Pendidikan & Penghitungan Hari/Jam Efektif
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penyesuaian tahun pelajaran mengacu ke Identitas Sekolah ({academicYearStr}) & kalkulasi otomatis berdasarkan jadwal pelajaran
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            Atur Tahun Pelajaran
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Agenda Kalender
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
            title="Ekspor CSV / Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan Word (.docx)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Simpan Word (.docx)
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Info Card Academic Year Range */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">Tahun Pelajaran Aktif</div>
            <div className="text-lg font-extrabold text-white">{academicYearStr} ({schoolIdentity.schoolName})</div>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold">TANGGAL MULAI TP:</span>
            <span className="font-mono font-bold text-emerald-300">{startDate}</span>
          </div>
          <div className="h-6 border-r border-slate-700" />
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold">TANGGAL BERAKHIR TP:</span>
            <span className="font-mono font-bold text-emerald-300">{endDate}</span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors ml-2"
          >
            Ubah Tanggal
          </button>
        </div>
      </div>

      {/* NEW FEATURE TABLE: Hitungan Hari & Jam Efektif per Mata Pelajaran */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Tabel Hitungan Hari & Jam Pelajaran (JP) Efektif per Mata Pelajaran
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dihitung otomatis mengacu pada Jadwal Pelajaran (Timetable) & dikurangi hari libur/event insidental
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-2.5 rounded-xl text-xs space-y-0.5 max-w-xl">
            <p className="font-bold text-[11px] text-emerald-900 flex items-center gap-1">
              <span>💡 Formulasi Pengurangan JP Presisi per Hari:</span>
            </p>
            <p className="text-[11px] text-slate-700 leading-tight">
              Libur/event pada hari tertentu mengurangi JP sesuai alokasi hari tersebut di Jadwal. <i>Contoh: Jika total alokasi 90 JP dan ada event pada hari Senin (Bahasa Indonesia 3 JP), maka Net JP Efektif = 90 - 3 = 87 JP.</i>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-3 text-center w-8">No</th>
                <th className="px-3 py-3">Mata Pelajaran</th>
                <th className="px-3 py-3">Jadwal Mingguan</th>
                <th className="px-3 py-3 text-center text-teal-800 bg-teal-50/60">Pertemuan Efektif Sem 1</th>
                <th className="px-3 py-3 text-center text-teal-900 bg-teal-100/60">JP Sem 1</th>
                <th className="px-3 py-3 text-center text-indigo-800 bg-indigo-50/60">Pertemuan Efektif Sem 2</th>
                <th className="px-3 py-3 text-center text-indigo-900 bg-indigo-100/60">JP Sem 2</th>
                <th className="px-3 py-3 text-center text-red-600 bg-red-50/40">Pengurangan Libur</th>
                <th className="px-3 py-3 text-center text-emerald-950 bg-emerald-100 font-extrabold">Total Net JP Setahun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectCalculations.map((sc, idx) => (
                <tr key={sc.subject} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-3 py-3 font-bold text-slate-900">{sc.subject}</td>
                  <td className="px-3 py-3 font-medium text-slate-600">{sc.weeklyScheduleSummary}</td>
                  <td className="px-3 py-3 text-center font-mono font-semibold text-teal-800 bg-teal-50/30">
                    {sc.sem1EffectiveMeetings} Hari
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-teal-900 bg-teal-100/30">
                    {sc.sem1EffectiveJP} JP
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-semibold text-indigo-800 bg-indigo-50/30">
                    {sc.sem2EffectiveMeetings} Hari
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-indigo-900 bg-indigo-100/30">
                    {sc.sem2EffectiveJP} JP
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-red-600 bg-red-50/20">
                    -{sc.holidayMeetingsLost} Hari ({sc.lostJP} JP)
                  </td>
                  <td className="px-3 py-3 text-center font-extrabold text-emerald-900 bg-emerald-100/60 font-mono text-xs">
                    {sc.effectiveJP} JP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">Semester I (Ganjil)</span>
            <Calculator className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="text-3xl font-extrabold">{totalEffectiveDaysSem1} Hari Efektif Belajar</div>
          <p className="text-xs text-emerald-100">
            Total perkiraan 19 Minggu Efektif Pembelajaran (Juli - Desember)
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Semester II (Genap)</span>
            <Calculator className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="text-3xl font-extrabold">{totalEffectiveDaysSem2} Hari Efektif Belajar</div>
          <p className="text-xs text-indigo-100">
            Total perkiraan 18 Minggu Efektif Pembelajaran (Januari - Juni)
          </p>
        </div>
      </div>

      {/* Events Agenda List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Agenda & Hari Libur Kalender Pendidikan</h3>
          <button
            onClick={handleOpenAdd}
            className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Agenda
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-all bg-slate-50/50"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  {evt.endDate ? `${evt.date} s.d. ${evt.endDate}` : evt.date}
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">{evt.title}</p>
                <p className="text-[11px] text-slate-500">{evt.type} {evt.description ? `- ${evt.description}` : ""}</p>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEdit(evt)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(evt.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Settings Academic Year Dates */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Atur Tahun Pelajaran & Tanggal Pelaksanaan
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tahun Pelajaran</label>
                <input
                  type="text"
                  value={academicYearStr}
                  onChange={(e) => setAcademicYearStr(e.target.value)}
                  className="w-full p-2 border rounded-lg font-bold"
                  placeholder="Contoh: 2025/2026"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Mulai Tahun Pelajaran</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Selesai Tahun Pelajaran</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit Agenda Kalender" : "Tambah Agenda Kalender Baru"}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={form.date || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tanggal Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={form.endDate || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Agenda / Kegiatan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Tengah Semester / Libur Nasional"
                  value={form.title || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Kategori Agenda</label>
                <select
                  value={form.type || "Libur"}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="Libur">Hari Libur (Nasional / Keagamaan)</option>
                  <option value="Kegiatan Sekolah">Kegiatan Sekolah / MPLS / Classmeeting</option>
                  <option value="Ujian / Asesmen">Asesmen / Ujian (PTS/PAS/ANBK)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  value={form.description || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
