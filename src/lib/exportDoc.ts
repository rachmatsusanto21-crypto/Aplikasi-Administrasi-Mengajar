import { SchoolIdentity } from "../types";

export function exportHtmlToDoc({
  htmlContent,
  filename,
  title,
  schoolIdentity,
}: {
  htmlContent: string;
  filename: string;
  title?: string;
  schoolIdentity?: Partial<SchoolIdentity>;
}): void {
  const logoLeft = schoolIdentity?.logoLeftUrl || schoolIdentity?.logoUrl || "https://lh3.googleusercontent.com/d/1dMJ8rTQxZkcpPe_xtvmMt7aITLYvf_aT";
  const logoRight = schoolIdentity?.logoRightUrl || "https://lh3.googleusercontent.com/d/1y5lRPtb_K0Z9U8xe-OS4hkRx2zRHq1cU";

  const schoolName = schoolIdentity?.schoolName || "SDN PISANGCANDI 1";
  const npsn = schoolIdentity?.npsn || "20533686";
  const address = schoolIdentity?.address || "Jl. Simpang Raya Langsep 14, Kota Malang Kode Pos 65149";
  const phone = schoolIdentity?.phone || "0341-574056";
  const email = schoolIdentity?.email || "sdnpisangcandi1.mlg@google.com";
  const headmasterName = schoolIdentity?.headmasterName || "Kepala Sekolah";
  const headmasterNip = schoolIdentity?.headmasterNip || "-";
  const teacherName = schoolIdentity?.teacherName || "Guru Kelas";
  const teacherNip = schoolIdentity?.teacherNip || "-";
  const academicYear = schoolIdentity?.academicYear || "2025/2026";
  const semester = schoolIdentity?.semester || "Ganjil";
  const gradeClass = schoolIdentity?.gradeClass || "Kelas IV";

  const fullWordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title || filename}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #111;
    }
    table.kop-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin-bottom: 12pt;
    }
    table.kop-table td {
      border: none;
      padding: 2pt;
      vertical-align: middle;
    }
    .kop-text {
      text-align: center;
    }
    .kop-line {
      border-bottom: 3px double #000;
      margin-bottom: 15pt;
    }
    .doc-title {
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      text-transform: uppercase;
      text-decoration: underline;
      margin-top: 10pt;
      margin-bottom: 5pt;
    }
    .doc-meta {
      text-align: center;
      font-size: 10pt;
      color: #333;
      margin-bottom: 15pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10pt 0;
    }
    th, td {
      border: 1px solid #333;
      padding: 5pt 7pt;
      text-align: left;
      font-size: 10pt;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .signature-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin-top: 30pt;
    }
    .signature-table td {
      border: none;
      text-align: center;
      vertical-align: top;
      width: 50%;
    }
  </style>
</head>
<body>
  <!-- Kop Surat Resmi -->
  <table class="kop-table">
    <tr>
      <td style="width: 15%; text-align: left;">
        <img src="${logoLeft}" width="75" height="75" alt="Logo Kiri" />
      </td>
      <td style="width: 70%;" class="kop-text">
        <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">PEMERINTAH KOTA MALANG</div>
        <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
        <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 2pt 0;">${schoolName}</div>
        <div style="font-size: 9pt; font-weight: bold;">NPSN: ${npsn}</div>
        <div style="font-size: 9pt;">${address}</div>
        <div style="font-size: 9pt;">Telp. ${phone} &nbsp; email: ${email}</div>
      </td>
      <td style="width: 15%; text-align: right;">
        <img src="${logoRight}" width="75" height="75" alt="Logo Kanan" />
      </td>
    </tr>
  </table>
  <div class="kop-line"></div>

  ${title ? `<div class="doc-title">${title}</div>` : ""}
  <div class="doc-meta">
    Tahun Pelajaran: ${academicYear} | Semester: ${semester} | Kelas: ${gradeClass}
  </div>

  <!-- Content -->
  <div>
    ${htmlContent}
  </div>

  <!-- Tanda Tangan -->
  <table class="signature-table">
    <tr>
      <td>
        <div>Mengetahui,</div>
        <div style="font-weight: bold; margin-bottom: 50pt;">Kepala Sekolah ${schoolName}</div>
        <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${headmasterName}</div>
        <div>NIP. ${headmasterNip}</div>
      </td>
      <td>
        <div>Malang, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
        <div style="font-weight: bold; margin-bottom: 50pt;">Guru Kelas / Mata Pelajaran</div>
        <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${teacherName}</div>
        <div>NIP. ${teacherNip}</div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const blob = new Blob(["\ufeff" + fullWordHtml], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanFilename = filename.endsWith(".doc") || filename.endsWith(".docx") ? filename : `${filename}.doc`;
  a.download = cleanFilename;
  a.click();
  URL.revokeObjectURL(url);
}
