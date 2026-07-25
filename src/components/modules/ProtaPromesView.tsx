import React, { useState } from "react";
import { ProtaItem, PromesItem } from "../../types";
import { CalendarRange, Plus, Trash2, Edit2, Download, Printer, Save, Check } from "lucide-react";
import { exportToCSV } from "../../lib/storage";

interface ProtaPromesViewProps {
  protaList: ProtaItem[];
  promesList: PromesItem[];
  onSaveProta: (updated: ProtaItem[]) => void;
  onSavePromes: (updated: PromesItem[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const ProtaPromesView: React.FC<ProtaPromesViewProps> = ({
  protaList,
  promesList,
  onSaveProta,
  onSavePromes,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"prota" | "promes">("prota");
  const [selectedSubject, setSelectedSubject] = useState("Bahasa Indonesia");
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const subjects = [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
  ];

  const filteredProta = protaList.filter(
    (p) => p.subject === selectedSubject && p.semester === selectedSemester
  );

  const [protaForm, setProtaForm] = useState<Partial<ProtaItem>>({
    subject: selectedSubject,
    semester: selectedSemester,
    allocatedJP: 6,
  });

  const handleDeleteProta = (id: string) => {
    if (confirm("Hapus rincian Prota ini?")) {
      onSaveProta(protaList.filter((p) => p.id !== id));
    }
  };

  const handleOpenAddProta = () => {
    setEditingId(null);
    setProtaForm({
      subject: selectedSubject,
      semester: selectedSemester,
      tpCode: `TP-4.${filteredProta.length + 1}`,
      tpDescription: "",
      allocatedJP: 6,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditProta = (item: ProtaItem) => {
    setEditingId(item.id);
    setProtaForm(item);
    setIsModalOpen(true);
  };

  const handleSaveProtaForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!protaForm.tpDescription) return;

    if (editingId) {
      onSaveProta(
        protaList.map((p) => (p.id === editingId ? ({ ...p, ...protaForm } as ProtaItem) : p))
      );
    } else {
      const newItem: ProtaItem = {
        id: "prota_" + Date.now(),
        subject: protaForm.subject || selectedSubject,
        element: protaForm.element || "Umum",
        codeTP: protaForm.tpCode || "TP-1",
        tpCode: protaForm.tpCode || "TP-1",
        tpDescription: protaForm.tpDescription || "",
        timeAllocationJP: protaForm.allocatedJP || 6,
        allocatedJP: protaForm.allocatedJP || 6,
        semester: (protaForm.semester as any) || selectedSemester,
      };
      onSaveProta([...protaList, newItem]);
    }
    setIsModalOpen(false);
  };

  const totalJP = filteredProta.reduce((acc, curr) => acc + (curr.allocatedJP || curr.timeAllocationJP || 0), 0);

  // Promes Month Columns depending on selected semester
  const promesMonths =
    selectedSemester === 1
      ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
      : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

  const weeksPerMonth = [1, 2, 3, 4];

  const handleExportProtaCSV = () => {
    const headers = ["No", "Mata Pelajaran", "Semester", "Elemen", "Kode TP", "Tujuan Pembelajaran (TP)", "Alokasi Waktu (JP)"];
    const rows = filteredProta.map((p, idx) => [
      idx + 1,
      p.subject,
      `Semester ${p.semester}`,
      p.element,
      p.tpCode,
      p.tpDescription,
      `${p.allocatedJP} JP`,
    ]);
    exportToCSV(headers, rows, `Prota_${selectedSubject}_Semester_${selectedSemester}`);
  };

  const handlePrint = () => {
    onOpenPrint(
      activeTab === "prota"
        ? `PROGRAM TAHUNAN (PROTA) - ${selectedSubject.toUpperCase()}`
        : `PROGRAM SEMESTER (PROMES) - ${selectedSubject.toUpperCase()}`,
      `Semester ${selectedSemester} | Tahun Pelajaran 2025/2026`,
      (
        <div className="space-y-4">
          <div className="flex justify-between text-xs font-bold border-b pb-2">
            <span>Mata Pelajaran: {selectedSubject}</span>
            <span>Semester: {selectedSemester} (Ganjil/Genap)</span>
            <span>Total Alokasi Waktu: {totalJP} JP</span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-300 p-2 w-8 text-center">No</th>
                <th className="border border-slate-300 p-2 text-center w-24">Kode TP</th>
                <th className="border border-slate-300 p-2 text-left">Tujuan Pembelajaran (TP)</th>
                <th className="border border-slate-300 p-2 text-center w-20">Alokasi JP</th>
              </tr>
            </thead>
            <tbody>
              {filteredProta.map((p, idx) => (
                <tr key={p.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold">{p.tpCode}</td>
                  <td className="border border-slate-300 p-2 font-medium">{p.tpDescription}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-emerald-800">{p.allocatedJP} JP</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <CalendarRange className="w-6 h-6 text-emerald-600" />
            Program Tahunan (PROTA) & Program Semester (PROMES)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penyusunan alokasi Jam Pelajaran (JP) dan distribusi distribusi mingguan per semester
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("prota")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "prota"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Program Tahunan (Prota)
          </button>
          <button
            onClick={() => setActiveTab("promes")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "promes"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Program Semester (Promes)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
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

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedSemester(1)}
              className={`px-3 py-1 rounded ${
                selectedSemester === 1 ? "bg-emerald-700 text-white" : "text-slate-600"
              }`}
            >
              Sem 1
            </button>
            <button
              onClick={() => setSelectedSemester(2)}
              className={`px-3 py-1 rounded ${
                selectedSemester === 2 ? "bg-emerald-700 text-white" : "text-slate-600"
              }`}
            >
              Sem 2
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === "prota" && (
            <button
              onClick={handleOpenAddProta}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah TP Prota
            </button>
          )}

          <button
            onClick={handleExportProtaCSV}
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

      {/* PROTA TAB */}
      {activeTab === "prota" && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
            <span>
              Total Alokasi Waktu {selectedSubject} Semester {selectedSemester}:
            </span>
            <span className="text-base font-extrabold text-emerald-800">{totalJP} JP (Jam Pelajaran)</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Elemen</th>
                    <th className="px-4 py-3 w-28">Kode TP</th>
                    <th className="px-4 py-3">Tujuan Pembelajaran (TP)</th>
                    <th className="px-4 py-3 text-center w-28">Alokasi Waktu</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProta.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Belum ada data Prota untuk mata pelajaran ini. Klik <b>Tambah TP Prota</b> di atas!
                      </td>
                    </tr>
                  ) : (
                    filteredProta.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.element || "Umum"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">{p.tpCode || p.codeTP}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{p.tpDescription}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-900 bg-emerald-50/40">
                          {p.allocatedJP || p.timeAllocationJP} JP
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditProta(p)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProta(p.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROMES TAB */}
      {activeTab === "promes" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 text-[10px] uppercase">
                <tr>
                  <th rowSpan={2} className="p-3 border-r border-slate-200 text-left min-w-[200px]">
                    Tujuan Pembelajaran (TP)
                  </th>
                  <th rowSpan={2} className="p-2 border-r border-slate-200 w-16">
                    Alokasi JP
                  </th>
                  {promesMonths.map((m) => (
                    <th colSpan={4} key={m} className="p-2 border-r border-slate-200 bg-slate-100">
                      {m}
                    </th>
                  ))}
                </tr>
                <tr className="border-t border-slate-200">
                  {promesMonths.map((m) =>
                    weeksPerMonth.map((w) => (
                      <th key={`${m}_w${w}`} className="p-1 border-r border-slate-200 text-[9px]">
                        W{w}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredProta.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="p-2.5 text-left border-r border-slate-200 font-semibold text-slate-900">
                      <span className="font-mono text-emerald-700 block text-[10px]">{p.tpCode || p.codeTP}</span>
                      {p.tpDescription}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/30">
                      {p.allocatedJP || p.timeAllocationJP} JP
                    </td>
                    {promesMonths.map((m, mIdx) =>
                      weeksPerMonth.map((w) => {
                        // Dummy checked week distribution for visual demonstration
                        const isAssigned = (mIdx * 4 + w) === (idx * 2 + 1) || (mIdx * 4 + w) === (idx * 2 + 2);
                        return (
                          <td
                            key={`${m}_w${w}`}
                            className={`p-1 border-r border-slate-200 font-mono font-bold ${
                              isAssigned ? "bg-emerald-600 text-white" : "bg-white text-slate-300"
                            }`}
                          >
                            {isAssigned ? "2" : "-"}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Prota Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit TP Prota" : "Tambah TP ke Prota"}
            </h3>

            <form onSubmit={handleSaveProtaForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  disabled
                  value={selectedSubject}
                  className="w-full p-2 border rounded-lg bg-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Semester</label>
                  <select
                    value={protaForm.semester || selectedSemester}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, semester: parseInt(e.target.value) as any }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kode TP</label>
                  <input
                    type="text"
                    value={protaForm.tpCode || ""}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, tpCode: e.target.value }))}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Elemen Kurikulum</label>
                <input
                  type="text"
                  value={protaForm.element || "Membaca & Memirsa"}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, element: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Deskripsi Tujuan Pembelajaran (TP)</label>
                <textarea
                  rows={3}
                  required
                  value={protaForm.tpDescription || ""}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, tpDescription: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Alokasi Waktu (Jam Pelajaran / JP)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={protaForm.allocatedJP || 6}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, allocatedJP: parseInt(e.target.value, 10) }))}
                  className="w-full p-2 border rounded-lg font-bold"
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
                  Simpan TP Prota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
