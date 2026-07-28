import React, { useState } from "react";
import { SchoolIdentity } from "../../types";
import { Building2, Save, Printer, Image, UserCheck, ShieldCheck, Check } from "lucide-react";
import { ExportActionBar } from "../ExportActionBar";

interface SchoolIdentityViewProps {
  identity: SchoolIdentity;
  onSave: (updated: SchoolIdentity) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const SchoolIdentityView: React.FC<SchoolIdentityViewProps> = ({
  identity,
  onSave,
  onOpenPrint,
}) => {
  const [formData, setFormData] = useState<SchoolIdentity>(identity);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePrint = () => {
    onOpenPrint(
      "LEMBAR IDENTITAS SATUAN PENDIDIKAN & GURU",
      `Tahun Pelajaran ${formData.academicYear} - Semester ${formData.semester}`,
      (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Nama Sekolah</p>
              <p className="font-bold text-sm text-slate-900">{formData.schoolName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">NPSN</p>
              <p className="font-bold text-sm text-slate-900">{formData.npsn}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Alamat Lengkap</p>
              <p className="text-xs text-slate-900">{formData.address}, Desa {formData.village}, Kec. {formData.district}, {formData.regency}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Kontak & Email</p>
              <p className="text-xs text-slate-900">{formData.phone} / {formData.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg">
            <div>
              <h4 className="font-bold text-xs uppercase mb-2 text-emerald-800">Identitas Kepala Sekolah</h4>
              <p className="text-xs"><b>Nama:</b> {formData.headmasterName}</p>
              <p className="text-xs"><b>NIP:</b> {formData.headmasterNip}</p>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase mb-2 text-emerald-800">Identitas Guru Kelas / Mapel</h4>
              <p className="text-xs"><b>Nama:</b> {formData.teacherName}</p>
              <p className="text-xs"><b>NIP:</b> {formData.teacherNip}</p>
              <p className="text-xs"><b>Kelas / Fase:</b> {formData.gradeClass} ({formData.phase})</p>
            </div>
          </div>
        </div>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Identitas Sekolah & Pengaturan Akademik
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur data sekolah, logo, tahun pelajaran, semester, fase, serta data Kepala Sekolah & Guru
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <Printer className="w-4 h-4" />
            Cetak Identitas
          </button>
        </div>
      </div>

      <ExportActionBar
        title="IDENTITAS SATUAN PENDIDIKAN & GURU"
        filename="Identitas_Sekolah_Dan_Guru"
        schoolIdentity={identity}
        headers={["Field", "Nilai / Keterangan"]}
        rows={[
          ["Nama Sekolah", formData.schoolName || "-"],
          ["NPSN", formData.npsn || "-"],
          ["NSS", formData.nss || "-"],
          ["Alamat", `${formData.address}, Desa ${formData.village}, Kec. ${formData.district}, ${formData.regency}`],
          ["Tahun Pelajaran", formData.academicYear || "-"],
          ["Semester", formData.semester || "-"],
          ["Fase & Kelas", `Fase ${formData.phase} - Kelas ${formData.gradeClass}`],
          ["Kepala Sekolah", `${formData.headmasterName} (NIP: ${formData.headmasterNip})`],
          ["Guru Kelas", `${formData.teacherName} (NIP: ${formData.teacherNip})`],
        ]}
        onOpenPrintModal={handlePrint}
      />

      {savedSuccess && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-700" />
          Identitas sekolah dan guru berhasil diperbarui!
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Profil Sekolah & Logo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Image className="w-4 h-4 text-emerald-600" />
            Data Satuan Pendidikan & Logo Sekolah
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah</label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN</label>
                  <input
                    type="text"
                    name="npsn"
                    value={formData.npsn}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Jalan</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Desa/Kelurahan</label>
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kabupaten/Kota</label>
                  <input
                    type="text"
                    name="regency"
                    value={formData.regency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Sekolah</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Logo Preview & URL */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-xs font-semibold text-slate-700">Logo Sekolah</span>
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo Preview"
                  className="w-24 h-24 object-contain rounded-lg border bg-white p-1 shadow-xs"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs">
                  Tidak Ada Logo
                </div>
              )}
              <div className="w-full">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 text-left">URL Logo / Image Link</label>
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Tahun Pelajaran & Kelas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Tahun Pelajaran, Semester, Kelas & Fase
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
              <input
                type="text"
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                placeholder="2025/2026"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fase Kurikulum</label>
              <select
                name="phase"
                value={formData.phase}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Fase A">Fase A (Kelas 1-2)</option>
                <option value="Fase B">Fase B (Kelas 3-4)</option>
                <option value="Fase C">Fase C (Kelas 5-6)</option>
                <option value="Fase D">Fase D (Kelas 7-9)</option>
                <option value="Fase E">Fase E (Kelas 10)</option>
                <option value="Fase F">Fase F (Kelas 11-12)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas</label>
              <input
                type="text"
                name="gradeClass"
                value={formData.gradeClass}
                onChange={handleChange}
                placeholder="Kelas IV-A"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Kepala Sekolah & Guru */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Identitas Kepala Sekolah & Guru Kelas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Headmaster */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Kepala Sekolah</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  name="headmasterName"
                  value={formData.headmasterName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  name="headmasterNip"
                  value={formData.headmasterNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Teacher */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">Guru Kelas / Wali Kelas</h4>
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  name="teacherName"
                  value={formData.teacherName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">NIP Guru</label>
                <input
                  type="text"
                  name="teacherNip"
                  value={formData.teacherNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Identitas
          </button>
        </div>
      </form>
    </div>
  );
};
