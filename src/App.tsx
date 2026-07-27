import React, { useState, useEffect } from "react";
import {
  SchoolIdentity,
  Student,
  AttendanceRecord,
  CPTPItem,
  IncidentRecord,
  GradeRecord,
  DailyGradeEntry,
  TimetableSlot,
  GuestBookEntry,
  IncidentalJournalEntry,
  DailyTeachingLog,
  AcademicCalendarEvent,
  ProtaItem,
  PromesItem,
  TeachingModule,
  AISettings,
  GASConfig,
  NavModule,
  UserAccount,
} from "./types";
import { DEFAULT_SUBJECTS } from "./constants/subjects";
import {
  INITIAL_SCHOOL_IDENTITY,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CPTP,
  INITIAL_INCIDENTS,
  INITIAL_GRADES,
  INITIAL_TIMETABLE,
  INITIAL_GUEST_BOOK,
  INITIAL_INCIDENTAL_JOURNALS,
  INITIAL_DAILY_LOGS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_PROTA,
  INITIAL_PROMES,
  INITIAL_TEACHING_MODULES,
  INITIAL_AI_SETTINGS,
  INITIAL_GAS_CONFIG,
  INITIAL_USERS,
} from "./data/initialData";
import { loadFromStorage, saveToStorage } from "./lib/storage";

// Components
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AIAgentModal } from "./components/AIAgentModal";
import { GoogleSheetsModal } from "./components/GoogleSheetsModal";
import { BackupModal } from "./components/BackupModal";
import { PrintModal } from "./components/PrintModal";
import { UserManagementModal } from "./components/UserManagementModal";

// Modules
import { SchoolIdentityView } from "./components/modules/SchoolIdentityView";
import { StudentRosterView } from "./components/modules/StudentRosterView";
import { BulkAttendanceView } from "./components/modules/BulkAttendanceView";
import { CurriculumCPTPView } from "./components/modules/CurriculumCPTPView";
import { DisciplineBKView } from "./components/modules/DisciplineBKView";
import { GradesMatrixView } from "./components/modules/GradesMatrixView";
import { TimetableScheduleView } from "./components/modules/TimetableScheduleView";
import { IncidentalGuestBookView } from "./components/modules/IncidentalGuestBookView";
import { DailyTeachingLogView } from "./components/modules/DailyTeachingLogView";
import { AcademicCalendarView } from "./components/modules/AcademicCalendarView";
import { ProtaPromesView } from "./components/modules/ProtaPromesView";
import { TeachingModuleGeneratorView } from "./components/modules/TeachingModuleGeneratorView";
import { LearningAnalysisView } from "./components/modules/LearningAnalysisView";

export default function App() {
  const [activeModule, setActiveModule] = useState<NavModule>("identity");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [printState, setPrintState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    content: React.ReactNode | null;
  }>({ isOpen: false, title: "", subtitle: "", content: null });

  // App State with Persistence
  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadFromStorage("usersList", INITIAL_USERS)
  );
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>(() =>
    loadFromStorage("schoolIdentity", INITIAL_SCHOOL_IDENTITY)
  );
  const [students, setStudents] = useState<Student[]>(() =>
    loadFromStorage("students", INITIAL_STUDENTS)
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadFromStorage("attendanceRecords", INITIAL_ATTENDANCE)
  );
  const [cptpItems, setCPTPItems] = useState<CPTPItem[]>(() =>
    loadFromStorage("cptpItems", INITIAL_CPTP)
  );
  const [incidents, setIncidents] = useState<IncidentRecord[]>(() =>
    loadFromStorage("incidents", INITIAL_INCIDENTS)
  );
  const [grades, setGrades] = useState<GradeRecord[]>(() =>
    loadFromStorage("grades", INITIAL_GRADES)
  );
  const [dailyGrades, setDailyGrades] = useState<DailyGradeEntry[]>(() =>
    loadFromStorage("dailyGrades", [])
  );
  const [subjects, setSubjects] = useState<string[]>(() => {
    const loaded = loadFromStorage<string[]>("customSubjects", []);
    const combined = Array.from(
      new Set([...DEFAULT_SUBJECTS, ...(Array.isArray(loaded) ? loaded : [])])
    );
    return combined;
  });
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() =>
    loadFromStorage("timetable", INITIAL_TIMETABLE)
  );
  const [guestBook, setGuestBook] = useState<GuestBookEntry[]>(() =>
    loadFromStorage("guestBook", INITIAL_GUEST_BOOK)
  );
  const [incidentalJournals, setIncidentalJournals] = useState<IncidentalJournalEntry[]>(() =>
    loadFromStorage("incidentalJournals", INITIAL_INCIDENTAL_JOURNALS)
  );
  const [dailyLogs, setDailyLogs] = useState<DailyTeachingLog[]>(() =>
    loadFromStorage("dailyLogs", INITIAL_DAILY_LOGS)
  );
  const [calendarEvents, setCalendarEvents] = useState<AcademicCalendarEvent[]>(() =>
    loadFromStorage("calendarEvents", INITIAL_CALENDAR_EVENTS)
  );
  const [protaList, setProtaList] = useState<ProtaItem[]>(() =>
    loadFromStorage("protaList", INITIAL_PROTA)
  );
  const [promesList, setPromesList] = useState<PromesItem[]>(() =>
    loadFromStorage("promesList", INITIAL_PROMES)
  );
  const [teachingModules, setTeachingModules] = useState<TeachingModule[]>(() =>
    loadFromStorage("teachingModules", INITIAL_TEACHING_MODULES)
  );
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const loaded = loadFromStorage("aiSettings", INITIAL_AI_SETTINGS);
    return {
      ...INITIAL_AI_SETTINGS,
      ...(loaded && typeof loaded === "object" ? loaded : {}),
    };
  });
  const [gasConfig, setGasConfig] = useState<GASConfig>(() =>
    loadFromStorage("gasConfig", INITIAL_GAS_CONFIG)
  );

  const [activeUserEmail, setActiveUserEmail] = useState<string>(
    () => users[0]?.email || "rachmatsusanto21@guru.sd.belajar.id"
  );

  // Cross-device auto sync GAS config by user email on mount/email change
  useEffect(() => {
    if (activeUserEmail) {
      fetch(`/api/user-config?email=${encodeURIComponent(activeUserEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.webAppUrl && data.webAppUrl !== gasConfig.webAppUrl) {
            setGasConfig((prev) => ({ ...prev, webAppUrl: data.webAppUrl }));
          }
        })
        .catch((err) => console.error("Error syncing user gas config:", err));
    }
  }, [activeUserEmail]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = loadFromStorage<"light" | "dark">("theme", "light");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    saveToStorage("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Sync to local storage
  useEffect(() => {
    saveToStorage("schoolIdentity", schoolIdentity);
  }, [schoolIdentity]);

  useEffect(() => {
    saveToStorage("usersList", users);
  }, [users]);

  useEffect(() => {
    saveToStorage("students", students);
  }, [students]);

  useEffect(() => {
    saveToStorage("attendanceRecords", attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    saveToStorage("cptpItems", cptpItems);
  }, [cptpItems]);

  useEffect(() => {
    saveToStorage("incidents", incidents);
  }, [incidents]);

  useEffect(() => {
    saveToStorage("grades", grades);
  }, [grades]);

  useEffect(() => {
    saveToStorage("dailyGrades", dailyGrades);
  }, [dailyGrades]);

  useEffect(() => {
    saveToStorage(
      "customSubjects",
      subjects.filter((s) => !DEFAULT_SUBJECTS.includes(s))
    );
  }, [subjects]);

  const handleAddCustomSubject = (newSubject: string) => {
    const trimmed = newSubject.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects((prev) => [...prev, trimmed]);
    }
  };

  useEffect(() => {
    saveToStorage("timetable", timetable);
  }, [timetable]);

  useEffect(() => {
    saveToStorage("guestBook", guestBook);
  }, [guestBook]);

  useEffect(() => {
    saveToStorage("incidentalJournals", incidentalJournals);
  }, [incidentalJournals]);

  useEffect(() => {
    saveToStorage("dailyLogs", dailyLogs);
  }, [dailyLogs]);

  useEffect(() => {
    saveToStorage("calendarEvents", calendarEvents);
  }, [calendarEvents]);

  useEffect(() => {
    saveToStorage("protaList", protaList);
  }, [protaList]);

  useEffect(() => {
    saveToStorage("promesList", promesList);
  }, [promesList]);

  useEffect(() => {
    saveToStorage("teachingModules", teachingModules);
  }, [teachingModules]);

  useEffect(() => {
    saveToStorage("aiSettings", aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    saveToStorage("gasConfig", gasConfig);
  }, [gasConfig]);

  const handleOpenPrint = (title: string, subtitle: string, content: React.ReactNode) => {
    setPrintState({
      isOpen: true,
      title,
      subtitle,
      content,
    });
  };

  const handleClosePrint = () => {
    setPrintState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleRestoreData = (newData: Record<string, any>) => {
    if (newData.schoolIdentity) setSchoolIdentity(newData.schoolIdentity);
    if (newData.students) setStudents(newData.students);
    if (newData.attendanceRecords) setAttendanceRecords(newData.attendanceRecords);
    if (newData.cptpItems) setCPTPItems(newData.cptpItems);
    if (newData.incidents) setIncidents(newData.incidents);
    if (newData.grades) setGrades(newData.grades);
    if (newData.timetable) setTimetable(newData.timetable);
    if (newData.guestBook) setGuestBook(newData.guestBook);
    if (newData.incidentalJournals) setIncidentalJournals(newData.incidentalJournals);
    if (newData.dailyLogs) setDailyLogs(newData.dailyLogs);
    if (newData.calendarEvents) setCalendarEvents(newData.calendarEvents);
    if (newData.protaList) setProtaList(newData.protaList);
    if (newData.promesList) setPromesList(newData.promesList);
    if (newData.teachingModules) setTeachingModules(newData.teachingModules);
    alert("Data berhasil dipulihkan!");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Header Navigation */}
      <Header
        schoolIdentity={schoolIdentity}
        aiSettings={aiSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenSheetsModal={() => setIsGasModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(m) => {
            setActiveModule(m);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content View Container - High Density Layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 max-w-[1400px] mx-auto w-full space-y-4">
            {activeModule === "identity" && (
              <SchoolIdentityView
                identity={schoolIdentity}
                onSave={setSchoolIdentity}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "students" && (
              <StudentRosterView
                students={students}
                onSaveStudents={setStudents}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "attendance" && (
              <BulkAttendanceView
                students={students}
                attendanceRecords={attendanceRecords}
                onSaveAttendance={setAttendanceRecords}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "curriculum" && (
              <CurriculumCPTPView
                cptpItems={cptpItems}
                aiSettings={aiSettings}
                subjects={subjects}
                onAddSubject={handleAddCustomSubject}
                onSaveCPTP={setCPTPItems}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "discipline" && (
              <DisciplineBKView
                students={students}
                incidents={incidents}
                onSaveIncidents={setIncidents}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "grades" && (
              <GradesMatrixView
                students={students}
                cptpItems={cptpItems}
                grades={grades}
                dailyGrades={dailyGrades}
                subjects={subjects}
                onAddSubject={handleAddCustomSubject}
                onSaveGrades={setGrades}
                onSaveDailyGrades={setDailyGrades}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "learning_analysis" && (
              <LearningAnalysisView
                students={students}
                cptpItems={cptpItems}
                grades={grades}
                dailyGrades={dailyGrades}
                subjects={subjects}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "timetable" && (
              <TimetableScheduleView
                timetable={timetable}
                onSaveTimetable={setTimetable}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "incidental" && (
              <IncidentalGuestBookView
                guestBook={guestBook}
                incidentalJournals={incidentalJournals}
                onSaveGuestBook={setGuestBook}
                onSaveIncidentalJournals={setIncidentalJournals}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "daily_log" && (
              <DailyTeachingLogView
                logs={dailyLogs}
                cptpItems={cptpItems}
                subjects={subjects}
                schoolIdentity={schoolIdentity}
                attendanceRecords={attendanceRecords}
                students={students}
                onSaveLogs={setDailyLogs}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "calendar" && (
              <AcademicCalendarView
                schoolIdentity={schoolIdentity}
                events={calendarEvents}
                timetable={timetable}
                subjects={subjects}
                incidentalJournals={incidentalJournals}
                protaList={protaList}
                onUpdateSchoolIdentity={setSchoolIdentity}
                onSaveEvents={setCalendarEvents}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "prota_promes" && (
              <ProtaPromesView
                protaList={protaList}
                promesList={promesList}
                cptpItems={cptpItems}
                subjects={subjects}
                timetable={timetable}
                calendarEvents={calendarEvents}
                incidentalJournals={incidentalJournals}
                schoolIdentity={schoolIdentity}
                onSaveProta={setProtaList}
                onSavePromes={setPromesList}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "teaching_module" && (
              <TeachingModuleGeneratorView
                schoolIdentity={schoolIdentity}
                students={students}
                teachingModules={teachingModules}
                aiSettings={aiSettings}
                onSaveModules={setTeachingModules}
                onOpenPrint={handleOpenPrint}
              />
            )}
          </main>

          {/* Global High-Density Footer */}
          <footer className="h-9 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            <div className="flex gap-4 items-center">
              <span>🔑 AI Key Status: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">Terhubung</span></span>
              <span className="hidden sm:inline">📍 Latency: <span className="font-mono text-slate-700 dark:text-slate-300">12ms</span></span>
              <span>⚡ High Density Theme v2.4 ({theme === "dark" ? "Dark" : "Light"})</span>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => setIsAiModalOpen(true)} className="hover:text-indigo-600 dark:hover:text-indigo-400 uppercase font-bold tracking-tight">Pilih Agent AI</button>
              <span>•</span>
              <button onClick={() => setIsGasModalOpen(true)} className="hover:text-indigo-600 dark:hover:text-indigo-400 uppercase font-bold tracking-tight">Sync Sheets</button>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Modals */}
      <AIAgentModal
        isOpen={isAiModalOpen}
        settings={aiSettings}
        onSaveSettings={setAiSettings}
        onClose={() => setIsAiModalOpen(false)}
      />

      <GoogleSheetsModal
        isOpen={isGasModalOpen}
        config={gasConfig}
        onSaveConfig={setGasConfig}
        onClose={() => setIsGasModalOpen(false)}
        users={users}
        activeUserEmail={activeUserEmail}
        onSelectUserEmail={setActiveUserEmail}
        allData={{
          schoolIdentity,
          students,
          attendanceRecords,
          cptpItems,
          incidents,
          grades,
          timetable,
          guestBook,
          incidentalJournals,
          dailyLogs,
          calendarEvents,
          protaList,
          promesList,
          teachingModules,
        }}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        schoolIdentity={schoolIdentity}
        gasConfig={gasConfig}
        onRestoreData={handleRestoreData}
        allData={{
          schoolIdentity,
          students,
          attendanceRecords,
          cptpItems,
          incidents,
          grades,
          timetable,
          guestBook,
          incidentalJournals,
          dailyLogs,
          calendarEvents,
          protaList,
          promesList,
          teachingModules,
        }}
      />

      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={users}
        onSaveUsers={setUsers}
      />

      <PrintModal
        isOpen={printState.isOpen}
        title={printState.title}
        subtitle={printState.subtitle}
        schoolIdentity={schoolIdentity}
        onClose={handleClosePrint}
      >
        {printState.content}
      </PrintModal>
    </div>
  );
}
