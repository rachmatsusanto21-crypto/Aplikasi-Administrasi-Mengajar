import React, { useState } from "react";
import { TeachingModule, AISettings, SchoolIdentity, Student, ActivityTableRow, RubrikFormatifItem, RubrikSumatifItem, KisiKisiItem, SoalItem, RefleksiItem } from "../../types";
import { Sparkles, Trash2, Download, Printer, Layers, FileText, CheckCircle2, UserCheck, HelpCircle, Palette } from "lucide-react";
import { exportDataToJSON } from "../../lib/storage";
import { generateAIContent } from "../../lib/aiHelper";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportTeachingModuleToDocx } from "../../lib/exportDocx";
import { KopSurat } from "../KopSurat";

interface TeachingModuleGeneratorViewProps {
  schoolIdentity: SchoolIdentity;
  students?: Student[];
  teachingModules: TeachingModule[];
  aiSettings: AISettings;
  onSaveModules: (updated: TeachingModule[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

function safeString(val: any, fallback = "-"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return fallback;
    return val.map((v) => safeString(v, "")).filter(Boolean).join(", ");
  }
  if (typeof val === "object") {
    const entries = Object.entries(val);
    if (entries.length === 0) return fallback;
    return entries
      .map(([k, v]) => {
        const keyLabel = k
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .trim();
        const formattedKey = keyLabel.charAt(0).toUpperCase() + keyLabel.slice(1);
        return `${formattedKey}: ${safeString(v, "-")}`;
      })
      .join("\n");
  }
  return String(val);
}

function safeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => safeString(item, "")).filter(Boolean);
  }
  if (typeof val === "string") {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof val === "object") {
    return Object.values(val)
      .map((item) => safeString(item, ""))
      .filter(Boolean);
  }
  return [String(val)];
}

function getDefaultActivitiesTable(act?: { pendahuluan?: string; inti?: string; penutup?: string }, modelName = "Deep Learning"): ActivityTableRow[] {
  return [
    {
      no: 1,
      tahap: "Kegiatan Pembukaan (Mindful Learning)",
      kegiatan: act?.pendahuluan || "1. Guru memberikan salam dan pengondisian kelas dengan latihan kesadaran penuh (mindful greeting).\n2. Guru menyampaikan tujuan pembelajaran, memberikan apersepsi, dan mengajukan pertanyaan pemantik.",
      alokasiWaktu: "10 - 15 Menit",
    },
    {
      no: 2,
      tahap: `Kegiatan Inti (Sintaks ${modelName} - Meaningful)`,
      kegiatan: act?.inti || "1. Siswa membentuk kelompok dan mengamati media / bahan ajar yang disediakan.\n2. Siswa berdiskusi memecahkan masalah, menyusun langkah kerja, dan mengerjakan LKPD.\n3. Setiap kelompok mempresentasikan hasil unjuk karya dan memberikan umpan balik antar teman.",
      alokasiWaktu: "45 - 50 Menit",
    },
    {
      no: 3,
      tahap: "Kegiatan Penutup (Joyful Reflection)",
      kegiatan: act?.penutup || "1. Siswa bersama guru menyimpulkan poin-poin penting pembelajaran hari ini.\n2. Siswa melakukan refleksi emosi dan tingkat pemahaman (Joyful Reflection).\n3. Guru memberikan apresiasi, penyampaian tindak lanjut, serta doa dan salam penutup.",
      alokasiWaktu: "10 Menit",
    },
  ];
}

function getDefaultRubrikFormatif(topic = "Materi Pembelajaran"): RubrikFormatifItem[] {
  return [
    {
      kriteria: "Pemahaman Konsep & Keaktifan Diskusi",
      sangatBaik: "Sangat aktif berdiskusi, memahami seluruh konsep dasar, serta mampu memimpin pemecahan masalah dalam kelompok.",
      baik: "Aktif berdiskusi dan mampu menjelaskan konsep dasar topik dengan tepat.",
      cukup: "Cukup aktif dalam diskusi namun masih memerlukan bantuan penjelasan konsep dasar.",
      perluBimbingan: "Pasif dalam kegiatan kelompok dan memerlukan bimbingan penuh dari guru.",
    },
    {
      kriteria: "Penyelesaian LKPD & Unjuk Kerja",
      sangatBaik: "Menyelesaikan seluruh tugas LKPD secara akurat, rapi, dan tepat waktu.",
      baik: "Menyelesaikan LKPD dengan benar dan rapi.",
      cukup: "Menyelesaikan sebagian besar LKPD tetapi terdapat beberapa kesalahan konsep.",
      perluBimbingan: "Belum dapat menyelesaikan LKPD secara mandiri dan memerlukan asistensi guru.",
    },
  ];
}

function getDefaultRubrikSumatif(topic = "Materi Pembelajaran"): RubrikSumatifItem[] {
  return [
    {
      kriteria: "Penguasaan Materi Tertulis (Soal PG & Isian)",
      indikator: `Menjawab dengan benar soal pilihan ganda dan isian mengenai ${topic}`,
      skorMaks: 50,
      pedoman: "Setiap jawaban pilihan ganda benar diberi skor 10; isian benar diberi skor 20.",
    },
    {
      kriteria: "Penalaran & Analisis Uraian (Soal Uraian/HOTS)",
      indikator: "Memberikan penjelasan logis dan terstruktur pada soal pemecahan masalah",
      skorMaks: 50,
      pedoman: "Penjelasan sangat lengkap & logis = 50; Cukup lengkap = 35; Kurang lengkap = 20; Salah = 5.",
    },
  ];
}

function getDefaultKisiKisi(subject = "Mata Pelajaran", topic = "Materi Utama"): KisiKisiItem[] {
  return [
    { no: 1, indikator: `Menganalisis dan menentukan komposisi pecahan uang rupiah dalam transaksi kontekstual`, levelKognitif: "C3 (L2 - Menerapkan)", bentukSoal: "Pilihan Ganda", nomorSoal: "1", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 2, indikator: `Menghitung sisa uang kembalian pada transaksi pengurangan bilangan cacah`, levelKognitif: "C3 (L2 - Menerapkan)", bentukSoal: "Pilihan Ganda", nomorSoal: "2", kunciJawaban: "B", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 3, indikator: `Menentukan hasil penjumlahan beruntun ribuan pada masalah kontekstual`, levelKognitif: "C2 (L1 - Memahami)", bentukSoal: "Pilihan Ganda", nomorSoal: "3", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 4, indikator: `Menganalisis sisa barang dengan operasi pengurangan beruntun`, levelKognitif: "C4 (L3 - Menganalisis)", bentukSoal: "Pilihan Ganda", nomorSoal: "4", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Sukar" },
    { no: 5, indikator: `Menghitung total biaya tiket masuk rombongan dengan perkalian bilangan`, levelKognitif: "C3 (L2 - Menerapkan)", bentukSoal: "Pilihan Ganda", nomorSoal: "5", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 6, indikator: `Menentukan akumulasi jumlah tabungan harian dalam jangka waktu tertentu`, levelKognitif: "C3 (L2 - Menerapkan)", bentukSoal: "Isian Singkat", nomorSoal: "6", kunciJawaban: "Rp 85.000,00", skorPerSoal: 10, tingkat: "Sedang" },
    { no: 7, indikator: `Menhitung total unit barang dalam kemasan dus (perkalian)`, levelKognitif: "C2 (L1 - Memahami)", bentukSoal: "Isian Singkat", nomorSoal: "7", kunciJawaban: "480 bungkus", skorPerSoal: 10, tingkat: "Mudah" },
    { no: 8, indikator: `Menghitung total harga belanjaan kombinasi beberapa barang`, levelKognitif: "C3 (L2 - Menerapkan)", bentukSoal: "Isian Singkat", nomorSoal: "8", kunciJawaban: "Rp 18.500,00", skorPerSoal: 10, tingkat: "Sedang" },
    { no: 9, indikator: `Menganalisis dan memecahkan soal cerita pembagian bantuan secara proporsional`, levelKognitif: "C4 (L3 - Menganalisis)", bentukSoal: "Uraian HOTS", nomorSoal: "9", kunciJawaban: "25 kg per keluarga", skorPerSoal: 25, tingkat: "Sukar" },
    { no: 10, indikator: `Menghitung dan mengevaluasi keuntungan penjualan barang dalam satuan kodi`, levelKognitif: "C5 (L3 - Mengevaluasi)", bentukSoal: "Uraian HOTS", nomorSoal: "10", kunciJawaban: "Untung Rp 1.000.000,00", skorPerSoal: 25, tingkat: "Sukar" },
  ];
}

function getDefaultSoalSumatif(topic = "Materi Utama"): SoalItem[] {
  return [
    {
      no: 1,
      pertanyaan: `Jika Andi membeli sebuah sepatu dengan uang yang dia berikan berupa 1 lembar Rp 50.000,00, 2 lembar Rp 10.000,00, dan 1 lembar Rp 5.000,00 tanpa uang kembalian, maka harga sepatu yang dibeli Andi adalah...`,
      pilihan: [
        "A. Rp 75.000,00",
        "B. Rp 70.000,00",
        "C. Rp 65.000,00",
        "D. Rp 80.000,00"
      ],
      kunciJawaban: "A. Rp 75.000,00 (Perhitungan: 50.000 + 20.000 + 5.000 = 75.000)",
    },
    {
      no: 2,
      pertanyaan: `Ibu Rina membawa uang Rp 100.000,00 untuk membeli beras seharga Rp 68.500,00 dan minyak goreng seharga Rp 24.000,00. Sisa uang kembalian yang diterima Ibu Rina adalah...`,
      pilihan: [
        "A. Rp 6.500,00",
        "B. Rp 7.500,00",
        "C. Rp 8.500,00",
        "D. Rp 9.000,00"
      ],
      kunciJawaban: "B. Rp 7.500,00 (Total belanja = 92.500, Kembalian = 100.000 - 92.500 = 7.500)",
    },
    {
      no: 3,
      pertanyaan: `Sebuah perpustakaan sekolah memiliki 3.450 buku cerita dan 2.180 buku pelajaran. Jika hari ini datang kiriman 750 buku baru, total buku di perpustakaan sekarang adalah...`,
      pilihan: [
        "A. 6.380 buku",
        "B. 6.280 buku",
        "C. 5.630 buku",
        "D. 6.480 buku"
      ],
      kunciJawaban: "A. 6.380 buku (3.450 + 2.180 + 750 = 6.380)",
    },
    {
      no: 4,
      pertanyaan: `Pak Budi memanen 450 kg mangga. Sebanyak 125 kg dijual ke pasar A dan 210 kg dijual ke pasar B. Sisa mangga Pak Budi yang belum terjual adalah...`,
      pilihan: [
        "A. 115 kg",
        "B. 125 kg",
        "C. 105 kg",
        "D. 135 kg"
      ],
      kunciJawaban: "A. 115 kg (450 - 125 - 210 = 115 kg)",
    },
    {
      no: 5,
      pertanyaan: `Di sebuah wahana edukasi, tiket masuk anak seharga Rp 15.000,00. Jika rombongan SD membawa 25 orang siswa, total biaya tiket seluruh siswa adalah...`,
      pilihan: [
        "A. Rp 375.000,00",
        "B. Rp 350.000,00",
        "C. Rp 400.000,00",
        "D. Rp 325.000,00"
      ],
      kunciJawaban: "A. Rp 375.000,00 (25 x 15.000 = 375.000)",
    },
    {
      no: 6,
      pertanyaan: `Budi memiliki simpanan awal Rp 45.000,00. Setiap hari ia menyisihkan uang saku sebesar Rp 5.000,00. Setelah 8 hari berturut-turut, berapa total uang simpanan Budi sekarang? (Isian Singkat)`,
      kunciJawaban: "Rp 85.000,00 (45.000 + (8 x 5.000) = 85.000)",
    },
    {
      no: 7,
      pertanyaan: `Sebuah toko kelontong menerima persediaan 12 dus mi instan. Jika setiap dus berisi 40 bungkus, berapa total seluruh mi instan di toko tersebut? (Isian Singkat)`,
      kunciJawaban: "480 bungkus (12 x 40 = 480)",
    },
    {
      no: 8,
      pertanyaan: `Siti membeli 3 buah buku tulis seharga Rp 4.500,00 per buku dan 2 buah pensil seharga Rp 2.500,00 per pensil. Berapa total uang yang harus dibayar Siti? (Isian Singkat)`,
      kunciJawaban: "Rp 18.500,00 ((3 x 4.500) + (2 x 2.500) = 13.500 + 5.000 = 18.500)",
    },
    {
      no: 9,
      pertanyaan: `Sebuah panti asuhan mendapat bantuan 5 karung beras. Setiap karung berisi 50 kg beras. Seluruh beras tersebut akan dibagikan sama banyak kepada 10 keluarga kurang mampu di sekitar sekolah. Tuliskan langkah perhitungan runtut dan berapa kg beras yang diterima oleh masing-masing keluarga! (Uraian HOTS)`,
      kunciJawaban: "1. Total beras = 5 karung x 50 kg = 250 kg. 2. Pembagian per keluarga = 250 kg / 10 keluarga = 25 kg per keluarga.",
    },
    {
      no: 10,
      pertanyaan: `Pak Ahmad membeli 2 kodi baju kaos seharga total Rp 800.000,00. Jika seluruh baju tersebut habis dijual kembali oleh Pak Ahmad dengan harga Rp 45.000,00 per buah, hitunglah total uang hasil penjualan dan berapa keuntungan yang didapatkan Pak Ahmad! (Uraian HOTS)`,
      kunciJawaban: "1. Total kaos = 2 kodi x 20 buah = 40 buah. 2. Hasil penjualan = 40 x Rp 45.000 = Rp 1.800.000. 3. Keuntungan = Rp 1.800.000 - Rp 800.000 = Rp 1.000.000.",
    },
  ];
}

function getDefaultRefleksiGuru(): RefleksiItem[] {
  return [
    { no: 1, pertanyaan: "Apakah seluruh peserta didik telah mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)?", catatan: "Sebagian besar murid (sekitar 88%) mencapai KKTP dengan sangat baik, beberapa murid memerlukan bimbingan khusus." },
    { no: 2, pertanyaan: "Apa kendala utama yang dirasakan selama pelaksanaan kegiatan inti pembelajaran?", catatan: "Manajemen alokasi waktu saat presentasi kelompok perlu ditertibkan agar semua kelompok mendapat porsi yang sama." },
    { no: 3, pertanyaan: "Langkah perbaikan apa yang akan diterapkan pada modul dan sesi berikutnya?", catatan: "Menggunakan penanda waktu visual (timer) dan variasi media interaktif yang lebih dekat dengan kehidupan murid." },
  ];
}

function getDefaultRefleksiSiswa(): RefleksiItem[] {
  return [
    { no: 1, pertanyaan: "Bagaimana perasaanmu selama mengikuti pembelajaran hari ini?", catatan: "Sangat senang dan متحمس (bersemangat) karena dapat belajar kelompok dan membuat karya bersama." },
    { no: 2, pertanyaan: "Bagian mana dari kegiatan pembelajaran yang paling menarik bagimu?", catatan: "Saat berdiskusi menyelesaikan tantangan LKPD dan mempresentasikan hasilnya di depan kelas." },
    { no: 3, pertanyaan: "Apakah kamu mengalami kesulitan saat memahami materi hari ini?", catatan: "Awalnya sedikit bingung, namun setelah dijelaskan kembali oleh guru dan teman kelompok menjadi paham." },
  ];
}

function getFullStudentGradeList(studentsProps?: Student[]) {
  const defaultNames = [
    "Ahmad Riski Subagja", "Budi Santoso", "Citra Dewi Lestari", "Diki Ramadhan", "Eko Prasetyo",
    "Fitriani Nurhasanah", "Gilang Maulana", "Hesti Putri Pertiwi", "Indra Wijaya", "Joko Susilo",
    "Kiki Amalia", "Lani Rahmawati", "Muhammad Farhan", "Nabila Syahrani", "Okta Dian Pratama",
    "Putu Giri Ananda", "Qori Hafiz", "Rian Hidayat", "Sinta Nur Haliza", "Tono Harso",
    "Utama Putra", "Vina Panduwinata", "Wahyu Setiawan", "Yulia Fitri", "Zidan Ramadhan", "Aditya Perkasa"
  ];

  const result: Array<{
    no: number;
    nisn: string;
    nama: string;
    f1: number;
    f2: number;
    f3: number;
    rataF: number;
    s1: number;
    na: number;
    status: string;
  }> = [];

  const totalCount = Math.max(26, studentsProps?.length || 0);

  for (let i = 0; i < totalCount; i++) {
    const student = studentsProps && studentsProps[i];
    const nama = student ? student.name : defaultNames[i % defaultNames.length];
    const nisn = student ? (student.nisn || `008${1000 + i}`) : `008${1234 + i}`;

    const f1 = 78 + ((i * 7) % 20);
    const f2 = 80 + ((i * 3) % 18);
    const f3 = 75 + ((i * 5) % 22);
    const rataF = Math.round((f1 + f2 + f3) / 3);
    const s1 = 76 + ((i * 11) % 22);
    const na = Math.round(rataF * 0.4 + s1 * 0.6);
    const status = na >= 75 ? "Tuntas (KKTP)" : "Perlu Bimbingan";

    result.push({
      no: i + 1,
      nisn,
      nama,
      f1,
      f2,
      f3,
      rataF,
      s1,
      na,
      status,
    });
  }

  return result;
}

function ensureModuleStructure(mod: any): TeachingModule {
  if (!mod) mod = {};

  const gen = mod.generalInfo || {};
  const core = mod.coreComponent || {};
  const act = mod.activities || {};
  const ass = mod.assessment || {};

  const subject = safeString(mod.subject, "Mata Pelajaran");
  const topic = safeString(mod.title || core.tujuanPembelajaran, "Topik Pembelajaran");
  const modelName = safeString(mod.learningModel || mod.modelPembelajaran, "PjBL (Project Based Learning)");

  let actTable: ActivityTableRow[] = Array.isArray(mod.activitiesTable) && mod.activitiesTable.length > 0
    ? mod.activitiesTable.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        tahap: safeString(r.tahap, `Tahap ${idx + 1}`),
        kegiatan: safeString(r.kegiatan, "-"),
        alokasiWaktu: safeString(r.alokasiWaktu, "15 Menit"),
      }))
    : getDefaultActivitiesTable(act, modelName);

  let rubFormatif: RubrikFormatifItem[] = Array.isArray(mod.rubrikFormatif) && mod.rubrikFormatif.length > 0
    ? mod.rubrikFormatif.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Aspek Penilaian"),
        sangatBaik: safeString(r.sangatBaik, "Sangat Baik (4)"),
        baik: safeString(r.baik, "Baik (3)"),
        cukup: safeString(r.cukup, "Cukup (2)"),
        perluBimbingan: safeString(r.perluBimbingan, "Perlu Bimbingan (1)"),
      }))
    : getDefaultRubrikFormatif(topic);

  let rubSumatif: RubrikSumatifItem[] = Array.isArray(mod.rubrikSumatif) && mod.rubrikSumatif.length > 0
    ? mod.rubrikSumatif.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Unsur Penilaian"),
        indikator: safeString(r.indikator, "Indikator KKTP"),
        skorMaks: typeof r.skorMaks === "number" ? r.skorMaks : 50,
        pedoman: safeString(r.pedoman, "Pedoman Penskoran"),
      }))
    : getDefaultRubrikSumatif(topic);

  let kisiKisi: KisiKisiItem[] = Array.isArray(mod.kisiKisiSumatif) && mod.kisiKisiSumatif.length > 0
    ? mod.kisiKisiSumatif.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        indikator: safeString(r.indikator, "Indikator Soal"),
        levelKognitif: safeString(r.levelKognitif || r.tingkat, idx < 5 ? "C3 (L2 - Menerapkan)" : (idx < 8 ? "C3 (L2 - Menerapkan)" : "C4 (L3 - Menganalisis)")),
        bentukSoal: safeString(r.bentukSoal, idx < 5 ? "Pilihan Ganda" : (idx < 8 ? "Isian Singkat" : "Uraian HOTS")),
        nomorSoal: safeString(r.nomorSoal, `${idx + 1}`),
        tingkat: safeString(r.tingkat, idx < 5 ? "Sedang" : (idx < 8 ? "Sedang" : "Sukar")),
        kunciJawaban: safeString(r.kunciJawaban, "A"),
        skorPerSoal: typeof r.skorPerSoal === "number" ? r.skorPerSoal : (idx < 5 ? 4 : (idx < 8 ? 10 : 25)),
      }))
    : getDefaultKisiKisi(subject, topic);

  let soalList: SoalItem[] = Array.isArray(mod.soalSumatifList) && mod.soalSumatifList.length > 0
    ? mod.soalSumatifList.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Soal"),
        pilihan: Array.isArray(r.pilihan) ? r.pilihan.map((p: any) => safeString(p, "")) : undefined,
        kunciJawaban: safeString(r.kunciJawaban, "A"),
      }))
    : getDefaultSoalSumatif(topic);

  let refGuru: RefleksiItem[] = Array.isArray(mod.refleksiGuru) && mod.refleksiGuru.length > 0
    ? mod.refleksiGuru.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Refleksi"),
        catatan: safeString(r.catatan, "-"),
      }))
    : getDefaultRefleksiGuru();

  let refSiswa: RefleksiItem[] = Array.isArray(mod.refleksiSiswa) && mod.refleksiSiswa.length > 0
    ? mod.refleksiSiswa.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Refleksi"),
        catatan: safeString(r.catatan, "-"),
      }))
    : getDefaultRefleksiSiswa();

  return {
    id: safeString(mod.id, "mod_" + Date.now()),
    title: safeString(mod.title, "Modul Ajar"),
    moduleType: (safeString(mod.moduleType || mod.category, "Intrakurikuler") === "Kokurikuler" ? "Kokurikuler" : "Intrakurikuler"),
    subject: subject,
    targetClass: safeString(mod.targetClass || mod.gradeClass, "-"),
    approach: (safeString(mod.approach, "Deep Learning") as "Deep Learning" | "STEM" | "Kombinasi Deep Learning & STEM"),
    learningModel: modelName,
    allocationJP: safeString(mod.allocationJP || mod.timeAllocation, "-"),
    generalInfo: {
      kompetensiAwal: safeString(gen.kompetensiAwal || mod.capaianPembelajaran, "-"),
      profilPelajarPancasila: safeStringArray(gen.profilPelajarPancasila || mod.profilPelajarPancasila),
      saranaPrasarana: safeString(gen.saranaPrasarana || mod.saranaPrasarana, "-"),
      targetPesertaDidik: safeString(gen.targetPesertaDidik || mod.targetSiswa, "-"),
    },
    coreComponent: {
      tujuanPembelajaran: safeString(core.tujuanPembelajaran || mod.tujuanPembelajaran, "-"),
      pemahamanBermakna: safeString(core.pemahamanBermakna || mod.pemahamanBermakna, "-"),
      pertanyaanPemantik: safeString(core.pertanyaanPemantik || mod.pertanyaanPemantik, "-"),
    },
    activities: {
      pendahuluan: safeString(act.pendahuluan || mod.kegiatanPendahuluan, "-"),
      inti: safeString(act.inti || mod.kegiatanInti, "-"),
      penutup: safeString(act.penutup || mod.kegiatanPenutup, "-"),
    },
    activitiesTable: actTable,
    assessment: {
      diagnostik: safeString(ass.diagnostik, "-"),
      formatif: safeString(ass.formatif || mod.asesmenFormatifSumatif, "-"),
      sumatif: safeString(ass.sumatif || mod.asesmenFormatifSumatif, "-"),
    },
    rubrikPenilaian: safeString(mod.rubrikPenilaian || mod.pengayaanRemedial, "-"),
    rubrikFormatif: rubFormatif,
    rubrikSumatif: rubSumatif,
    kisiKisiSumatif: kisiKisi,
    soalSumatifList: soalList,
    lkpdText: safeString(mod.lkpdText || mod.lampiranLKPD, "-"),
    refleksiGuru: refGuru,
    refleksiSiswa: refSiswa,
  };
}

export const TeachingModuleGeneratorView: React.FC<TeachingModuleGeneratorViewProps> = ({
  schoolIdentity,
  students,
  teachingModules,
  aiSettings,
  onSaveModules,
  onOpenPrint,
}) => {
  const [selectedModule, setSelectedModule] = useState<TeachingModule | null>(
    teachingModules[0] ? ensureModuleStructure(teachingModules[0]) : null
  );

  const activeModule = selectedModule ? ensureModuleStructure(selectedModule) : null;
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form for AI Generation
  const [moduleType, setModuleType] = useState<"Intrakurikuler" | "Kokurikuler">(
    "Intrakurikuler"
  );
  const [subject, setSubject] = useState("Bahasa Indonesia");
  const [targetClass, setTargetClass] = useState("Kelas IV (Fase B)");
  const [materi, setMateri] = useState("Teks Cerita Rakyat & Amanat Moral");
  const [approach, setApproach] = useState<"Deep Learning" | "STEM" | "Kombinasi Deep Learning & STEM">(
    "Kombinasi Deep Learning & STEM"
  );
  const [learningModel, setLearningModel] = useState<
    "PjBL (Project Based Learning)" | "PBL (Problem Based Learning)" | "Discovery Learning" | "Inquiry Learning" | "Cooperative Learning"
  >("PjBL (Project Based Learning)");
  const [allocationJP, setAllocationJP] = useState("2 x 35 Menit (2 JP)");

  const handleGenerateModuleAI = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Anda adalah konsultan pengembang Modul Ajar Kurikulum Merdeka Indonesia tingkat Sekolah Dasar.
Buatkan draft MODUL AJAR ${moduleType.toUpperCase()} yang sangat lengkap, terstruktur, dan siap cetak.

Detail Input:
- Jenis Modul: ${moduleType}
- Mata Pelajaran / Proyek Kokurikuler: ${subject}
- Kelas & Fase: ${targetClass}
- Topik / Materi Utama: ${materi}
- Pendekatan Pembelajaran: ${approach} (Prinsip Mindful, Meaningful, Joyful Learning)
- Model Pembelajaran: ${learningModel}
- Alokasi Waktu: ${allocationJP}
- Nama Sekolah: ${schoolIdentity.schoolName}
- Nama Guru: ${schoolIdentity.teacherName}

Format Output HARUS berupa JSON murni tanpa markdown lain:
{
  "title": "Judul Modul Ajar - ${materi}",
  "moduleType": "${moduleType}",
  "subject": "${subject}",
  "targetClass": "${targetClass}",
  "approach": "${approach}",
  "learningModel": "${learningModel}",
  "allocationJP": "${allocationJP}",
  "generalInfo": {
    "kompetensiAwal": "Deskripsi kemahiran awal murid sebelum masuk topik",
    "profilPelajarPancasila": ["Bernalar Kritis", "Gotong Royong", "Kreatif"],
    "saranaPrasarana": "Buku bacaan, laptop, proyektor, LKPD",
    "targetPesertaDidik": "Reguler (26 Murid)"
  },
  "coreComponent": {
    "tujuanPembelajaran": "Murid mampu menganalisis konsep dan memecahkan masalah melalui unjuk karya.",
    "pemahamanBermakna": "Konsep materi bermanfaat langsung dalam kehidupan nyata.",
    "pertanyaanPemantik": "Pertanyaan yang memicu rasa ingin tahu siswa"
  },
  "activitiesTable": [
    { "no": 1, "tahap": "Kegiatan Pembukaan (Mindful Learning)", "kegiatan": "Guru menyapa murid dengan kesadaran penuh...", "alokasiWaktu": "15 Menit" },
    { "no": 2, "tahap": "Kegiatan Inti (Meaningful - Sintaks ${learningModel})", "kegiatan": "Murid berdiskusi dalam kelompok mengerjakan LKPD...", "alokasiWaktu": "45 Menit" },
    { "no": 3, "tahap": "Kegiatan Penutup (Joyful Reflection)", "kegiatan": "Murid dan guru merangkum serta melakukan refleksi...", "alokasiWaktu": "10 Menit" }
  ],
  "assessment": {
    "diagnostik": "Tanya jawab lisan diawal",
    "formatif": "Observasi keaktifan kelompok & lembar unjuk kerja LKPD",
    "sumatif": "Tes tertulis analisis konsep"
  },
  "rubrikFormatif": [
    { "kriteria": "Pemahaman Konsep & Diskusi", "sangatBaik": "Sangat aktif & paham penuh", "baik": "Aktif & paham", "cukup": "Cukup aktif", "perluBimbingan": "Pasif & butuh bimbingan" }
  ],
  "rubrikSumatif": [
    { "kriteria": "Penguasaan Materi Tertulis", "indikator": "Mampu menjawab soal PG dan Isian", "skorMaks": 50, "pedoman": "Skor sesuai bobot jawaban benar" }
  ],
  "kisiKisiSumatif": [
    { "no": 1, "indikator": "Menganalisis dan menentukan komposisi nilai uang...", "levelKognitif": "C3 (L2 - Menerapkan)", "bentukSoal": "Pilihan Ganda", "nomorSoal": "1", "kunciJawaban": "A", "skorPerSoal": 4, "tingkat": "Sedang" }
  ],
  "soalSumatifList": [
    { "no": 1, "pertanyaan": "Soal cerita kontekstual & numeratif nyata (misal: 'Jika Andi membeli sebuah sepatu dengan uang 1 lembar 50.000, 2 lembar 10.000, dan 1 lembar 5.000...'). Wajib hasilkan total 10 soal: 5 Pilihan Ganda (ada opsi A,B,C,D), 3 Isian Singkat, 2 Uraian HOTS.", "pilihan": ["A. Rp 75.000,00", "B. Rp 70.000,00", "C. Rp 65.000,00", "D. Rp 80.000,00"], "kunciJawaban": "A. Rp 75.000,00" }
  ],
  "lkpdText": "Lembar Kerja Peserta Didik (LKPD)...",
  "refleksiGuru": [
    { "no": 1, "pertanyaan": "Apakah siswa mencapai KKTP?", "catatan": "88% siswa tuntas..." }
  ],
  "refleksiSiswa": [
    { "no": 1, "pertanyaan": "Bagaimana perasaanmu setelah belajar?", "catatan": "Sangat senang..." }
  ]
}`;

      const result = await generateAIContent({
        prompt,
        model: aiSettings?.selectedAgent || "gemini-3.6-flash",
        manualApiKey: aiSettings?.manualApiKey || undefined,
      });

      if (result) {
        let cleanText = result.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.slice(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);

        const parsed = JSON.parse(cleanText);
        const rawMod = {
          id: "mod_" + Date.now(),
          title: parsed.title || `Modul ${materi}`,
          moduleType: parsed.moduleType || moduleType,
          subject: parsed.subject || subject,
          targetClass: parsed.targetClass || targetClass,
          approach: parsed.approach || approach,
          learningModel: parsed.learningModel || learningModel,
          allocationJP: parsed.allocationJP || allocationJP,
          generalInfo: parsed.generalInfo || {},
          coreComponent: parsed.coreComponent || {},
          activitiesTable: parsed.activitiesTable || [],
          assessment: parsed.assessment || {},
          rubrikFormatif: parsed.rubrikFormatif || [],
          rubrikSumatif: parsed.rubrikSumatif || [],
          kisiKisiSumatif: parsed.kisiKisiSumatif || [],
          soalSumatifList: parsed.soalSumatifList || [],
          lkpdText: parsed.lkpdText || "",
          refleksiGuru: parsed.refleksiGuru || [],
          refleksiSiswa: parsed.refleksiSiswa || [],
        };

        const newMod = ensureModuleStructure(rawMod);

        const updatedList = [newMod, ...teachingModules];
        onSaveModules(updatedList);
        setSelectedModule(newMod);
        setIsAiModalOpen(false);
      }
    } catch (err: any) {
      console.error("AI Generation failed, creating fallback template:", err);
      const fallbackRawMod = {
          id: "mod_" + Date.now(),
          title: `Modul Ajar Kurikulum Merdeka - ${materi}`,
          moduleType,
          subject,
          targetClass,
          approach,
          learningModel,
          allocationJP,
          generalInfo: {
            instansi: schoolIdentity.schoolName || "SD Negeri 1 Merdeka",
            faseKelas: `${targetClass}`,
            elemen: "Pemahaman Konsep & Keterampilan Proses",
            kompetensiAwal: `Siswa memiliki pemahaman dasar mengenai materi ${materi}.`,
            profilPancasila: "Beriman, Bertakwa kepada Tuhan YME, Bergotong Royong, Bernalar Kritis, Mandiri",
            sarpras: "Buku Paket, Proyektor, Kartu Gambar, LKPD, Laptop",
            targetSiswa: "Siswa Reguler / Tipikal (28-32 Murid)",
            metodePembelajaran: `${learningModel} dengan Pendekatan ${approach}`,
          },
          coreComponent: {
            tujuanPembelajaran: `1. Peserta didik mampu memahami konsep utama ${materi} secara mendalam.\n2. Peserta didik mampu mengaplikasikan pemahaman tentang ${materi} dalam menyelesaikan soal dan persoalan kehidupan sehari-hari.`,
            pemahamanBermakna: `Pemahaman tentang ${materi} membantu peserta didik berpikir logis, analitis, dan solutif dalam kehidupan sehari-hari.`,
            pertanyaanPemantik: `1. Pernahkah kalian menemui contoh ${materi} di lingkungan sekitar?\n2. Bagaimana cara kalian menyelesaikan permasalahan terkait ${materi}?`,
            persiapanPembelajaran: "Membuat rencana modul, menyiapkan lembar kerja peserta didik (LKPD), alat peraga, dan instrumen asesmen.",
          },
          activitiesTable: [
            {
              tahap: "Pendahuluan (15 Menit)",
              kegiatanSiswaGuru: "Guru membuka pelajaran dengan salam, berdoa bersama, memeriksa kehadiran, dan melakukan apersepsi terkait materi sebelumnya. Guru menyampaikan tujuan pembelajaran dan pertanyaan pemantik.",
              alokasiWaktu: "15 Menit",
            },
            {
              tahap: "Kegiatan Inti (50 Menit)",
              kegiatanSiswaGuru: `Guru menjelaskan materi ${materi} dengan alat peraga/media. Siswa dibagi menjadi beberapa kelompok heterogen untuk berdiskusi mengerjakan LKPD. Guru membimbing kelompok dan mengobservasi keaktifan siswa. Masing-masing kelompok mempresentasikan hasil diskusi di depan kelas.`,
              alokasiWaktu: "50 Menit",
            },
            {
              tahap: "Penutup (15 Menit)",
              kegiatanSiswaGuru: "Guru bersama siswa menyimpulkan poin-poin penting pembelajaran. Guru memberikan umpan balik, kuis singkat/asesmen formatif, serta refleksi perasaan belajar siswa sebelum ditutup dengan doa.",
              alokasiWaktu: "15 Menit",
            },
          ],
          assessment: {
            sikap: "Observasi Profil Pelajar Pancasila (Gotong royong, Bernalar kritis, Mandiri)",
            pengetahuan: "Tes Tertulis (Pilihan Ganda & Uraian) pada Kuis / Asesmen Sumatif",
            keterampilan: "Penilaian Kinerja / Unjuk Kerja Diskusi Kelompok dan Presentasi LKPD",
          },
          lkpdText: `LEMBAR KERJA PESERTA DIDIK (LKPD)\nMateri: ${materi}\n\nNama Kelompok: ........................\nAnggota: 1. ......... 2. ......... 3. ......... 4. .........\n\nPETUNJUK:\n1. Bacalah petunjuk soal dengan cermat.\n2. Diskusikan bersama teman sekelompokmu untuk menyelesaikan pertanyaan di bawah ini.\n3. Tuliskan jawaban pada tempat yang telah disediakan.\n\nSOAL DISKUSI:\n1. Jelaskan pemahaman kalian mengenai materi ${materi}!\n2. Berikan 3 contoh penerapan ${materi} dalam kehidupan sehari-hari!`,
          refleksiGuru: [
            { no: 1, pertanyaan: "Apakah seluruh peserta didik mencapai Tujuan Pembelajaran?", catatan: "Sesuai observasi & asesmen formatif" },
            { no: 2, pertanyaan: "Kendala apa yang dihadapi selama kegiatan pembelajaran?", catatan: "Manajemen waktu saat diskusi" },
          ],
          refleksiSiswa: [
            { no: 1, pertanyaan: "Bagian materi mana yang paling kamu sukai?", catatan: "Saat diskusi kelompok dan praktikum" },
            { no: 2, pertanyaan: "Apakah kamu memahami penjelasan materi hari ini?", catatan: "Sangat memahami" },
          ],
        };

        const newMod = ensureModuleStructure(fallbackRawMod);
        onSaveModules([newMod, ...teachingModules]);
        setSelectedModule(newMod);
        setIsAiModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteModule = (id: string) => {
    const updated = teachingModules.filter((m) => m.id !== id);
    onSaveModules(updated);
    if (selectedModule?.id === id) {
      setSelectedModule(updated[0] || null);
    }
  };

  const handleExportJSON = () => {
    if (activeModule) {
      exportDataToJSON(activeModule, `Modul_Ajar_${activeModule.title}`);
    }
  };

  const handleExportDoc = () => {
    if (!activeModule) return;
    onOpenPrint(
      `MODUL AJAR KURIKULUM MERDEKA (${(activeModule.moduleType || "INTRAKURIKULER").toUpperCase()})`,
      `${activeModule.subject} - ${activeModule.targetClass} | Model: ${activeModule.learningModel}`,
      renderDocumentContent(activeModule)
    );
  };

  // Render document component shared for Preview and Print
  const renderDocumentContent = (mod: TeachingModule, isForPrintModal = false) => {
    const studentGrades = getFullStudentGradeList(students);

    return (
      <div className="space-y-6 text-[12px] font-sans leading-normal text-slate-900 bg-white p-2">
        {/* Kop Surat Resmi - Only render in preview card if not inside PrintModal (PrintModal handles KopSurat) */}
        {!isForPrintModal && (
          <KopSurat
            schoolIdentity={schoolIdentity}
            title={`MODUL AJAR KURIKULUM MERDEKA (${mod.moduleType.toUpperCase()})`}
            subtitle={`${mod.subject} • ${mod.targetClass} | ALOKASI WAKTU: ${mod.allocationJP}`}
          />
        )}

        {/* I. INFORMASI UMUM */}
        <div className="border border-slate-300 rounded p-3 space-y-2 bg-slate-50/50">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-emerald-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-700" />
            I. INFORMASI UMUM
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            <p><b>Nama Penyusun:</b> {schoolIdentity?.teacherName || "-"}</p>
            <p><b>Satuan Pendidikan:</b> {schoolIdentity?.schoolName || "-"}</p>
            <p><b>Target Peserta Didik:</b> {mod.generalInfo?.targetPesertaDidik || "Reguler (26 Murid)"}</p>
            <p><b>Pendekatan Pembelajaran:</b> {mod.approach} (Mindful, Meaningful, Joyful)</p>
            <p><b>Model Pembelajaran:</b> {mod.learningModel}</p>
            <p><b>Sarana & Prasarana:</b> {mod.generalInfo?.saranaPrasarana || "-"}</p>
            <p className="col-span-full"><b>Kompetensi Awal:</b> {mod.generalInfo?.kompetensiAwal || "-"}</p>
            <p className="col-span-full"><b>Profil Pelajar Pancasila:</b> {Array.isArray(mod.generalInfo?.profilPelajarPancasila) ? mod.generalInfo.profilPelajarPancasila.join(", ") : mod.generalInfo?.profilPelajarPancasila || "-"}</p>
          </div>
        </div>

        {/* II. KOMPONEN INTI */}
        <div className="border border-slate-300 rounded p-3 space-y-2">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-indigo-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-700" />
            II. KOMPONEN INTI
          </h3>
          <div className="space-y-1.5 text-[12px]">
            <p><b>Tujuan Pembelajaran:</b> {mod.coreComponent?.tujuanPembelajaran || "-"}</p>
            <p><b>Pemahaman Bermakna (Meaningful):</b> {mod.coreComponent?.pemahamanBermakna || "-"}</p>
            <p><b>Pertanyaan Pemantik:</b> {mod.coreComponent?.pertanyaanPemantik || "-"}</p>
          </div>
        </div>

        {/* III. KEGIATAN PEMBELAJARAN (TABEL) */}
        <div className="border border-slate-300 rounded p-3 space-y-3">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-700" />
            III. KEGIATAN PEMBELAJARAN (TABEL TAHAP & ALOKASI WAKTU)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[12px]">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900 text-center">
                  <th className="border border-slate-400 p-2 w-12">No.</th>
                  <th className="border border-slate-400 p-2 w-48">Tahap Pembelajaran</th>
                  <th className="border border-slate-400 p-2">Uraian Kegiatan Pembelajaran (Mindful, Meaningful, Joyful)</th>
                  <th className="border border-slate-400 p-2 w-28">Alokasi Waktu</th>
                </tr>
              </thead>
              <tbody>
                {mod.activitiesTable && mod.activitiesTable.length > 0 ? (
                  mod.activitiesTable.map((row) => (
                    <tr key={row.no} className="border border-slate-300 align-top">
                      <td className="border border-slate-400 p-2 text-center font-bold">{row.no}</td>
                      <td className="border border-slate-400 p-2 font-semibold text-slate-900">{row.tahap}</td>
                      <td className="border border-slate-400 p-2 whitespace-pre-line text-slate-800">{row.kegiatan}</td>
                      <td className="border border-slate-400 p-2 text-center font-medium whitespace-nowrap">{row.alokasiWaktu}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-500">Data kegiatan pembelajaran tidak tersedia.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* IV. ASESMEN & RUBRIK PENILAIAN */}
        <div className="border border-slate-300 rounded p-3 space-y-4">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            IV. ASESMEN & RUBRIK PENILAIAN
          </h3>

          <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
            <p><b>Asesmen Diagnostik:</b> {mod.assessment?.diagnostik || "-"}</p>
            <p><b>Asesmen Formatif:</b> {mod.assessment?.formatif || "-"}</p>
            <p><b>Asesmen Sumatif:</b> {mod.assessment?.sumatif || "-"}</p>
          </div>

          {/* Rubrik Formatif */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900">A. Rubrik Penilaian Formatif (Observasi & Unjuk Kerja)</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[12px]">
                <thead>
                  <tr className="bg-emerald-100 text-emerald-950 font-bold text-center">
                    <th className="border border-slate-400 p-2 w-40">Kriteria Penilaian</th>
                    <th className="border border-slate-400 p-2">Sangat Baik (Skor 4)</th>
                    <th className="border border-slate-400 p-2">Baik (Skor 3)</th>
                    <th className="border border-slate-400 p-2">Cukup (Skor 2)</th>
                    <th className="border border-slate-400 p-2">Perlu Bimbingan (Skor 1)</th>
                  </tr>
                </thead>
                <tbody>
                  {mod.rubrikFormatif?.map((rf, idx) => (
                    <tr key={idx} className="align-top border border-slate-300">
                      <td className="border border-slate-400 p-2 font-bold text-slate-900 bg-slate-50">{rf.kriteria}</td>
                      <td className="border border-slate-400 p-2">{rf.sangatBaik}</td>
                      <td className="border border-slate-400 p-2">{rf.baik}</td>
                      <td className="border border-slate-400 p-2">{rf.cukup}</td>
                      <td className="border border-slate-400 p-2">{rf.perluBimbingan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rubrik Sumatif */}
          <div className="space-y-1.5 pt-2">
            <h4 className="font-bold text-slate-900">B. Rubrik Penilaian Sumatif (Kriteria & Pedoman Penskoran)</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[12px]">
                <thead>
                  <tr className="bg-indigo-100 text-indigo-950 font-bold text-center">
                    <th className="border border-slate-400 p-2 w-44">Kriteria Penilaian</th>
                    <th className="border border-slate-400 p-2">Indikator Ketercapaian (KKTP)</th>
                    <th className="border border-slate-400 p-2 w-24">Skor Maksimal</th>
                    <th className="border border-slate-400 p-2">Pedoman Penskoran</th>
                  </tr>
                </thead>
                <tbody>
                  {mod.rubrikSumatif?.map((rs, idx) => (
                    <tr key={idx} className="align-top border border-slate-300">
                      <td className="border border-slate-400 p-2 font-bold text-slate-900 bg-slate-50">{rs.kriteria}</td>
                      <td className="border border-slate-400 p-2">{rs.indikator}</td>
                      <td className="border border-slate-400 p-2 text-center font-bold">{rs.skorMaks}</td>
                      <td className="border border-slate-400 p-2">{rs.pedoman}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* V. ASESMEN SUMATIF: KISI-KISI & CETAK NASKAH SOAL */}
        <div className="border border-slate-300 rounded p-3 space-y-4 bg-slate-50/30">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-700" />
            V. ASESMEN SUMATIF: KISI-KISI & CETAK NASKAH SOAL
          </h3>

          {/* Kisi-Kisi Soal */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900">A. Tabel Kisi-Kisi Soal Tes Tertulis Sumatif (Bloom & Anderson)</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[12px]">
                <thead>
                  <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                    <th className="border border-slate-400 p-2 w-10">No.</th>
                    <th className="border border-slate-400 p-2">Indikator Capaian Soal</th>
                    <th className="border border-slate-400 p-2 w-36">Level Kognitif (Bloom)</th>
                    <th className="border border-slate-400 p-2 w-28">Bentuk Soal</th>
                    <th className="border border-slate-400 p-2 w-16">No. Soal</th>
                    <th className="border border-slate-400 p-2 w-32">Kunci Jawaban</th>
                    <th className="border border-slate-400 p-2 w-20">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {mod.kisiKisiSumatif?.map((kk) => (
                    <tr key={kk.no} className="border border-slate-300 align-top">
                      <td className="border border-slate-400 p-2 text-center font-bold">{kk.no}</td>
                      <td className="border border-slate-400 p-2">{kk.indikator}</td>
                      <td className="border border-slate-400 p-2 text-center font-medium bg-slate-50">{kk.levelKognitif || kk.tingkat || "C3 (L2)"}</td>
                      <td className="border border-slate-400 p-2 text-center font-medium">{kk.bentukSoal}</td>
                      <td className="border border-slate-400 p-2 text-center font-bold">{kk.nomorSoal}</td>
                      <td className="border border-slate-400 p-2 text-center font-medium font-mono text-[11px]">{kk.kunciJawaban || "-"}</td>
                      <td className="border border-slate-400 p-2 text-center font-bold text-emerald-800">{kk.skorPerSoal ?? (kk.no <= 5 ? 4 : (kk.no <= 8 ? 10 : 25))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pedoman Penskoran / Perhitungan Skor Akhir */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-300 rounded text-[11px] space-y-1.5 leading-relaxed text-slate-800">
              <p className="font-bold text-slate-900 uppercase">PEDOMAN PENSKORAN & RUMUS PERHITUNGAN SKOR AKHIR:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                <li><b>Pilihan Ganda (Soal 1–5):</b> 5 Soal x 4 Poin = Maksimal 20 Poin</li>
                <li><b>Isian Singkat (Soal 6–8):</b> 3 Soal x 10 Poin = Maksimal 30 Poin</li>
                <li><b>Uraian HOTS (Soal 9–10):</b> 2 Soal x 25 Poin = Maksimal 50 Poin</li>
                <li><b>Total Skor Maksimal:</b> 100 Poin</li>
              </ul>
              <div className="pt-1 text-emerald-900 font-bold border-t border-slate-200">
                RUMUS SKOR AKHIR = (Total Skor Perolehan Peserta Didik / Total Skor Maksimal 100) x 100
              </div>
            </div>
          </div>

          {/* Cetak Soal Sumatif */}
          <div className="space-y-3 pt-2 bg-white p-4 border border-slate-400 rounded">
            <div className="border-b-2 border-slate-900 pb-2 text-center">
              <h4 className="font-bold text-sm uppercase">NASKAH SOAL TES TERTULIS SUMATIF</h4>
              <p className="text-[12px]">{mod.subject} • {mod.targetClass} • T.A. 2025/2026</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] border-b border-slate-200 pb-2">
              <p><b>Nama Murid:</b> ...................................................</p>
              <p><b>Hari / Tanggal:</b> ...................................................</p>
              <p><b>Nomor Absen:</b> ...................................................</p>
              <p><b>Nilai & Paraf Guru:</b> [ _____ ]</p>
            </div>

            <div className="space-y-3 text-[12px] pt-1">
              <p className="font-semibold text-slate-800">Petunjuk: Jawablah pertanyaan-pertanyaan di bawah ini dengan tepat dan teliti!</p>

              {mod.soalSumatifList?.map((s) => (
                <div key={s.no} className="space-y-1 pl-1">
                  <p className="font-semibold text-slate-900">
                    {s.no}. {s.pertanyaan}
                  </p>
                  {s.pilihan && s.pilihan.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-4 text-slate-800">
                      {s.pilihan.map((pil, pIdx) => (
                        <div key={pIdx}>{pil}</div>
                      ))}
                    </div>
                  )}
                  {!s.pilihan && (
                    <div className="pl-4 pt-2">
                      <div className="border-b border-dashed border-slate-400 h-6 w-full mb-1"></div>
                      <div className="border-b border-dashed border-slate-400 h-6 w-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Kunci Jawaban & Pedoman */}
            <div className="mt-4 p-2.5 bg-slate-100 rounded border border-slate-300 text-[11px] space-y-1">
              <h5 className="font-bold text-slate-900 uppercase">Kunci Jawaban & Pedoman Penskoran:</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {mod.soalSumatifList?.map((s) => (
                  <div key={s.no}>
                    <b>Soal No. {s.no}:</b> {s.kunciJawaban}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LAMPIRAN 1: LKPD */}
        {mod.lkpdText && (
          <div className="border border-slate-300 rounded p-3 space-y-2 bg-slate-50">
            <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
              LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)
            </h3>
            <p className="whitespace-pre-line font-mono text-[11px] text-slate-800 bg-white p-3 rounded border border-slate-300">
              {mod.lkpdText}
            </p>
          </div>
        )}

        {/* LAMPIRAN 2: LEMBAR REFLEKSI */}
        <div className="border border-slate-300 rounded p-3 space-y-4">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
            LAMPIRAN 2: LEMBAR REFLEKSI (GURU & PESERTA DIDIK)
          </h3>

          {/* Refleksi Guru */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900">A. Lembar Refleksi Guru</h4>
            <table className="w-full border-collapse border border-slate-400 text-[12px]">
              <thead>
                <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                  <th className="border border-slate-400 p-2 w-12">No.</th>
                  <th className="border border-slate-400 p-2">Pertanyaan Refleksi Evaluasi Guru</th>
                  <th className="border border-slate-400 p-2">Hasil Catatan & Evaluasi Pembelajaran</th>
                </tr>
              </thead>
              <tbody>
                {mod.refleksiGuru?.map((rg) => (
                  <tr key={rg.no} className="border border-slate-300 align-top">
                    <td className="border border-slate-400 p-2 text-center font-bold">{rg.no}</td>
                    <td className="border border-slate-400 p-2 font-medium">{rg.pertanyaan}</td>
                    <td className="border border-slate-400 p-2">{rg.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Refleksi Peserta Didik */}
          <div className="space-y-1.5 pt-2">
            <h4 className="font-bold text-slate-900">B. Lembar Refleksi Peserta Didik</h4>
            <table className="w-full border-collapse border border-slate-400 text-[12px]">
              <thead>
                <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                  <th className="border border-slate-400 p-2 w-12">No.</th>
                  <th className="border border-slate-400 p-2">Pertanyaan Refleksi Peserta Didik</th>
                  <th className="border border-slate-400 p-2">Respon / Tanggapan Perasaan Murid</th>
                </tr>
              </thead>
              <tbody>
                {mod.refleksiSiswa?.map((rs) => (
                  <tr key={rs.no} className="border border-slate-300 align-top">
                    <td className="border border-slate-400 p-2 text-center font-bold">{rs.no}</td>
                    <td className="border border-slate-400 p-2 font-medium">{rs.pertanyaan}</td>
                    <td className="border border-slate-400 p-2">{rs.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LAMPIRAN 3: DAFTAR NILAI FORMATIF & SUMATIF (25+ MURID) */}
        <div className="border border-slate-300 rounded p-3 space-y-3">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
            LAMPIRAN 3: REKAPITULASI DAFTAR NILAI FORMATIF & SUMATIF ({studentGrades.length} PESERTA DIDIK)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[12px]">
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-bold text-center">
                  <th className="border border-slate-400 p-1.5 w-10">No.</th>
                  <th className="border border-slate-400 p-1.5 w-24">NISN</th>
                  <th className="border border-slate-400 p-1.5">Nama Peserta Didik</th>
                  <th className="border border-slate-400 p-1.5 w-14">F1</th>
                  <th className="border border-slate-400 p-1.5 w-14">F2</th>
                  <th className="border border-slate-400 p-1.5 w-14">F3</th>
                  <th className="border border-slate-400 p-1.5 w-16 bg-slate-300">Rata F</th>
                  <th className="border border-slate-400 p-1.5 w-16">Sumatif</th>
                  <th className="border border-slate-400 p-1.5 w-16 bg-emerald-200 text-emerald-950">N. Akhir</th>
                  <th className="border border-slate-400 p-1.5 w-28">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((sg) => (
                  <tr key={sg.no} className="border border-slate-300 hover:bg-slate-50">
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{sg.no}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono text-[11px]">{sg.nisn}</td>
                    <td className="border border-slate-400 p-1.5 font-semibold text-slate-900">{sg.nama}</td>
                    <td className="border border-slate-400 p-1.5 text-center">{sg.f1}</td>
                    <td className="border border-slate-400 p-1.5 text-center">{sg.f2}</td>
                    <td className="border border-slate-400 p-1.5 text-center">{sg.f3}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold bg-slate-100">{sg.rataF}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{sg.s1}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold bg-emerald-50 text-emerald-900">{sg.na}</td>
                    <td className="border border-slate-400 p-1.5 text-center text-[11px] font-semibold">
                      <span className={sg.na >= 75 ? "text-emerald-700" : "text-amber-700"}>
                        {sg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIGNATURE BLOCK - Only render in preview card if not inside PrintModal (PrintModal handles signature block) */}
        {!isForPrintModal && (
          <div className="pt-8 grid grid-cols-2 text-[12px] text-slate-900 leading-normal font-sans">
            <div className="text-center space-y-12">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala {schoolIdentity?.schoolName || "Sekolah SD"}</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{schoolIdentity?.headmasterName || "..................................."}</p>
                <p>NIP. {schoolIdentity?.headmasterNip || "..................................."}</p>
              </div>
            </div>

            <div className="text-center space-y-12">
              <div>
                <p>{(schoolIdentity as any)?.city || schoolIdentity?.regency || "Kota"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="font-bold">Guru Pengampu Kelas / Mapel</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{schoolIdentity?.teacherName || "..................................."}</p>
                <p>NIP. {schoolIdentity?.teacherNip || schoolIdentity?.nip || "..................................."}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handlePrint = () => {
    if (!activeModule) return;
    onOpenPrint(
      `MODUL AJAR KURIKULUM MERDEKA (${(activeModule.moduleType || "INTRAKURIKULER").toUpperCase()})`,
      `${activeModule.subject} - ${activeModule.targetClass} | Model: ${activeModule.learningModel}`,
      renderDocumentContent(activeModule, true)
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Generator Modul Ajar Lengkap (Tabel Kegiatan, Asesmen & Rubrik)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penyusunan Modul Ajar Intrakurikuler & Kokurikuler berbasis Tabel Kegiatan, Rubrik Formatif/Sumatif, Kisi-Kisi, Naskah Soal, Refleksi, Daftar Nilai & Tanda Tangan
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Buat Modul Baru dengan AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: List of Saved Modules */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>Daftar Modul ({teachingModules.length})</span>
          </h3>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {teachingModules.map((m) => {
              const normalizedItem = ensureModuleStructure(m);
              const isSelected = activeModule?.id === normalizedItem.id;
              return (
                <div
                  key={normalizedItem.id}
                  onClick={() => setSelectedModule(normalizedItem)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? "bg-emerald-50/80 border-emerald-500 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                      {normalizedItem.moduleType}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModule(normalizedItem.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Hapus Modul"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 leading-tight">{normalizedItem.title}</h4>

                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <p><b>{normalizedItem.subject}</b> • {normalizedItem.targetClass}</p>
                    <p className="text-emerald-800 font-semibold">{normalizedItem.learningModel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Full Document Preview */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {activeModule ? (
            <>
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 inline-block mb-1">
                    {activeModule.moduleType}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{activeModule.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Ekspor JSON
                  </button>
                  <button
                    onClick={() => {
                      if (activeModule) {
                        const q = encodeURIComponent(`LKPD Presentasi ${activeModule.subject} ${activeModule.title}`);
                        window.open(`https://www.canva.com/search?q=${q}`, "_blank");
                      }
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                    title="Buat Presentasi Media & LKPD di Canva AI"
                  >
                    <Palette className="w-4 h-4 text-teal-200" />
                    <span>Buat LKPD / Media di Canva</span>
                  </button>
                  <button
                    onClick={() => {
                      if (activeModule) {
                        exportTeachingModuleToDocx(activeModule, schoolIdentity);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    title="Ekspor Modul Ajar ke Format Native Word (.docx)"
                  >
                    <FileText className="w-4 h-4 text-blue-100" />
                    Ekspor Word (.docx)
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak / PDF
                  </button>
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-inner max-h-[800px] overflow-y-auto">
                {renderDocumentContent(activeModule)}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Pilih modul dari daftar di sebelah kiri atau klik <b>Buat Modul Baru dengan AI</b>.
            </div>
          )}
        </div>
      </div>

      {/* AI Modul Ajar Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-indigo-700 font-bold text-base">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3>AI Generator Modul Ajar Kurikulum Merdeka</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Jenis Modul Ajar</label>
                <select
                  value={moduleType}
                  onChange={(e) => setModuleType(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white font-bold text-emerald-900"
                >
                  <option value="Intrakurikuler">Modul Ajar Intrakurikuler (Mata Pelajaran Regular)</option>
                  <option value="Kokurikuler">Modul Ajar Kokurikuler (P5 / Proyek STEM)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Mata Pelajaran / Tema</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kelas & Fase</label>
                  <input
                    type="text"
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Topik / Materi Pokok</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teks Cerita Rakyat & Amanat Moral"
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Pendekatan Pembelajaran</label>
                <select
                  value={approach}
                  onChange={(e) => setApproach(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white font-semibold text-indigo-900"
                >
                  <option value="Deep Learning">Deep Learning (Mindful, Meaningful, Joyful)</option>
                  <option value="STEM">STEM (Science, Tech, Engineering, Math)</option>
                  <option value="Kombinasi Deep Learning & STEM">Kombinasi Deep Learning & STEM</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Pilih Model Pembelajaran</label>
                <select
                  value={learningModel}
                  onChange={(e) => setLearningModel(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white font-semibold text-slate-800"
                >
                  <option value="PjBL (Project Based Learning)">PjBL (Project Based Learning)</option>
                  <option value="PBL (Problem Based Learning)">PBL (Problem Based Learning)</option>
                  <option value="Discovery Learning">Discovery Learning</option>
                  <option value="Inquiry Learning">Inquiry Learning</option>
                  <option value="Cooperative Learning">Cooperative Learning</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Alokasi Waktu</label>
                <input
                  type="text"
                  value={allocationJP}
                  onChange={(e) => setAllocationJP(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleGenerateModuleAI}
                  disabled={isGenerating}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md"
                >
                  {isGenerating ? "Menganalisis & Menyusun Modul..." : "Proses Generate AI Modul"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
