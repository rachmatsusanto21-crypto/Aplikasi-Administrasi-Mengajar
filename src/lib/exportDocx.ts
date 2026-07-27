import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import { TeachingModule, SchoolIdentity } from "../types";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface GuestEntryDocx {
  id: string;
  date: string;
  guestName: string;
  institution: string;
  position?: string;
  purpose: string;
  notes?: string;
}

export interface IncidentalJournalDocx {
  id: string;
  date: string;
  incident: string;
  involvedParties: string;
  actionTaken: string;
  followUp: string;
}

// Utility to create Kop Surat header in Docx
function createKopHeader(school?: Partial<SchoolIdentity>): Paragraph[] {
  const schoolName = school?.schoolName || "SD NEGERI DEMO";
  const address = school?.address || "Jl. Pendidikan No. 1, Desa/Kel. Edukasi";
  const region = `${school?.district ? `Kec. ${school.district}, ` : ""}${school?.regency ? `Kab./Kota ${school.regency}` : ""}`;

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "PEMERINTAH KABUPATEN / KOTA DINES PENDIDIKAN",
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: schoolName.toUpperCase(),
          bold: true,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${address} ${region}`,
          size: 18,
        }),
      ],
      spacing: { after: 200 },
    }),
  ];
}

// Utility for Signatures block
function createSignatures(school?: Partial<SchoolIdentity>): Table {
  const headmasterName = school?.headmasterName || "Kepala Sekolah, S.Pd.";
  const headmasterNip = school?.headmasterNip || "19800101 200501 1 001";
  const teacherName = school?.teacherName || "Guru Kelas, S.Pd.";
  const teacherNip = school?.teacherNip || "19850202 201001 2 002";

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: "Mengetahui,", size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: "Kepala Sekolah", bold: true, size: 18 })] }),
              new Paragraph({ text: "", spacing: { after: 800 } }),
              new Paragraph({ children: [new TextRun({ text: headmasterName, bold: true, underline: {}, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: `NIP. ${headmasterNip}`, size: 16 })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Guru Kelas / Pengampu,", size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Guru Wali Kelas", bold: true, size: 18 })],
              }),
              new Paragraph({ text: "", spacing: { after: 800 } }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: teacherName, bold: true, underline: {}, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `NIP. ${teacherNip}`, size: 16 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// 1. Export Modul Ajar ke Format .docx
export async function exportTeachingModuleToDocx(mod: TeachingModule, school?: Partial<SchoolIdentity>) {
  const docChildren: any[] = [];

  // Kop Surat
  docChildren.push(...createKopHeader(school));

  // Judul Modul
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `MODUL AJAR KURIKULUM MERDEKA (${(mod.moduleType || "INTRAKURIKULER").toUpperCase()})`,
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${mod.subject.toUpperCase()} | KELAS: ${mod.targetClass}`,
          bold: true,
          size: 20,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Table Information Umum
  const infoTableRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "Penyusun / Guru", bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: school?.teacherName || "Guru Kelas", size: 18 })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Kelas / Alokasi Waktu", bold: true, size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `${mod.targetClass} / ${mod.allocationJP || "2 JP"}`, size: 18 })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Model / Pendekatan", bold: true, size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `${mod.learningModel} (${mod.approach})`, size: 18 })] })],
        }),
      ],
    }),
  ];

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "I. INFORMASI UMUM", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoTableRows,
    })
  );

  // II. KOMPONENT INTI
  const tpText = mod.coreComponent?.tujuanPembelajaran || "-";
  const pemahamanText = mod.coreComponent?.pemahamanBermakna || "-";
  const pemantikText = mod.coreComponent?.pertanyaanPemantik || "-";
  const profilText = Array.isArray(mod.generalInfo?.profilPelajarPancasila)
    ? mod.generalInfo.profilPelajarPancasila.join(", ")
    : mod.generalInfo?.profilPelajarPancasila || "-";

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "II. KOMPONEN INTI", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "A. Tujuan Pembelajaran:", bold: true, size: 18 })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: tpText, size: 18 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "B. Pemahaman Bermakna:", bold: true, size: 18 })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: pemahamanText, size: 18 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "C. Pertanyaan Pemantik:", bold: true, size: 18 })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: pemantikText, size: 18 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "D. Profil Pelajar Pancasila:", bold: true, size: 18 })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: profilText, size: 18 })],
      spacing: { after: 150 },
    })
  );

  // III. KEGIATAN PEMBELAJARAN
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "III. KEGIATAN PEMBELAJARAN", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    })
  );

  if (mod.activitiesTable && mod.activitiesTable.length > 0) {
    const actRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Tahap Kegiatan", bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Rincian Kegiatan Guru & Siswa", bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Waktu", bold: true, size: 18 })] })],
          }),
        ],
      }),
      ...mod.activitiesTable.map(
        (act) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.tahap, bold: true, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.kegiatan, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.alokasiWaktu, size: 18 })] })] }),
            ],
          })
      ),
    ];
    docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: actRows }));
  } else {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Pendahuluan: ", bold: true, size: 18 }),
          new TextRun({ text: mod.activities?.pendahuluan || "-", size: 18 }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Kegiatan Inti: ", bold: true, size: 18 }),
          new TextRun({ text: mod.activities?.inti || "-", size: 18 }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Penutup: ", bold: true, size: 18 }),
          new TextRun({ text: mod.activities?.penutup || "-", size: 18 }),
        ],
        spacing: { after: 150 },
      })
    );
  }

  // IV. ASESMEN & REFLEKSI
  const assessText = typeof mod.assessment === "string" 
    ? mod.assessment 
    : `Formatif: ${mod.assessment?.formatif || "-"} | Sumatif: ${mod.assessment?.sumatif || "-"}`;

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "IV. ASESMEN & PENILAIAN", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: assessText, size: 18 })],
      spacing: { after: 200 },
    }),
    createSignatures(school)
  );

  const doc = new Document({
    sections: [{ children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (mod.title || "Modul_Ajar").replace(/[^a-zA-Z0-9_]/g, "_");
  saveBlob(blob, `Modul_Ajar_${cleanTitle}.docx`);
}

// 2. Export Buku Tamu & Jurnal Insidental ke Format .docx
export async function exportGuestBookToDocx(
  guests: GuestEntryDocx[],
  incidental: IncidentalJournalDocx[],
  school?: Partial<SchoolIdentity>
) {
  const docChildren: any[] = [];

  // Kop Surat
  docChildren.push(...createKopHeader(school));

  // Judul Dokumen
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "LAPORAN BUKU TAMU & JURNAL INSIDENTAL SEKOLAH",
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Tabel 1: Buku Tamu
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "I. REKAPITULASI BUKU TAMU DINAS / KUNJUNGAN", bold: true, size: 20 })],
      spacing: { after: 100, before: 100 },
    })
  );

  const guestTableRows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama Tamu", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Instansi / Jabatan", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Maksud / Keperluan", bold: true, size: 16 })] })] }),
      ],
    }),
    ...guests.map(
      (g, idx) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: g.date, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: g.guestName, bold: true, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${g.institution}${g.position ? ` (${g.position})` : ""}`, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: g.purpose, size: 16 })] })] }),
          ],
        })
    ),
  ];

  docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: guestTableRows }));

  // Tabel 2: Jurnal Insidental
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "II. JURNAL KEGIATAN INSIDENTAL & KHUSUS", bold: true, size: 20 })],
      spacing: { after: 100, before: 300 },
    })
  );

  const incidentalRows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama Kegiatan / Peristiwa", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pihak Terlibat / Penyelenggara", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tindakan / Hasil", bold: true, size: 16 })] })] }),
      ],
    }),
    ...incidental.map(
      (inc, idx) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.date, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.incident, bold: true, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.involvedParties, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.actionTaken, size: 16 })] })] }),
          ],
        })
    ),
  ];

  docChildren.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: incidentalRows }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    createSignatures(school)
  );

  const doc = new Document({
    sections: [{ children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  saveBlob(blob, "Laporan_Buku_Tamu_dan_Jurnal_Insidental.docx");
}
