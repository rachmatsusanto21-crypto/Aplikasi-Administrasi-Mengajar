import React, { useState } from "react";
import { ProtaItem, PromesItem, CPTPItem } from "../../types";
import { CalendarRange, Plus, Trash2, Edit2, Download, Printer, FileText, Check, ChevronRight } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";

interface ProtaPromesViewProps {
  protaList: ProtaItem[];
  promesList: PromesItem[];
  cptpItems: CPTPItem[];
  subjects: string[];
  onSaveProta: (updated: ProtaItem[]) => void;
  onSavePromes: (updated: PromesItem[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const ProtaPromesView: React.FC<ProtaPromesViewProps> = ({
  protaList,
  promesList,
  cptpItems,
  subjects,
  onSaveProta,
  onSavePromes,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"prota" | "promes">("prota");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "Bahasa Indonesia");
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredProta = protaList.filter(
    (p) => p.subject === selectedSubject && (p.semester === selectedSemester || p.semester === (selectedSemester === 1 ? "Ganjil" : "Genap"))
  );

  // Available CPs/TPs for selected subject
  const availableTPs = cptpItems.filter((item) => item.subject === selectedSubject);

  const [protaForm, setProtaForm] = useState<Partial<ProtaItem>>({
    subject: selectedSubject,
    semester: selectedSemester,
    allocatedJP: 6,
    element: "Umum",
    tpCode: "",
    tpDescription: "",
  });

  const handleDeleteProta = (id: string) => {
    if (confirm("Hapus rincian Prota ini?")) {
      onSaveProta(protaList.filter((p) => p.id !== id));
    }
  };

  const handleOpenAddProta = () => {
    setEditingId(null);
    const firstTP = availableTPs[0];
    setProtaForm({
      subject: selectedSubject,
      semester: selectedSemester,
      element: firstTP ? firstTP.element : "Umum",
      tpCode: firstTP ? firstTP.codeTP : `TP-4.${filteredProta.length + 1}`,
      tpDescription: firstTP ? firstTP.descriptionTP : "",
      allocatedJP: 6,
    });
    setIsModalOpen(true);
  };

  const handleSelectTPFromDropdown = (codeTP: string) => {
    const found = availableTPs.find((t) => t.codeTP === codeTP);
    if (found) {
      setProtaForm((prev) => ({
        ...prev,
        tpCode: found.codeTP,
        codeTP: found.codeTP,
        element: found.element,
        tpDescription: found.descriptionTP,
      }));
    } else {
      setProtaForm((prev) => ({
        ...prev,
        tpCode: codeTP,
        codeTP,
      }));
    }
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
        codeTP: protaForm.tpCode || protaForm.codeTP || "TP-1",
        tpCode: protaForm.tpCode || protaForm.codeTP || "TP-1",
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

  // Promes Months depending on selected semester
  const promesMonths =
    selectedSemester === 1
      ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
      : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

  // W1, W2, W3, W4, W5 (5 Minggu per Bulan)
  const weeksPerMonth = [1, 2, 3, 4, 5];

  // State for Promes weekly allocation map
  // Key: `${protaId}_${monthName}_w${weekNumber}` -> JP allocation number (e.g., 2)
  const [promesWeeklyAllocations, setPromesWeeklyAllocations] = useState<Record<string, number>>({});

  const handleTogglePromesWeek = (protaId: string, month: string, week: number) => {
    const key = `${protaId}_${month}_w${week}`;
    const currentVal = promesWeeklyAllocations[key] || 0;
    const nextVal = currentVal === 0 ? 2 : currentVal === 2 ? 4 : 0; // cycles 0 -> 2 -> 4 -> 0
    setPromesWeeklyAllocations((prev) => ({
      ...prev,
      [key]: nextVal,
    }));
  };

  const handleExportProtaCSV = () => {
    const headers = ["No", "Mata Pelajaran", "Semester", "Elemen", "Kode TP", "Tujuan Pembelajaran (TP)", "Alokasi Waktu (JP)"];
    const rows = filteredProta.map((p, idx) => [
      idx + 1,
      p.subject,
      `Semester ${p.semester}`,
      p.element,
      p.tpCode || p.codeTP,
      p.tpDescription,
      `${p.allocatedJP || p.timeAllocationJP} JP`,
    ]);
    exportToCSV(headers, rows, `Prota_${selectedSubject}_Semester_${selectedSemester}`);
  };

  const handleExportDoc = () => {
    if (activeTab === "prota") {
      const tableHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 11pt;">
          <h3 style="text-align: center; font-size: 14pt; margin-bottom: 5px;">PROGRAM TAHUNAN (PROTA)</h3>
          <p style="text-align: center; margin-top: 0; font-weight: bold;">Mata Pelajaran: ${selectedSubject} | Semester ${selectedSemester}</p>
          <hr style="margin: 15px 0; border: 1px solid #000;"/>

          <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
                <th style="border: 1px solid #333; padding: 6px; width: 40px;">No</th>
                <th style="border: 1px solid #333; padding: 6px; width: 120px;">Elemen</th>
                <th style="border: 1px solid #333; padding: 6px; width: 90px;">Kode TP</th>
                <th style="border: 1px solid #333; padding: 6px; text-align: left;">Tujuan Pembelajaran (TP)</th>
                <th style="border: 1px solid #333; padding: 6px; width: 90px;">Alokasi Waktu</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProta
                .map(
                  (p, idx) => `
                <tr>
                  <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${p.element || "Umum"}</td>
                  <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${p.tpCode || p.codeTP}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${p.tpDescription}</td>
                  <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; background-color: #ecfdf5;">${p.allocatedJP || p.timeAllocationJP} JP</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <p style="margin-top: 15px; font-weight: bold;">Total Alokasi Waktu Semester ${selectedSemester}: ${totalJP} JP</p>
        </div>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: `Prota_${selectedSubject}_Semester_${selectedSemester}.doc`,
        title: `PROGRAM TAHUNAN (PROTA)`,
      });
    } else {
      const tableHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 10pt;">
          <h3 style="text-align: center; font-size: 13pt; margin-bottom: 5px;">PROGRAM SEMESTER (PROMES)</h3>
          <p style="text-align: center; margin-top: 0; font-weight: bold;">Mata Pelajaran: ${selectedSubject} | Semester ${selectedSemester}</p>
          <hr style="margin: 15px 0; border: 1px solid #000;"/>

          <table border="1" cellpadding="4" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9pt; text-align: center;">
            <thead>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <th rowspan="2" style="border: 1px solid #333; padding: 5px; text-align: left; width: 220px;">Tujuan Pembelajaran (TP)</th>
                <th rowspan="2" style="border: 1px solid #333; padding: 5px; width: 50px;">JP</th>
                ${promesMonths.map((m) => `<th colspan="5" style="border: 1px solid #333; padding: 5px; background-color: #e5e7eb;">${m}</th>`).join("")}
              </tr>
              <tr style="background-color: #f9fafb; font-size: 8pt;">
                ${promesMonths.map(() => weeksPerMonth.map((w) => `<th style="border: 1px solid #333; padding: 3px;">W${w}</th>`).join("")).join("")}
              </tr>
            </thead>
            <tbody>
              ${filteredProta
                .map(
                  (p, idx) => `
                <tr>
                  <td style="border: 1px solid #333; padding: 5px; text-align: left;">
                    <b>${p.tpCode || p.codeTP}</b>: ${p.tpDescription}
                  </td>
                  <td style="border: 1px solid #333; padding: 5px; font-weight: bold; background-color: #ecfdf5;">${p.allocatedJP || p.timeAllocationJP}</td>
                  ${promesMonths
                    .map((m) =>
                      weeksPerMonth
                        .map((w) => {
                          const key = `${p.id}_${m}_w${w}`;
                          const val = promesWeeklyAllocations[key] || ((idx * 2 + w) % 5 === 0 ? 2 : 0);
                          return `<td style="border: 1px solid #333; padding: 3px; ${val ? "background-color: #10b981; color: white; font-weight: bold;" : "color: #ccc;"}">${val || "-"}</td>`;
                        })
                        .join("")
                    )
                    .join("")}
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
        filename: `Promes_${selectedSubject}_Semester_${selectedSemester}.doc`,
        title: `PROGRAM SEMESTER (PROMES)`,
      });
    }
  };

  const handlePrint = () => {
    onOpenPrint(
      activeTab === "prota"
        ? `PROGRAM TAHUNAN (PROTA) - ${selectedSubject.toUpperCase()}`
        : `PROGRAM SEMESTER (PROMES) - ${selectedSubject.toUpperCase()}`,
      `Semester ${selectedSemester} (Ganjil/Genap) | Kurikulum Merdeka`,
      (
        <div className="space-y-4 text-xs">
          <div className="flex justify-between font-bold border-b pb-2">
            <span>Mata Pelajaran: {selectedSubject}</span>
            <span>Semester: {selectedSemester}</span>
            <span>Total Alokasi Waktu: {totalJP} JP</span>
          </div>

          <table className="w-full border-collapse border border-slate-300">
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
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold">{p.tpCode || p.codeTP}</td>
                  <td className="border border-slate-300 p-2 font-medium">{p.tpDescription}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-emerald-800">{p.allocatedJP || p.timeAllocationJP} JP</td>
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
            Integrasi otomatis Kode & Deskripsi TP dari Kurikulum CP & TP, serta Promes 5-Minggu per Bulan (W1 - W5)
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
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
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
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

      {/* PROMES TAB (WITH W5 ENABLED) */}
      {activeTab === "promes" && (
        <div className="space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>💡 <b>Petunjuk Promes:</b> Tabel di bawah menyediakan <b>5 Minggu (W1 - W5)</b> per bulan. Klik pada sel minggu untuk mengalokasikan JP (siklus 2 JP / 4 JP / Kosong).</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 text-[10px] uppercase">
                  <tr>
                    <th rowSpan={2} className="p-3 border-r border-slate-200 text-left min-w-[220px]">
                      Tujuan Pembelajaran (TP)
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-slate-200 w-16">
                      Alokasi JP
                    </th>
                    {promesMonths.map((m) => (
                      <th colSpan={5} key={m} className="p-2 border-r border-slate-200 bg-slate-100 font-bold text-slate-900">
                        {m}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-t border-slate-200">
                    {promesMonths.map((m) =>
                      weeksPerMonth.map((w) => (
                        <th key={`${m}_w${w}`} className={`p-1 border-r border-slate-200 text-[9px] ${w === 5 ? "bg-amber-50 text-amber-900 font-extrabold" : ""}`}>
                          W{w}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredProta.length === 0 ? (
                    <tr>
                      <td colSpan={2 + promesMonths.length * 5} className="text-center py-8 text-slate-400">
                        Belum ada data Prota untuk semester ini.
                      </td>
                    </tr>
                  ) : (
                    filteredProta.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 text-left border-r border-slate-200 font-semibold text-slate-900">
                          <span className="font-mono text-emerald-700 block text-[10px]">{p.tpCode || p.codeTP}</span>
                          {p.tpDescription}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/30">
                          {p.allocatedJP || p.timeAllocationJP} JP
                        </td>
                        {promesMonths.map((m) =>
                          weeksPerMonth.map((w) => {
                            const key = `${p.id}_${m}_w${w}`;
                            // default fallback pattern for demonstration if not manually clicked yet
                            const defaultVal = (idx * 2 + w) % 5 === 0 ? 2 : 0;
                            const val = promesWeeklyAllocations[key] !== undefined ? promesWeeklyAllocations[key] : defaultVal;

                            return (
                              <td
                                key={`${m}_w${w}`}
                                onClick={() => handleTogglePromesWeek(p.id, m, w)}
                                className={`p-1 border-r border-slate-200 font-mono font-bold cursor-pointer select-none transition-colors ${
                                  val > 0
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-white text-slate-300 hover:bg-slate-100"
                                }`}
                                title="Klik untuk mengubah alokasi JP minggu ini"
                              >
                                {val > 0 ? val : "-"}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Prota Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
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
                  className="w-full p-2 border rounded-lg bg-slate-100 font-bold text-slate-700"
                />
              </div>

              {/* NEW FEATURE: Dropdown pilih Kode TP dari Kurikulum CP & TP */}
              <div>
                <label className="block font-semibold mb-1 text-emerald-800">
                  Pilih Kode TP dari Kurikulum CP & TP
                </label>
                {availableTPs.length > 0 ? (
                  <select
                    value={protaForm.tpCode || ""}
                    onChange={(e) => handleSelectTPFromDropdown(e.target.value)}
                    className="w-full p-2 border border-emerald-300 rounded-lg bg-emerald-50/50 font-bold text-slate-900"
                  >
                    <option value="">-- Pilih Kode TP dari Database Kurikulum --</option>
                    {availableTPs.map((item) => (
                      <option key={item.id} value={item.codeTP}>
                        [{item.codeTP}] - {item.descriptionTP.slice(0, 60)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-[11px]">
                    Belum ada data CP & TP tersimpan untuk mapel <b>{selectedSubject}</b> di Kurikulum. Anda dapat mengetikkan Kode & Deskripsi TP secara manual di bawah.
                  </div>
                )}
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
                  <label className="block font-semibold mb-1">Kode TP (Manual / Custom)</label>
                  <input
                    type="text"
                    required
                    value={protaForm.tpCode || ""}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, tpCode: e.target.value, codeTP: e.target.value }))}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Elemen Kurikulum</label>
                <input
                  type="text"
                  value={protaForm.element || "Umum"}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, element: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Deskripsi Tujuan Pembelajaran (TP)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Deskripsi TP akan muncul otomatis saat memilih Kode TP di atas..."
                  value={protaForm.tpDescription || ""}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, tpDescription: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-medium"
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
