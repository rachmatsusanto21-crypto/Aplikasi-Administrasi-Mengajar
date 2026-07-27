import React, { useState, useMemo } from "react";
import { ProtaItem, PromesItem, CPTPItem, TimetableSlot, CalendarEvent, IncidentalJournalEntry, SchoolIdentity } from "../../types";
import { CalendarRange, Plus, Trash2, Edit2, Download, Printer, FileText, Check, ChevronRight, Calculator, Save } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";

interface ProtaPromesViewProps {
  protaList: ProtaItem[];
  promesList: PromesItem[];
  cptpItems: CPTPItem[];
  subjects: string[];
  timetable?: TimetableSlot[];
  calendarEvents?: CalendarEvent[];
  incidentalJournals?: IncidentalJournalEntry[];
  schoolIdentity?: SchoolIdentity;
  onSaveProta: (updated: ProtaItem[]) => void;
  onSavePromes: (updated: PromesItem[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const ProtaPromesView: React.FC<ProtaPromesViewProps> = ({
  protaList,
  promesList,
  cptpItems,
  subjects,
  timetable = [],
  calendarEvents = [],
  incidentalJournals = [],
  schoolIdentity,
  onSaveProta,
  onSavePromes,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"prota" | "promes">("prota");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "Bahasa Indonesia");
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Precision Calculation for Effective JP & Remaining JP (Sisa JP) per Semester
  const jpSummary = useMemo(() => {
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

    const startDateStr = schoolIdentity?.academicYearStartDate || "2026-07-13";
    const endDateStr = schoolIdentity?.academicYearEndDate || "2027-06-25";

    const start = parseLocalYMD(startDateStr);
    const end = parseLocalYMD(endDateStr);

    const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");
    const targetSubNorm = normalizeSub(selectedSubject);

    // Build unique day slot allocations from timetable
    let daySlots: Record<string, number> = {};
    const uniqueSlotsMap = new Map<string, TimetableSlot>();
    (timetable || []).forEach((slot) => {
      if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
        const key = `${slot.day.trim()}_${slot.period}`;
        uniqueSlotsMap.set(key, slot);
      }
    });

    uniqueSlotsMap.forEach((slot) => {
      if (normalizeSub(slot.subject) === targetSubNorm) {
        const dayKey = slot.day.trim();
        daySlots[dayKey] = (daySlots[dayKey] || 0) + 1;
      }
    });

    // Compute effective JP for Semester 1 (July-Dec) and Semester 2 (Jan-June)
    let sem1EffectiveJP = 0;
    let sem2EffectiveJP = 0;

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      const curr = new Date(start);
      while (curr <= end) {
        const dayIdx = curr.getDay(); // 0 = Sun
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const currentDayName = dayNames[dayIdx];

        const dateStr = formatLocalYMD(curr);

        const isHoliday =
          dayIdx === 0 ||
          (calendarEvents || []).some((e) => e.isHoliday && dateStr >= e.startDate && dateStr <= e.endDate) ||
          (incidentalJournals || []).some((i) => i.date === dateStr);

        if (dayIdx !== 0 && !isHoliday) {
          const jpOnDay = daySlots[currentDayName] || 0;
          const isSem1 = curr.getMonth() >= 6; // July(6) - Dec(11) is Sem 1
          if (isSem1) {
            sem1EffectiveJP += jpOnDay;
          } else {
            sem2EffectiveJP += jpOnDay;
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    // Prota TP JP Allocations for selectedSubject
    const sem1ProtaItems = protaList.filter(
      (p) => normalizeSub(p.subject) === targetSubNorm && (p.semester === 1 || p.semester === "Ganjil" || (p.semester as any) === "1")
    );
    const sem2ProtaItems = protaList.filter(
      (p) => normalizeSub(p.subject) === targetSubNorm && (p.semester === 2 || p.semester === "Genap" || (p.semester as any) === "2")
    );

    const sem1ProtaJP = sem1ProtaItems.reduce(
      (acc, curr) => acc + (curr.allocatedJP || curr.timeAllocationJP || 0),
      0
    );
    const sem2ProtaJP = sem2ProtaItems.reduce(
      (acc, curr) => acc + (curr.allocatedJP || curr.timeAllocationJP || 0),
      0
    );

    const sem1SisaJP = sem1EffectiveJP - sem1ProtaJP;
    const sem2SisaJP = sem2EffectiveJP - sem2ProtaJP;

    return {
      sem1EffectiveJP,
      sem1ProtaJP,
      sem1SisaJP,
      sem2EffectiveJP,
      sem2ProtaJP,
      sem2SisaJP,
    };
  }, [selectedSubject, timetable, calendarEvents, incidentalJournals, schoolIdentity, protaList]);

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
  const [promesInputMode, setPromesInputMode] = useState<"manual" | "click">("manual");
  const [savedPromesAlert, setSavedPromesAlert] = useState(false);

  // Sync / Load saved Promes data from prop promesList when subject, semester, or list changes
  React.useEffect(() => {
    const loadedMap: Record<string, number> = {};

    filteredProta.forEach((p, idx) => {
      const matchingPromes = promesList.find(
        (item) =>
          (item as any).protaId === p.id ||
          (item.subject === p.subject &&
            item.codeTP === (p.tpCode || p.codeTP) &&
            (item.semester === p.semester || item.semester === (selectedSemester === 1 ? "Ganjil" : "Genap")))
      );

      promesMonths.forEach((m) => {
        weeksPerMonth.forEach((w) => {
          const key = `${p.id}_${m}_w${w}`;
          if (matchingPromes?.weeklyAllocations && matchingPromes.weeklyAllocations[key] !== undefined) {
            loadedMap[key] = matchingPromes.weeklyAllocations[key];
          } else if (matchingPromes?.weeklyAllocations && matchingPromes.weeklyAllocations[`${m}_w${w}`] !== undefined) {
            loadedMap[key] = matchingPromes.weeklyAllocations[`${m}_w${w}`];
          } else if (matchingPromes?.monthlyAllocation && Array.isArray(matchingPromes.monthlyAllocation[m])) {
            const valInArray = matchingPromes.monthlyAllocation[m][w - 1];
            if (valInArray !== undefined) {
              loadedMap[key] = valInArray;
            }
          }
        });
      });
    });

    if (Object.keys(loadedMap).length > 0) {
      setPromesWeeklyAllocations((prev) => ({
        ...prev,
        ...loadedMap,
      }));
    }
  }, [selectedSubject, selectedSemester, promesList, protaList]);

  const handleUpdatePromesJP = (protaId: string, month: string, week: number, val: number) => {
    const key = `${protaId}_${month}_w${week}`;
    const cleanVal = isNaN(val) ? 0 : Math.max(0, Math.min(40, val));
    setPromesWeeklyAllocations((prev) => ({
      ...prev,
      [key]: cleanVal,
    }));
  };

  const handleTogglePromesWeek = (protaId: string, month: string, week: number) => {
    const key = `${protaId}_${month}_w${week}`;
    const currentVal = promesWeeklyAllocations[key] || 0;
    const nextVal = currentVal === 0 ? 2 : currentVal === 2 ? 4 : 0; // cycles 0 -> 2 -> 4 -> 0
    setPromesWeeklyAllocations((prev) => ({
      ...prev,
      [key]: nextVal,
    }));
  };

  const handleSavePromes = () => {
    if (filteredProta.length === 0) return;

    const updatedPromesForCurrentSubject = filteredProta.map((p, idx) => {
      const weeklyAllocationsForP: Record<string, number> = {};
      const monthlyAllocationForP: Record<string, number[]> = {};

      promesMonths.forEach((m) => {
        monthlyAllocationForP[m] = [];
        weeksPerMonth.forEach((w) => {
          const key = `${p.id}_${m}_w${w}`;
          const defaultVal = (idx * 2 + w) % 5 === 0 ? 2 : 0;
          const val =
            promesWeeklyAllocations[key] !== undefined
              ? promesWeeklyAllocations[key]
              : defaultVal;

          weeklyAllocationsForP[`${m}_w${w}`] = val;
          weeklyAllocationsForP[key] = val;
          monthlyAllocationForP[m].push(val);
        });
      });

      const existing = promesList.find(
        (item) =>
          (item as any).protaId === p.id ||
          (item.subject === p.subject &&
            item.codeTP === (p.tpCode || p.codeTP) &&
            (item.semester === p.semester || item.semester === (selectedSemester === 1 ? "Ganjil" : "Genap")))
      );

      const newItem: PromesItem = {
        id: existing?.id || `prm_${p.id}_${Date.now()}`,
        subject: p.subject,
        codeTP: p.tpCode || p.codeTP,
        tpDescription: p.tpDescription,
        timeAllocationJP: p.allocatedJP || p.timeAllocationJP || 6,
        semester: (p.semester || (selectedSemester === 1 ? "Ganjil" : "Genap")) as any,
        monthlyAllocation: monthlyAllocationForP,
        weeklyAllocations: weeklyAllocationsForP,
        protaId: p.id,
      } as any;

      return newItem;
    });

    const filteredOthers = promesList.filter(
      (item) =>
        !(
          item.subject === selectedSubject &&
          (item.semester === selectedSemester ||
            item.semester === (selectedSemester === 1 ? "Ganjil" : "Genap"))
        )
    );

    const nextPromesList = [...filteredOthers, ...updatedPromesForCurrentSubject];

    onSavePromes(nextPromesList);
    setSavedPromesAlert(true);
    setTimeout(() => setSavedPromesAlert(false), 3500);
  };

  // Helper to calculate total allocated JP for a single Prota item
  const getProtaAllocatedPromesJP = (protaId: string, idx: number) => {
    let sum = 0;
    promesMonths.forEach((m) => {
      weeksPerMonth.forEach((w) => {
        const key = `${protaId}_${m}_w${w}`;
        const defaultVal = (idx * 2 + w) % 5 === 0 ? 2 : 0;
        const val = promesWeeklyAllocations[key] !== undefined ? promesWeeklyAllocations[key] : defaultVal;
        sum += val;
      });
    });
    return sum;
  };

  // Helper to calculate total allocated JP for a specific month & week across all Prota items
  const getColumnTotalJP = (m: string, w: number) => {
    let sum = 0;
    filteredProta.forEach((p, idx) => {
      const key = `${p.id}_${m}_w${w}`;
      const defaultVal = (idx * 2 + w) % 5 === 0 ? 2 : 0;
      const val = promesWeeklyAllocations[key] !== undefined ? promesWeeklyAllocations[key] : defaultVal;
      sum += val;
    });
    return sum;
  };

  const handleAutoFillPromes = () => {
    const newMap: Record<string, number> = {};
    filteredProta.forEach((p) => {
      let target = p.allocatedJP || p.timeAllocationJP || 6;
      let allocated = 0;
      promesMonths.forEach((m) => {
        weeksPerMonth.forEach((w) => {
          const key = `${p.id}_${m}_w${w}`;
          if (allocated < target) {
            const jpToGive = Math.min(2, target - allocated);
            newMap[key] = jpToGive;
            allocated += jpToGive;
          } else {
            newMap[key] = 0;
          }
        });
      });
    });
    setPromesWeeklyAllocations((prev) => ({ ...prev, ...newMap }));
  };

  const handleResetPromes = () => {
    const newMap: Record<string, number> = {};
    filteredProta.forEach((p) => {
      promesMonths.forEach((m) => {
        weeksPerMonth.forEach((w) => {
          newMap[`${p.id}_${m}_w${w}`] = 0;
        });
      });
    });
    setPromesWeeklyAllocations(newMap);
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

          {activeTab === "promes" && (
            <button
              onClick={handleSavePromes}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title="Simpan alokasi Promes secara permanen"
            >
              <Save className="w-4 h-4" />
              Simpan Promes
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
            <Printer className="w-4 h-4 text-slate-600" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* COUNTER SISA JP PER SEMESTER CARD */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                Counter Alokasi Waktu & Sisa Jam Pelajaran (JP) — {selectedSubject}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rumus Presisi: <b>Net JP Efektif Kalender</b> dikurangi <b>Total Alokasi JP TP (Prota & Promes)</b>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SEMESTER 1 COUNTER */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedSemester === 1
                ? "bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                Semester 1 (Ganjil)
              </span>
              <span
                className={`px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${
                  jpSummary.sem1SisaJP >= 0
                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                    : "bg-red-100 text-red-900 border border-red-300"
                }`}
              >
                Sisa: {jpSummary.sem1SisaJP >= 0 ? `+${jpSummary.sem1SisaJP}` : jpSummary.sem1SisaJP} JP
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Net JP Efektif</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{jpSummary.sem1EffectiveJP} JP</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Allocated TP Prota</span>
                <span className="font-mono font-bold text-teal-700 text-sm">{jpSummary.sem1ProtaJP} JP</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Sisa JP Semester 1</span>
                <span
                  className={`font-mono font-extrabold text-sm ${
                    jpSummary.sem1SisaJP >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {jpSummary.sem1SisaJP} JP
                </span>
              </div>
            </div>
          </div>

          {/* SEMESTER 2 COUNTER */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedSemester === 2
                ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                Semester 2 (Genap)
              </span>
              <span
                className={`px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${
                  jpSummary.sem2SisaJP >= 0
                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                    : "bg-red-100 text-red-900 border border-red-300"
                }`}
              >
                Sisa: {jpSummary.sem2SisaJP >= 0 ? `+${jpSummary.sem2SisaJP}` : jpSummary.sem2SisaJP} JP
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Net JP Efektif</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{jpSummary.sem2EffectiveJP} JP</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Allocated TP Prota</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">{jpSummary.sem2ProtaJP} JP</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Sisa JP Semester 2</span>
                <span
                  className={`font-mono font-extrabold text-sm ${
                    jpSummary.sem2SisaJP >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {jpSummary.sem2SisaJP} JP
                </span>
              </div>
            </div>
          </div>
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

      {/* PROMES TAB (WITH MANUAL JP INPUT & W5 ENABLED) */}
      {activeTab === "promes" && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">💡 Petunjuk Promes:</span>
              <span>
                Ketikkan angka JP secara <b>manual</b> langsung pada kolom minggu (W1–W5) atau gunakan mode klik cepat.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-white p-1 rounded-xl border border-slate-300 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setPromesInputMode("manual")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    promesInputMode === "manual"
                      ? "bg-emerald-600 text-white font-extrabold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✏️ Ketik Manual JP
                </button>
                <button
                  type="button"
                  onClick={() => setPromesInputMode("click")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    promesInputMode === "click"
                      ? "bg-emerald-600 text-white font-extrabold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ⚡ Klik Cepat (0-2-4)
                </button>
              </div>

              <button
                type="button"
                onClick={handleAutoFillPromes}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 text-xs"
                title="Isi otomatis 2 JP secara berurutan hingga target Prota terpenuhi"
              >
                ✨ Auto-Fill 2 JP
              </button>
              <button
                type="button"
                onClick={handleResetPromes}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 text-xs"
                title="Kosongkan seluruh alokasi Promes"
              >
                🔄 Reset Alokasi
              </button>

              <button
                type="button"
                onClick={handleSavePromes}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 text-xs transition-all active:scale-95"
                title="Simpan alokasi Promes secara permanen"
              >
                <Save className="w-4 h-4" />
                Simpan Promes
              </button>
            </div>
          </div>

          {savedPromesAlert && (
            <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all animate-fadeIn">
              <Check className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Data Alokasi Program Semester (Promes) mata pelajaran <b>{selectedSubject}</b> Semester {selectedSemester} berhasil disimpan secara permanen!</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 text-[10px] uppercase">
                  <tr>
                    <th rowSpan={2} className="p-3 border-r border-slate-200 text-left min-w-[220px]">
                      Tujuan Pembelajaran (TP)
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-slate-200 w-16">
                      Target Prota
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-slate-200 w-16 bg-emerald-50 text-emerald-900">
                      Terisi JP
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
                      <td colSpan={3 + promesMonths.length * 5} className="text-center py-8 text-slate-400">
                        Belum ada data Prota untuk semester ini.
                      </td>
                    </tr>
                  ) : (
                    filteredProta.map((p, idx) => {
                      const targetJP = p.allocatedJP || p.timeAllocationJP || 6;
                      const currentAllocatedPromes = getProtaAllocatedPromesJP(p.id, idx);
                      const isMatching = currentAllocatedPromes === targetJP;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5 text-left border-r border-slate-200 font-semibold text-slate-900">
                            <span className="font-mono text-emerald-700 block text-[10px]">{p.tpCode || p.codeTP}</span>
                            {p.tpDescription}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50/50">
                            {targetJP} JP
                          </td>
                          <td className="p-2 border-r border-slate-200 font-extrabold font-mono text-xs">
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                isMatching
                                  ? "bg-emerald-100 text-emerald-800"
                                  : currentAllocatedPromes > targetJP
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                              title={
                                isMatching
                                  ? "Sesuai Target Prota"
                                  : currentAllocatedPromes > targetJP
                                  ? `Kelebihan ${currentAllocatedPromes - targetJP} JP`
                                  : `Kurang ${targetJP - currentAllocatedPromes} JP`
                              }
                            >
                              {currentAllocatedPromes} JP
                            </span>
                          </td>
                          {promesMonths.map((m) =>
                            weeksPerMonth.map((w) => {
                              const key = `${p.id}_${m}_w${w}`;
                              const defaultVal = (idx * 2 + w) % 5 === 0 ? 2 : 0;
                              const val = promesWeeklyAllocations[key] !== undefined ? promesWeeklyAllocations[key] : defaultVal;

                              return (
                                <td
                                  key={`${m}_w${w}`}
                                  className="p-0.5 border-r border-slate-200 text-center font-mono"
                                >
                                  {promesInputMode === "manual" ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      value={val === 0 ? "" : val}
                                      placeholder="-"
                                      onChange={(e) => handleUpdatePromesJP(p.id, m, w, parseInt(e.target.value, 10) || 0)}
                                      className={`w-8 h-7 text-center font-bold text-xs rounded border transition-all ${
                                        val > 0
                                          ? "bg-emerald-600 text-white border-emerald-700 font-extrabold"
                                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                      }`}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePromesWeek(p.id, m, w)}
                                      className={`w-full h-7 font-bold text-xs rounded transition-colors ${
                                        val > 0
                                          ? "bg-emerald-600 text-white font-extrabold"
                                          : "bg-white text-slate-300 hover:bg-slate-100"
                                      }`}
                                    >
                                      {val > 0 ? val : "-"}
                                    </button>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredProta.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                    <tr>
                      <td className="p-2.5 text-left border-r border-slate-300 font-black">
                        TOTAL ALOKASI JP MINGGUAN
                      </td>
                      <td className="p-2 border-r border-slate-300 font-black text-slate-900">
                        {totalJP} JP
                      </td>
                      <td className="p-2 border-r border-slate-300 font-black text-emerald-800">
                        {filteredProta.reduce((acc, p, idx) => acc + getProtaAllocatedPromesJP(p.id, idx), 0)} JP
                      </td>
                      {promesMonths.map((m) =>
                        weeksPerMonth.map((w) => {
                          const colTotal = getColumnTotalJP(m, w);
                          return (
                            <td key={`total_${m}_w${w}`} className="p-1 border-r border-slate-300 font-extrabold font-mono text-[10px]">
                              {colTotal > 0 ? <span className="text-emerald-800">{colTotal}</span> : <span className="text-slate-400">-</span>}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  </tfoot>
                )}
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
