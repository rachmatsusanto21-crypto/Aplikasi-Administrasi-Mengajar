import React, { useState } from "react";
import { AcademicCalendarEvent } from "../../types";
import { Calendar, Plus, Trash2, Edit2, Printer, Download, Calculator, CheckCircle2 } from "lucide-react";
import { exportToCSV } from "../../lib/storage";

interface AcademicCalendarViewProps {
  events: AcademicCalendarEvent[];
  onSaveEvents: (updated: AcademicCalendarEvent[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  events,
  onSaveEvents,
  onOpenPrint,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<AcademicCalendarEvent>>({
    date: new Date().toISOString().slice(0, 10),
    type: "Libur",
  });

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
    const headers = ["No", "Tanggal / Periode", "Nama Kegiatan / Agenda Kalender", "Jenis Agenda", "Keterangan"];
    const rows = events.map((e, idx) => [
      idx + 1,
      e.endDate ? `${e.date} s.d. ${e.endDate}` : e.date,
      e.title,
      e.type,
      e.description || "-",
    ]);
    exportToCSV(headers, rows, "Kalender_Pendidikan_Sekolah");
  };

  const handlePrint = () => {
    onOpenPrint(
      "KALENDER PENDIDIKAN & REKAPITULASI HARI EFEKTIF BELAJAR (HEB)",
      "Tahun Pelajaran 2025/2026 - Kurikulum Merdeka",
      (
        <div className="space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-2">1. Rekapitulasi Minggu & Hari Efektif Belajar (HEB)</h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="border border-slate-300 p-2 text-center">Bulan</th>
                  <th className="border border-slate-300 p-2 text-center">Jumlah Hari</th>
                  <th className="border border-slate-300 p-2 text-center">Hari Efektif (HEB)</th>
                  <th className="border border-slate-300 p-2 text-center">Minggu Efektif (MEB)</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.name} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-300 p-2 font-medium">{m.name}</td>
                    <td className="border border-slate-300 p-2 text-center">{m.totalDays}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-emerald-800">{m.defaultEffective}</td>
                    <td className="border border-slate-300 p-2 text-center font-semibold">{m.defaultWeeks} Minggu</td>
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
            Kalender Pendidikan & Penghitungan Hari Efektif (HEB)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penghitungan alokasi minggu efektif & hari efektif belajar untuk dasar penyusunan Prota & Promes
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Agenda Kalender
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">Semester I (Ganjil)</span>
            <Calculator className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="text-3xl font-extrabold">{totalEffectiveDaysSem1} Hari Efektif</div>
          <p className="text-xs text-emerald-100">
            Total alokasi 19 Minggu Efektif Pembelajaran (Juli - Desember 2025)
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Semester II (Genap)</span>
            <Calculator className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="text-3xl font-extrabold">{totalEffectiveDaysSem2} Hari Efektif</div>
          <p className="text-xs text-indigo-100">
            Total alokasi 18 Minggu Efektif Pembelajaran (Januari - Juni 2026)
          </p>
        </div>
      </div>

      {/* Table Month Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800">
          Tabel Alokasi Minggu & Hari Efektif Belajar per Bulan
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Nama Bulan</th>
                <th className="px-4 py-3 text-center">Jumlah Hari Kalender</th>
                <th className="px-4 py-3 text-center text-emerald-800 bg-emerald-50/50">Hari Efektif Belajar (HEB)</th>
                <th className="px-4 py-3 text-center text-indigo-800 bg-indigo-50/50">Minggu Efektif (MEB)</th>
                <th className="px-4 py-3">Keterangan Utama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((m, idx) => (
                <tr key={m.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600 font-mono">{m.totalDays} Hari</td>
                  <td className="px-4 py-3 text-center font-extrabold text-emerald-800 bg-emerald-50/30">
                    {m.defaultEffective} Hari
                  </td>
                  <td className="px-4 py-3 text-center font-extrabold text-indigo-800 bg-indigo-50/30">
                    {m.defaultWeeks} Minggu
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {idx === 0 && "Awal Masuk Sekolah / MPLS"}
                    {idx === 5 && "Penilaian Akhir Semester & Libur Semester 1"}
                    {idx === 8 && "Perkiraan Libur Awal Ramadhan"}
                    {idx === 11 && "Penilaian Akhir Tahun & Libur Akhir Tahun"}
                    {![0, 5, 8, 11].includes(idx) && "KBM Efektif Reguler"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events Agenda List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Agenda & Hari Libur Kalender Pendidikan</h3>

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
                <label className="block font-semibold mb-1">Keterangan Tamahan</label>
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
