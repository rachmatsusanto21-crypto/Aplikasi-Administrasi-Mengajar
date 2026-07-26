import React from "react";
import {
  Building2,
  Users,
  UserCheck,
  BookOpen,
  ShieldAlert,
  GraduationCap,
  CalendarDays,
  BookMarked,
  ClipboardList,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  X,
  Layers,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { NavModule } from "../types";

interface SidebarProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isOpen,
  onClose,
}) => {
  const menuGroups = [
    {
      title: "Core Admin & Data",
      items: [
        { id: "identity" as NavModule, label: "Identitas Sekolah", icon: Building2 },
        { id: "students" as NavModule, label: "Database Murid", icon: Users },
        { id: "attendance" as NavModule, label: "Absensi Bulk (dd/m)", icon: UserCheck, badge: "Daily" },
      ],
    },
    {
      title: "Pembelajaran & Kurikulum",
      items: [
        { id: "calendar" as NavModule, label: "Kalender & Hari Efektif", icon: Calendar },
        { id: "prota_promes" as NavModule, label: "Prota & Promes", icon: Layers },
        { id: "curriculum" as NavModule, label: "Kurikulum CP & TP", icon: BookOpen, hasAI: true },
        { id: "teaching_module" as NavModule, label: "Modul Ajar (AI Deep Learning)", icon: Sparkles, hasAI: true, highlight: true },
      ],
    },
    {
      title: "Pencatatan & Jurnal",
      items: [
        { id: "grades" as NavModule, label: "Rekap Nilai & Leger", icon: GraduationCap },
        { id: "learning_analysis" as NavModule, label: "Analisis Hasil Belajar", icon: TrendingUp, highlight: true },
        { id: "discipline" as NavModule, label: "Pelanggaran & BK", icon: ShieldAlert },
        { id: "timetable" as NavModule, label: "Jadwal Pelajaran", icon: CalendarDays },
        { id: "daily_log" as NavModule, label: "Jurnal Mengajar Harian", icon: ClipboardList },
        { id: "incidental" as NavModule, label: "Insidental & Buku Tamu", icon: BookMarked },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 border-r border-slate-800 shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-extrabold text-white italic text-xs tracking-tighter shadow-xs">
              EDU
            </div>
            <div className="leading-none">
              <h1 className="text-xs font-bold text-white uppercase tracking-wider">
                EduAdmin Pro
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">v2.4 High-Density</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High Density Nav Menu */}
        <nav className="flex-1 overflow-y-auto py-2 text-[11px] font-medium space-y-3">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="px-3 py-1 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectModule(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white border-l-2 border-indigo-400 font-bold"
                        : item.highlight
                        ? "text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border-l-2 border-indigo-500"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : item.highlight ? "text-indigo-400" : "text-slate-400"}`} />
                      <span className="truncate text-[11px]">{item.label}</span>
                    </div>
                    {item.hasAI && (
                      <span className="shrink-0 text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-500 text-white uppercase">
                        AI
                      </span>
                    )}
                    {item.badge && (
                      <span className="shrink-0 text-[8px] font-semibold px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Status */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>Google Sheets Sync</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Aktif
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>AI Agent Engine</span>
            <span className="text-indigo-300 font-mono">Gemini 3.6</span>
          </div>
        </div>
      </aside>
    </>
  );
};

