import React, { useRef, useState } from 'react';
import { FileText, ImagePlus, Send, Sparkles } from 'lucide-react';

interface ReceiptScannerPanelProps {
  onSendReceiptToEmily: (
    promptText: string,
    image?: { base64: string; mimeType: string; preview: string }
  ) => void;
}

const SAMPLE_RECEIPT_PRESETS = [
  {
    label: 'Nota Ganti LCD & Cek Mesin',
    customer: 'Kak Raka Pratama',
    device: 'iPhone 13 Pro Graphite',
    issue: 'Layar green screen + soket LCD berkarat ringan',
    cost: 'Rp 1.850.000 (DP Rp 500.000)',
    warranty: '30 Hari',
    status: 'Sudah selesai & lulus QC',
  },
  {
    label: 'Nota Konfirmasi IC Charging',
    customer: 'Ibu Santi Wijaya',
    device: 'Samsung Galaxy A54',
    issue: 'Mati total saat dicas, OVP & IC Charging short',
    cost: 'Rp 450.000',
    warranty: '14 Hari',
    status: 'Menunggu persetujuan biaya dari pelanggan',
  },
];

const QUICK_COPY_SCENARIOS = [
  {
    title: 'Konfirmasi Unit Masuk Servis',
    prompt:
      'Buatkan template chat salinan WhatsApp konfirmasi unit HP baru masuk servis agar pelanggan tenang dan jelas syarat garansinya.',
  },
  {
    title: 'Info Estimasi & Persetujuan Biaya',
    prompt:
      'Buatkan chat salinan WhatsApp untuk mengabari pelanggan bahwa teknisi sudah menemukan kerusakannya dan meminta persetujuan biaya sebelum dikerjakan.',
  },
  {
    title: 'HP Selesai & Siap Diambil',
    prompt:
      'Buatkan chat salinan WhatsApp yang ceria & ramah untuk memberitahu pelanggan bahwa HP sudah selesai diservis, sudah lulus tes QC, dan siap diambil.',
  },
  {
    title: 'Follow-Up Garansi 7 Hari',
    prompt:
      'Buatkan chat salinan follow-up setelah 7 hari pengambilan untuk menanyakan kondisi HP sekaligus meminta ulasan bintang 5 dengan sopan.',
  },
];

export function ReceiptScannerPanel({ onSendReceiptToEmily }: ReceiptScannerPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customer, setCustomer] = useState('');
  const [device, setDevice] = useState('');
  const [issue, setIssue] = useState('');
  const [cost, setCost] = useState('');
  const [warranty, setWarranty] = useState('14 Hari');
  const [status, setStatus] = useState('Sudah selesai & siap diambil');

  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      onSendReceiptToEmily(
        'Emily, tolong baca foto nota servis ini dengan teliti, rangkum datanya, lalu buatkan chat salinan WhatsApp yang ramah dan siap kirim ke pelanggan!',
        {
          base64,
          mimeType: file.type || 'image/jpeg',
          preview: dataUrl,
        }
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyPreset = (preset: (typeof SAMPLE_RECEIPT_PRESETS)[number]) => {
    setCustomer(preset.customer);
    setDevice(preset.device);
    setIssue(preset.issue);
    setCost(preset.cost);
    setWarranty(preset.warranty);
    setStatus(preset.status);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const summaryPrompt = [
      'Emily, tolong buatkan rangkuman nota dan 2 opsi chat salinan WhatsApp siap kirim berdasarkan data nota berikut:',
      `- Nama Pelanggan: ${customer || '[Nama Pelanggan]'}`,
      `- Tipe HP: ${device || '[Tipe HP]'}`,
      `- Keluhan / Tindakan: ${issue || '[Detail Kerusakan]'}`,
      `- Biaya Servis: ${cost || '[Nominal Biaya]'}`,
      `- Garansi: ${warranty}`,
      `- Status Pengerjaan: ${status}`,
    ].join('\n');
    onSendReceiptToEmily(summaryPrompt);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-display text-base font-bold text-slate-900">
          Pembaca Nota &amp; Studio Salinan Admin
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Unggah foto nota toko atau isi rincian cepat, Emily langsung siapkan chat WhatsApp.
        </p>
      </div>

      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
        {/* Upload Nota Photo Box */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReceiptImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/50 px-4 py-5 text-center transition-colors hover:border-orange-400 hover:bg-orange-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Unggah Foto Nota Servis (Struk / Tulisan Tangan)
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Otomatis dibaca Emily &amp; diubah jadi pesan salinan pelanggan
              </div>
            </div>
          </button>
        </div>

        {/* Sample Presets */}
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-700">
            Isi Contoh Nota Cepat
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_RECEIPT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 whitespace-nowrap shrink-0"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Receipt Builder Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <FileText className="h-3.5 w-3.5 text-orange-600" />
            <span>Input Rincian Nota Manual</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Nama Pelanggan
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Misal: Kak Budi"
                className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Tipe HP
              </label>
              <input
                type="text"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                placeholder="Misal: Redmi Note 12"
                className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Kerusakan &amp; Tindakan Servis
            </label>
            <input
              type="text"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Misal: Ganti baterai original + bersihkan konektor cas"
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Biaya / DP
              </label>
              <input
                type="text"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Misal: Rp 285.000"
                className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Garansi
              </label>
              <select
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
              >
                <option value="Tanpa Garansi (Cek / Bersih Air)">Tanpa Garansi</option>
                <option value="7 Hari">7 Hari</option>
                <option value="14 Hari">14 Hari</option>
                <option value="30 Hari">30 Hari</option>
                <option value="90 Hari">90 Hari</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Status Servis
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            >
              <option value="Unit baru masuk antrian pengecekan">Unit baru masuk antrian</option>
              <option value="Menunggu persetujuan biaya dari pelanggan">Menunggu persetujuan biaya</option>
              <option value="Sedang proses pengerjaan hardware">Sedang pengerjaan hardware</option>
              <option value="Sudah selesai & siap diambil">Sudah selesai &amp; siap diambil</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700 whitespace-nowrap"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Buat Chat Salinan via Emily</span>
          </button>
        </form>

        {/* Quick Scenarios */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span>Template Situasi Admin Toko</span>
          </div>
          <div className="space-y-2">
            {QUICK_COPY_SCENARIOS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onSendReceiptToEmily(item.prompt)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-900"
              >
                <span>{item.title}</span>
                <span className="text-orange-600">Buat &rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
