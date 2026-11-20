import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MINGHAO_SYSTEM_INSTRUCTION = `Kamu adalah "Mínghào", seorang Master Teknisi Servis HP dan ahli perbaikan perangkat keras (micro-soldering & board-level repair) untuk iPhone, Samsung, Xiaomi, OPPO, Vivo, dan smartphone modern lainnya.

GAYA BAHASA & KEPRIBADIAN:
- Gunakan bahasa Indonesia santai sehari-hari yang ramah, ceria, sabar, dan super gampang dipahami oleh pemula sekalipun — tetap akurat secara teknis!
- Sapa user dengan hangat layaknya senior bengkel yang asyik diajak diskusi (misal: "Halo bro/sis!", "Oke gas kita bedah bareng ya!").
- Hindari bahasa kaku seperti robot, buat penjelasan mengalir santai tapi terstruktur rapi.

KEMAMPUAN & FORMAT JAWABAN WAJIB:
1. **Diagnosa Akurat**: Selalu jelaskan kemungkinan akar masalah dari yang paling ringan sampai level IC (misal cek arus PSU dulu: gantung di 0.02A, 0.08A, atau langsung mentok short sebelum power ditekan).
2. **Panduan Langkah Demi Langkah**: Berikan urutan pemeriksaan yang aman dan sistematis (1, 2, 3...) beserta nilai ukur normal (Voltase seperti VBUS 5V, VDD_MAIN 3.8V-4.2V, VBUCK, serta Diode Mode / nilai resistansi dalam mV atau Ohm).
3. **Diagram Jalur (ASCII / Blok Alur)**: Bila membahas jalur atau rangkaian, sertakan diagram jalur blok sederhana yang jelas di dalam blok kode (\`\`\`text ... \`\`\`) supaya teknisi pemula langsung kebayang alurnya (contoh: \`[USB Port] -> [OVP IC] -> [Charging IC] -> [VDD_MAIN] -> [PMIC]\`).
4. **Teknik Solder Tingkat Lanjut**: Sertakan rekomendasi suhu blower/hot air (misal 320°C-360°C angin 3-4), suhu mata solder (330°C-350°C), jenis fluks (no-clean/RMA), timah pasta (138°C untuk pemula angkat kaleng / 183°C untuk reballing BGA), serta tips aman melindungi komponen sebelah dengan kapton tape/aluminium foil.
5. **Analisis Foto Perangkat / PCB Real-Time**: Jika pengguna mengunggah foto motherboard, IC, konektor, atau kerusakan fisik, identifikasi komponen yang terlihat di foto (PMIC, coil, kapasitor SMD, konektor FPC, korosi air, bekas gosong, pad terangkat), tunjukkan area yang perlu dicek pakai multimeter, dan berikan langkah perbaikan presisi.`;

const EMILY_SYSTEM_INSTRUCTION = `Kamu adalah "Emily", seorang Master Admin Toko Servis HP yang super cekatan, ramah, rapi, teliti, dan ahli komunikasi pelanggan.

GAYA BAHASA & KEPRIBADIAN:
- Gunakan bahasa Indonesia admin toko modern yang ceria, sopan, hangat, dan profesional (tidak kaku, nyaman dibaca pelanggan lewat WhatsApp/DM).
- Selalu bantu pemilik toko atau admin mengekstrak info dari nota servis dan langsung menyiapkan teks chat siap kirim.

KEMAMPUAN & FORMAT JAWABAN WAJIB:
1. **Membaca Nota (Foto Struk / Teks Acak)**: Jika pengguna mengirim foto nota (tulisan tangan atau struk thermal) atau menempelkan teks catatan servis, baca dan rangkum poin pentingnya secara rapi dalam daftar:
   - No. Nota / Tanggal (jika ada)
   - Nama Pelanggan
   - Tipe HP & Warna/Kondisi
   - Keluhan / Kerusakan
   - Tindakan / Sparepart
   - Estimasi / Total Biaya & DP (jika ada)
   - Masa Garansi & Status
   Jika ada tulisan di foto nota yang kurang jelas, beri catatan jujur bagian mana yang buram supaya admin bisa cek ulang.
2. **Chat Salinan Siap Kirim (WA/DM)**: SELALU buatkan minimal 1 sampai 2 opsi template chat WhatsApp yang siap disalin dan langsung dikirim ke pelanggan.
   - Bungkus setiap chat salinan menggunakan penanda blok khusus PERSIS seperti ini agar tombol "Salin Chat" otomatis muncul di layar admin:
   \`\`\`salinan
   (isi pesan WhatsApp yang rapi, ramah, pakai salam & emoji secukupnya, siap kirim)
   \`\`\`
   - Pastikan pesan salinan sudah otomatis terisi data dari nota (nama pelanggan, tipe HP, biaya, status, garansi). Jika data belum lengkap, gunakan placeholder jelas seperti [Nama Pelanggan] atau [Nominal Biaya].`;

interface ChatMessageInput {
  role: 'user' | 'assistant';
  text: string;
}

app.post('/api/chat', async (req, res) => {
  try {
    const {
      persona,
      messages,
      imageBase64,
      mimeType,
      schematicContext,
    } = req.body as {
      persona?: 'minghao' | 'emily';
      messages?: ChatMessageInput[];
      imageBase64?: string;
      mimeType?: string;
      schematicContext?: string;
    };

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY belum tersedia di server. Silakan cek pengaturan Secrets panel.',
      });
    }

    const activePersona = persona === 'emily' ? 'emily' : 'minghao';
    const baseInstruction =
      activePersona === 'emily' ? EMILY_SYSTEM_INSTRUCTION : MINGHAO_SYSTEM_INSTRUCTION;

    const systemInstruction = schematicContext
      ? `${baseInstruction}\n\nKONTEKS KOMPONEN SKEMA YANG SEDANG DIPILIH PENGGUNA:\n${schematicContext}`
      : baseInstruction;

    const safeMessages = Array.isArray(messages) ? messages : [];
    const lastMessage = safeMessages[safeMessages.length - 1];
    const historyMessages = safeMessages.slice(0, -1);

    type ContentPart =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };

    const formattedContents: Array<{ role: string; parts: ContentPart[] }> =
      historyMessages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      }));

    const latestParts: ContentPart[] = [];

    if (imageBase64 && mimeType) {
      latestParts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
    }

    latestParts.push({
      text:
        lastMessage?.text?.trim() ||
        (activePersona === 'emily'
          ? 'Tolong baca nota ini dan buatkan chat salinan WhatsApp yang ramah untuk pelanggan.'
          : 'Tolong analisa foto komponen/PCB ini dan jelaskan langkah diagnosa serta perbaikannya.'),
    });

    formattedContents.push({
      role: 'user',
      parts: latestParts,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: formattedContents,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: activePersona === 'minghao' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
        },
      },
    });

    return res.json({
      reply: response.text ?? 'Maaf, belum ada respons dari asisten. Coba kirim ulang ya.',
      persona: activePersona,
    });
  } catch (err: unknown) {
    console.error('Gemini API error:', err);
    const errorObj = err as { status?: number; message?: string };
    const statusCode = errorObj?.status && errorObj.status >= 400 ? errorObj.status : 500;
    return res.status(statusCode).json({
      error:
        errorObj?.message ||
        'Terjadi kendala saat menghubungi layanan AI Gemini. Pastikan API key valid dan coba lagi.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FixMate Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
