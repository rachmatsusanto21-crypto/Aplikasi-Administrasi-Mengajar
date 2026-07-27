export type PhaseType = "Fase A" | "Fase B" | "Fase C" | "Fase D" | "Fase E" | "Fase F";
export type SemesterType = "Ganjil" | "Genap";
export type LearningModelType = "PjBL" | "PBL" | "Discovery Learning" | "Inquiry" | "Cooperative Learning" | "Deep Learning (Mindful, Meaningful, Joyful)" | "STEM" | "Kombinasi";
export type ModulCategoryType = "Intrakurikuler" | "Kokurikuler (P5)";

export interface UserAccount {
  id: string;
  name: string;
  nip: string;
  email: string;
  role: "Guru Kelas" | "Guru Mapel" | "Operator Sekolah" | "Kepala Sekolah" | "Admin Kurikulum";
  status: "Aktif" | "Non-Aktif";
  avatarUrl?: string;
  phone?: string;
  webAppUrl?: string;
}

export interface SchoolIdentity {
  schoolName: string;
  npsn: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  website: string;
  email: string;
  phone: string;
  logoUrl: string;
  logoLeftUrl?: string;
  logoRightUrl?: string;
  academicYear: string;
  academicYearStartDate?: string; // YYYY-MM-DD
  academicYearEndDate?: string;   // YYYY-MM-DD
  semester: SemesterType;
  phase: PhaseType;
  gradeClass: string;
  headmasterName: string;
  headmasterNip: string;
  teacherName: string;
  teacherNip: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: "L" | "P";
  customFields?: Record<string, string>;
}

export type AttendanceStatus = "H" | "S" | "I" | "A";

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  reason?: string; // Reason for S/I/A e.g., "Demam", "Acara Keluarga"
}

export interface CPTPItem {
  id: string;
  subject: string;
  element: string;
  codeCP: string;
  descriptionCP: string;
  codeTP: string;
  descriptionTP: string;
  targetClass: string;
}

export interface IncidentRecord {
  id: string;
  date: string;
  studentId: string;
  type: "Pelanggaran" | "Prestasi" | "Bimbingan Konseling";
  category: "Ringan" | "Sedang" | "Berat" | "Positif";
  description: string;
  actionTaken: string;
  counselorName: string;
  status: "Selesai" | "Proses Bimbingan" | "Panggilan Orang Tua";
  parentSignatureNote?: string;
}

export interface GradeRecord {
  studentId: string;
  subject: string;
  tpScores: Record<string, number>; // tpCode -> score (e.g. "TP1": 85)
  midSummative?: number;
  finalSummative?: number;
}

export type GradeAssessmentType = "Tugas" | "Ulangan Harian" | "STS" | "SAS";

export interface DailyGradeEntry {
  id: string;
  studentId: string;
  subject: string;
  tpCode: string;
  tpDescription?: string;
  assessmentType: GradeAssessmentType;
  dateFormatted: string; // dd/m format, e.g. "25/7"
  score: number;
}

export interface TimetableSlot {
  id: string;
  day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu";
  period: number; // 1-8
  timeRange: string;
  subject: string;
  roomOrTeacher?: string;
}

export interface GuestBookEntry {
  id: string;
  date: string;
  time: string;
  visitorName: string;
  institution: string;
  purpose: string;
  phone: string;
  notes: string;
}

export interface IncidentalJournalEntry {
  id: string;
  date: string;
  time: string;
  activityName: string;
  organizer: string;
  location: string;
  description: string;
  followUp: string;
}

export interface TeachingJournalEntry {
  id: string;
  date: string;
  period: string; // e.g. "Jam 1-3"
  subject: string;
  materialOrTP: string;
  learningActivity: string;
  studentsPresent: number;
  studentsAbsent: number;
  absentNotes: string;
  reflectionNotes: string;
}

export interface CalendarEvent {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  title: string;
  type: "Hari Efektif" | "Libur Nasional" | "Libur Semester" | "Asesmen/Ujian" | "Kegiatan Sekolah";
  color: string;
}

export interface MonthlyEffectiveDays {
  monthName: string;
  totalCalendarDays: number;
  totalSundayHolidays: number;
  totalNationalHolidays: number;
  effectiveDays: number;
  effectiveWeeks: number;
  notes?: string;
}

export interface ProtaItem {
  id: string;
  subject: string;
  element?: string;
  codeTP: string;
  tpCode?: string;
  tpDescription: string;
  timeAllocationJP: number;
  allocatedJP?: number;
  semester: SemesterType | number;
}

export interface GASConfig {
  webAppUrl: string;
  spreadsheetId: string;
  autoSync: boolean;
  email?: string;
}

export type DailyTeachingLog = {
  id: string;
  date: string;
  subject: string;
  classGrade: string;
  material: string;
  tpDescription: string;
  attendanceSummary: string;
  notes: string;
  reflection: string;
};

export type AcademicCalendarEvent = {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  type: "Libur" | "Kegiatan Sekolah" | "Ujian / Asesmen";
  description?: string;
};

export type ActivityTableRow = {
  no: number;
  tahap: string;
  kegiatan: string;
  alokasiWaktu: string;
};

export type RubrikFormatifItem = {
  kriteria: string;
  sangatBaik: string;
  baik: string;
  cukup: string;
  perluBimbingan: string;
};

export type RubrikSumatifItem = {
  kriteria: string;
  indikator: string;
  skorMaks: number;
  pedoman: string;
};

export type KisiKisiItem = {
  no: number;
  indikator: string;
  levelKognitif?: string;
  bentukSoal: string;
  nomorSoal: string;
  tingkat?: string;
  kunciJawaban?: string;
  skorPerSoal?: number;
};

export type SoalItem = {
  no: number;
  pertanyaan: string;
  pilihan?: string[];
  kunciJawaban: string;
};

export type RefleksiItem = {
  no: number;
  pertanyaan: string;
  catatan: string;
};

export type TeachingModule = {
  id: string;
  title: string;
  moduleType: "Intrakurikuler" | "Kokurikuler";
  subject: string;
  targetClass: string;
  approach: "Deep Learning" | "STEM" | "Kombinasi Deep Learning & STEM";
  learningModel: string;
  allocationJP: string;
  generalInfo: {
    kompetensiAwal?: string;
    profilPelajarPancasila?: string[] | string;
    saranaPrasarana?: string;
    targetPesertaDidik?: string;
  };
  coreComponent: {
    tujuanPembelajaran?: string;
    pemahamanBermakna?: string;
    pertanyaanPemantik?: string;
  };
  activities: {
    pendahuluan?: string;
    inti?: string;
    penutup?: string;
  };
  activitiesTable?: ActivityTableRow[];
  assessment: {
    diagnostik?: string;
    formatif?: string;
    sumatif?: string;
  };
  rubrikPenilaian?: string;
  rubrikFormatif?: RubrikFormatifItem[];
  rubrikSumatif?: RubrikSumatifItem[];
  kisiKisiSumatif?: KisiKisiItem[];
  soalSumatifList?: SoalItem[];
  lkpdText?: string;
  refleksiGuru?: RefleksiItem[];
  refleksiSiswa?: RefleksiItem[];
};

export type NavModule =
  | "dashboard"
  | "identity"
  | "students"
  | "attendance"
  | "curriculum"
  | "discipline"
  | "grades"
  | "learning_analysis"
  | "timetable"
  | "incidental"
  | "daily_log"
  | "calendar"
  | "prota_promes"
  | "teaching_module";

export type ActiveModule = NavModule;

export interface PromesItem {
  id: string;
  subject: string;
  codeTP: string;
  tpDescription: string;
  timeAllocationJP: number;
  semester: SemesterType;
  monthlyAllocation: Record<string, number[]>; // e.g., "Juli": [2, 2, 0, 0]
}

export interface ModulAjar {
  id: string;
  title: string;
  subject: string;
  gradeClass: string;
  phase: PhaseType;
  category: ModulCategoryType;
  timeAllocation: string; // e.g. "2 x 35 Menit (2 JP)"
  modelPembelajaran: LearningModelType;
  targetSiswa: string;
  profilPelajarPancasila: string[];
  capaianPembelajaran: string;
  tujuanPembelajaran: string;
  pemahamanBermakna: string;
  pertanyaanPemantik: string;
  saranaPrasarana: string;
  kegiatanPendahuluan: string;
  kegiatanInti: string; // Sintaks model
  kegiatanPenutup: string;
  asesmenFormatifSumatif: string;
  pengayaanRemedial: string;
  refleksiGuruSiswa: string;
  lampiranLKPD: string;
  createdAt: string;
}

export interface AISettings {
  selectedAgent: string; // e.g., "gemini-3.6-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"
  manualApiKey: string;
  sheetsWebAppUrl: string;
  autoSyncSheets: boolean;
}
