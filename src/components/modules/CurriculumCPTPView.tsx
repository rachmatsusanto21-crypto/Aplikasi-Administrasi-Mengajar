import React, { useState } from "react";
import { CPTPItem, AISettings } from "../../types";
import { BookOpen, Sparkles, Plus, Trash2, Edit2, Download, Printer, Search, Check, X } from "lucide-react";
import { exportToCSV } from "../../lib/storage";

interface CurriculumCPTPViewProps {
  cptpItems: CPTPItem[];
  aiSettings: AISettings;
  onSaveCPTP: (updated: CPTPItem[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

function safeStr(val: any, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map((v) => safeStr(v, "")).filter(Boolean).join(", ");
  if (typeof val === "object") {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${safeStr(v, "")}`)
      .join("\n");
  }
  return String(val);
}

export const CurriculumCPTPView: React.FC<CurriculumCPTPViewProps> = ({
  cptpItems,
  aiSettings,
  onSaveCPTP,
  onOpenPrint,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>("Semua");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CPTPItem>>({});
  const [isAddModal, setIsAddModal] = useState(false);

  // AI Generator Modal State
  const [isAiModal, setIsAiModal] = useState(false);
  const [aiSubject, setAiSubject] = useState("Bahasa Indonesia");
  const [aiMateri, setAiMateri] = useState("Teks Cerita Rakyat & Amanat");
  const [aiGrade, setAiGrade] = useState("Kelas IV (Fase B)");
  const [isGenerating, setIsGenerating] = useState(false);

  const subjects = [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
    "Bahasa Inggris",
    "Pendidikan Agama",
  ];

  const filteredItems = cptpItems.filter((item) => {
    const matchSubject = selectedSubject === "Semua" || item.subject === selectedSubject;
    const s = (search || "").toLowerCase();
    const matchSearch =
      (item.descriptionCP || "").toLowerCase().includes(s) ||
      (item.descriptionTP || "").toLowerCase().includes(s) ||
      (item.codeTP || "").toLowerCase().includes(s);
    return matchSubject && matchSearch;
  });

  const handleDelete = (id: string) => {
    if (confirm("Hapus data CP / TP ini?")) {
      onSaveCPTP(cptpItems.filter((item) => item.id !== id));
    }
  };

  const handleStartEdit = (item: CPTPItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = cptpItems.map((item) =>
      item.id === editingId ? ({ ...item, ...editForm } as CPTPItem) : item
    );
    onSaveCPTP(updated);
    setEditingId(null);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.subject || !editForm.descriptionTP) return;
    const newItem: CPTPItem = {
      id: "cptp_" + Date.now(),
      subject: editForm.subject || "Bahasa Indonesia",
      element: editForm.element || "Umum",
      codeCP: editForm.codeCP || `CP-${editForm.subject?.slice(0, 3)}-4.1`,
      descriptionCP: editForm.descriptionCP || "",
      codeTP: editForm.codeTP || `TP-${editForm.subject?.slice(0, 3)}-4.1.1`,
      descriptionTP: editForm.descriptionTP || "",
      targetClass: editForm.targetClass || "Kelas IV",
    };
    onSaveCPTP([...cptpItems, newItem]);
    setEditForm({});
    setIsAddModal(false);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Anda adalah ahli Kurikulum Merdeka Indonesia.
Buatkan Capaian Pembelajaran (CP) dan 3 buah Tujuan Pembelajaran (TP) secara terstruktur untuk:
Mata Pelajaran: ${aiSubject}
Tingkat/Fase: ${aiGrade}
Materi/Pokok Bahasan: ${aiMateri}

Format keluaran HARUS berupa JSON murni tanpa markdown lain:
{
  "element": "Nama Elemen Kurikulum",
  "codeCP": "Kode CP e.g. CP-BI-4.1",
  "descriptionCP": "Deskripsi CP resmi",
  "tps": [
    { "codeTP": "TP-BI-4.1.1", "descriptionTP": "Deskripsi TP 1" },
    { "codeTP": "TP-BI-4.1.2", "descriptionTP": "Deskripsi TP 2" },
    { "codeTP": "TP-BI-4.1.3", "descriptionTP": "Deskripsi TP 3" }
  ]
}`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: aiSettings?.selectedAgent || "gemini-3.6-flash",
          manualApiKey: aiSettings?.manualApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.result) {
        let cleanText = data.result.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.slice(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);

        const parsed = JSON.parse(cleanText);
        const tpsArray = Array.isArray(parsed.tps) ? parsed.tps : [parsed];
        const newCPTPs: CPTPItem[] = tpsArray.map((tpObj: any, idx: number) => ({
          id: `cptp_ai_${Date.now()}_${idx}`,
          subject: aiSubject,
          element: safeStr(parsed.element, "Pemahaman Konsep"),
          codeCP: safeStr(parsed.codeCP, `CP-${aiSubject.slice(0, 3).toUpperCase()}-4.1`),
          descriptionCP: safeStr(parsed.descriptionCP, ""),
          codeTP: safeStr(tpObj.codeTP, `TP-4.${idx + 1}`),
          descriptionTP: safeStr(tpObj.descriptionTP || tpObj, ""),
          targetClass: aiGrade,
        }));

        onSaveCPTP([...cptpItems, ...newCPTPs]);
        setIsAiModal(false);
      }
    } catch (err: any) {
      alert("Gagal memproses AI: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["No", "Mata Pelajaran", "Elemen", "Kode CP", "Deskripsi CP", "Kode TP", "Tujuan Pembelajaran (TP)"];
    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.subject,
      item.element,
      item.codeCP,
      item.descriptionCP,
      item.codeTP,
      item.descriptionTP,
    ]);
    exportToCSV(headers, rows, `Data_CP_TP_${selectedSubject}`);
  };

  const handlePrint = () => {
    onOpenPrint(
      "DOKUMEN CAPAIAN PEMBELAJARAN (CP) & TUJUAN PEMBELAJARAN (TP)",
      `Mata Pelajaran: ${selectedSubject}`,
      (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => (
            <div key={item.id} className="border border-slate-300 p-3 rounded text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>{idx + 1}. [{item.subject}] - Elemen: {item.element}</span>
                <span>{item.codeTP}</span>
              </div>
              <p className="text-slate-600"><b>Capaian Pembelajaran ({item.codeCP}):</b> {item.descriptionCP}</p>
              <p className="text-slate-900 font-medium"><b>Tujuan Pembelajaran:</b> {item.descriptionTP}</p>
            </div>
          ))}
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
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Data Kurikulum: Capaian Pembelajaran (CP) & TP
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan CP dan Tujuan Pembelajaran Kurikulum Merdeka per mata pelajaran dengan AI Generator
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAiModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate CP & TP dengan AI
          </button>
          <button
            type="button"
            onClick={() => setIsAddModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Manual
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Subject & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <button
            onClick={() => setSelectedSubject("Semua")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSubject === "Semua"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Mapel
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSubject === sub
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kata kunci TP / CP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* CP & TP Cards */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-200">
            Belum ada data CP & TP untuk mata pelajaran ini. Gunakan tombol <b>Generate CP & TP dengan AI</b> di atas untuk membuat otomatis!
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                    {item.subject}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Elemen: <b>{item.element}</b>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editingId === item.id ? (
                <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editForm.codeCP ?? item.codeCP}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, codeCP: e.target.value }))}
                      className="p-2 border rounded"
                      placeholder="Kode CP"
                    />
                    <input
                      type="text"
                      value={editForm.codeTP ?? item.codeTP}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, codeTP: e.target.value }))}
                      className="p-2 border rounded"
                      placeholder="Kode TP"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={editForm.descriptionCP ?? item.descriptionCP}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, descriptionCP: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="Deskripsi CP"
                  />
                  <textarea
                    rows={2}
                    value={editForm.descriptionTP ?? item.descriptionTP}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, descriptionTP: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="Deskripsi TP"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-slate-200 rounded font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-emerald-600 text-white rounded font-bold"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>Capaian Pembelajaran (CP)</span>
                      <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {item.codeCP}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{item.descriptionCP}</p>
                  </div>

                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                    <div className="font-bold text-emerald-950 mb-1 flex items-center justify-between">
                      <span>Tujuan Pembelajaran (TP)</span>
                      <span className="font-mono text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                        {item.codeTP}
                      </span>
                    </div>
                    <p className="text-slate-900 font-semibold leading-relaxed">
                      {item.descriptionTP}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* AI Modal */}
      {isAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-base">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3>Generate CP & TP dengan AI Kurikulum Merdeka</h3>
            </div>
            <p className="text-xs text-slate-500">
              Ketikkan topik materi, lalu AI akan otomatis merumuskan Capaian Pembelajaran & Tujuan Pembelajaran yang sesuai:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mata Pelajaran</label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Fase / Kelas</label>
                <input
                  type="text"
                  value={aiGrade}
                  onChange={(e) => setAiGrade(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Materi Pokok / Bahasan Utama</label>
                <input
                  type="text"
                  value={aiMateri}
                  onChange={(e) => setAiMateri(e.target.value)}
                  placeholder="Contoh: Fotosintesis & Ekosistem"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAiModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md"
                >
                  {isGenerating ? "Merumuskan CP & TP..." : "Proses Generate AI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Tambah CP & TP Manual</h3>
            <form onSubmit={handleAddSingle} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mata Pelajaran</label>
                <select
                  value={editForm.subject || "Bahasa Indonesia"}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Elemen Kurikulum</label>
                <input
                  type="text"
                  placeholder="Membaca dan Memirsa / Bilangan / Geometri"
                  value={editForm.element || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, element: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Kode CP</label>
                  <input
                    type="text"
                    placeholder="CP-BI-4.1"
                    value={editForm.codeCP || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, codeCP: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kode TP</label>
                  <input
                    type="text"
                    placeholder="TP-BI-4.1.1"
                    value={editForm.codeTP || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, codeTP: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Deskripsi Capaian Pembelajaran (CP)</label>
                <textarea
                  rows={2}
                  value={editForm.descriptionCP || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, descriptionCP: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Deskripsi Tujuan Pembelajaran (TP)</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.descriptionTP || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, descriptionTP: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Simpan TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
