import JSZip from 'jszip';

export interface PhpBundleFiles {
  'index.php': string;
  'api.php': string;
  'config.php': string;
  'index.html': string;
  'README_DEPLOY.txt': string;
}

export function buildPhpDeployBundle(): PhpBundleFiles {
  const configPhp = `<?php
// config.php — Konfigurasi API Key Gemini (Server-Side Only)
// Isi API Key dari Google AI Studio atau set environment variable GEMINI_API_KEY di hosting Anda.

$GEMINI_API_KEY = getenv('GEMINI_API_KEY') ?: 'MASUKKAN_GEMINI_API_KEY_ANDA_DI_SINI';
$GEMINI_MODEL   = 'gemini-4-hydrogen';
`;

  const apiPhp = `<?php
// api.php — Backend Proxy PHP 8+ untuk Asisten AI Mínghào & Emily
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method tidak diizinkan. Gunakan POST.']);
    exit;
}

require_once __DIR__ . '/config.php';

if (empty($GEMINI_API_KEY) || $GEMINI_API_KEY === 'MASUKKAN_GEMINI_API_KEY_ANDA_DI_SINI') {
    http_response_code(500);
    echo json_encode(['error' => 'GEMINI_API_KEY belum diisi di config.php atau environment server.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['error' => 'Payload JSON tidak valid.']);
    exit;
}

$persona          = ($payload['persona'] ?? 'minghao') === 'emily' ? 'emily' : 'minghao';
$messages         = $payload['messages'] ?? [];
$imageBase64      = $payload['imageBase64'] ?? null;
$mimeType         = $payload['mimeType'] ?? null;
$schematicContext = $payload['schematicContext'] ?? '';

$minghaoPrompt = "Kamu adalah Mínghào, Master Teknisi Servis HP & Ahli Micro-Soldering. Gunakan bahasa Indonesia santai, ramah, ceria, dan gampang dimengerti pemula namun sangat detail secara teknis. Selalu berikan: 1) Diagnosa akurat, 2) Langkah demi langkah cek multimeter/PSU & nilai dioda, 3) Diagram jalur dalam blok \`\`\`text ... \`\`\`, 4) Teknik solder & suhu blower, 5) Pengenalan komponen/IC/kerusakan jika ada foto PCB.";

$emilyPrompt = "Kamu adalah Emily, Master Admin Toko Servis HP yang ramah, ceria, dan rapi. Tugasmu membaca foto nota servis atau rincian teks nota (Nama, Tipe HP, Keluhan, Biaya, Garansi, Status), lalu merangkumnya dan membuatkan minimal 1-2 chat salinan WhatsApp siap kirim yang dibungkus dalam blok \`\`\`salinan ... \`\`\`.";

$systemInstruction = $persona === 'emily' ? $emilyPrompt : $minghaoPrompt;
if (!empty($schematicContext)) {
    $systemInstruction .= "\\n\\nKONTEKS SKEMA BOARD:\\n" . $schematicContext;
}

$contents = [];
$count = count($messages);
for ($i = 0; $i < $count; $i++) {
    $msg = $messages[$i];
    $role = ($msg['role'] ?? 'user') === 'assistant' ? 'model' : 'user';
    $parts = [];

    // Lampirkan gambar hanya pada pesan terakhir dari user
    if ($i === $count - 1 && $role === 'user' && !empty($imageBase64) && !empty($mimeType)) {
        $parts[] = [
            'inline_data' => [
                'mime_type' => $mimeType,
                'data'      => $imageBase64,
            ]
        ];
    }

    $parts[] = ['text' => (string)($msg['text'] ?? '')];
    $contents[] = ['role' => $role, 'parts' => $parts];
}

$requestBody = [
    'system_instruction' => [
        'parts' => [['text' => $systemInstruction]]
    ],
    'contents' => $contents,
];

$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$GEMINI_MODEL}:generateContent?key=" . urlencode($GEMINI_API_KEY);

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode($requestBody),
    CURLOPT_TIMEOUT        => 45,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Gagal terhubung ke Gemini API: ' . $curlErr]);
    exit;
}

$data = json_decode($response, true);
if ($httpCode >= 400 || empty($data['candidates'][0]['content']['parts'][0]['text'])) {
    $errMsg = $data['error']['message'] ?? 'Respons AI tidak tersedia.';
    http_response_code($httpCode >= 400 ? $httpCode : 500);
    echo json_encode(['error' => $errMsg]);
    exit;
}

$replyText = $data['candidates'][0]['content']['parts'][0]['text'];
echo json_encode(['reply' => $replyText, 'persona' => $persona]);
`;

  const htmlTemplate = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FixMate Studio — Asisten Servis HP Mínghào & Emily</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'DM Sans', sans-serif; background-color: #F7F9FB; color: #0F172A; }
    h1, h2, h3, .font-display { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen">
  <!-- Header 3-Zone -->
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
      <a href="#" class="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
        FixMate Studio
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <a href="#chat-studio" onclick="switchWorkspaceTab('chat-minghao')" class="hover:text-teal-700 whitespace-nowrap">Chat Mínghào</a>
        <a href="#chat-studio" onclick="switchWorkspaceTab('skema-board')" class="hover:text-teal-700 whitespace-nowrap">Skema Board</a>
        <a href="#chat-studio" onclick="switchWorkspaceTab('chat-emily')" class="hover:text-orange-600 whitespace-nowrap">Admin Emily</a>
        <a href="#chat-studio" onclick="switchWorkspaceTab('pembaca-nota')" class="hover:text-orange-600 whitespace-nowrap">Pembaca Nota</a>
      </nav>
      <button onclick="resetActiveChat()" class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0">
        Percakapan Baru
      </button>
    </div>
  </header>

  <main id="chat-studio" class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
    <!-- Hero Ringkas Ceria -->
    <div class="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <div class="text-xs font-semibold text-teal-700">Asisten Bengkel &amp; Admin Konter HP</div>
        <h1 class="mt-1 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Tab Terpisah untuk Mínghào, Skema Board, Emily &amp; Pembaca Nota
        </h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-600">
          Setiap alat kerja punya tab khusus agar lebih fokus: Chat Mínghào, Basis Data Skema Motherboard, Chat Admin Emily, serta Pembaca Nota &amp; Salinan Admin.
        </p>
      </div>
      <!-- 4-Tab Switcher -->
      <div class="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1.5 sm:grid-cols-4">
        <button id="tab-chat-minghao" onclick="switchWorkspaceTab('chat-minghao')" class="rounded-lg bg-teal-600 px-3 py-2.5 text-xs font-bold text-white transition whitespace-nowrap">
          Chat Mínghào
        </button>
        <button id="tab-skema-board" onclick="switchWorkspaceTab('skema-board')" class="rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition whitespace-nowrap">
          Skema Motherboard
        </button>
        <button id="tab-chat-emily" onclick="switchWorkspaceTab('chat-emily')" class="rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition whitespace-nowrap">
          Chat Admin Emily
        </button>
        <button id="tab-pembaca-nota" onclick="switchWorkspaceTab('pembaca-nota')" class="rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition whitespace-nowrap">
          Pembaca Nota
        </button>
      </div>
    </div>

    <!-- Tab 1 & 3: Chatbox Minimalis Modern -->
    <section id="panel-chat" class="flex h-[650px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div id="chat-header" class="flex items-center justify-between border-b border-slate-200 bg-teal-50/70 px-5 py-3.5">
        <div>
          <div id="persona-title" class="font-display text-sm font-bold text-slate-900">Mínghào — Master Teknisi Hardware</div>
          <div id="persona-subtitle" class="text-xs text-slate-600">Diagnosa komponen, diagram jalur &amp; analisa foto PCB</div>
        </div>
        <label class="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
          Unggah Foto
          <input id="photo-input" type="file" accept="image/*" class="hidden" onchange="handleImagePick(event)" />
        </label>
      </div>

      <div id="chat-messages" class="flex-1 space-y-4 overflow-y-auto bg-[#F7F9FB] p-5"></div>

      <div id="preview-bar" class="hidden items-center justify-between border-t border-slate-200 bg-amber-50 px-4 py-2 text-xs">
        <span id="preview-name" class="font-medium text-amber-900">Foto siap dikirim</span>
        <button onclick="clearImage()" class="font-semibold text-rose-600 hover:underline">Hapus</button>
      </div>

      <form onsubmit="sendMessage(event)" class="flex items-center gap-2 border-t border-slate-200 bg-white p-3.5">
        <input id="chat-input" type="text" placeholder="Tulis keluhan HP, kode IC, atau tempel rincian nota..." class="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-teal-500 focus:bg-white focus:outline-none" />
        <button id="send-btn" type="submit" class="min-h-[44px] rounded-xl bg-teal-600 px-5 text-xs font-bold text-white hover:bg-teal-700 whitespace-nowrap">
          Kirim
        </button>
      </form>
    </section>

    <!-- Tab 2: Basis Data Skema Motherboard -->
    <section id="panel-skema" class="hidden h-[650px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-5 py-4">
        <h2 class="font-display text-base font-bold text-slate-900">Basis Data Skema Motherboard Interaktif</h2>
        <p class="mt-0.5 text-xs text-slate-500">Klik komponen untuk cek tegangan &amp; langsung tanyakan ke tab Chat Mínghào.</p>
      </div>
      <div id="schematic-list" class="flex-1 space-y-3 overflow-y-auto p-5"></div>
    </section>

    <!-- Tab 4: Pembaca Nota & Studio Salinan Admin -->
    <section id="panel-nota" class="hidden flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-display text-base font-bold text-slate-900">Pembaca Nota &amp; Studio Salinan Admin</h2>
      <p class="mt-0.5 text-xs text-slate-500">Isi rincian nota servis di bawah, lalu kirim ke Chat Admin Emily untuk dibuatkan chat WhatsApp siap salin.</p>
      <form onsubmit="submitQuickNota(event)" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input id="nota-nama" type="text" placeholder="Nama Pelanggan (misal: Kak Raka)" class="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs" />
        <input id="nota-hp" type="text" placeholder="Tipe HP (misal: iPhone 13 Pro)" class="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs" />
        <input id="nota-keluhan" type="text" placeholder="Kerusakan & Tindakan Servis" class="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:col-span-2" />
        <input id="nota-biaya" type="text" placeholder="Biaya / DP (misal: Rp 450.000)" class="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs" />
        <input id="nota-garansi" type="text" value="Garansi 14 Hari" placeholder="Garansi" class="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs" />
        <button type="submit" class="min-h-[44px] rounded-xl bg-orange-600 px-5 text-xs font-bold text-white hover:bg-orange-700 sm:col-span-2">
          Buat Chat Salinan via Emily
        </button>
      </form>
    </section>
  </main>

  <script>
    const API_ENDPOINT = './api.php';
    let currentPersona = 'minghao';
    let currentWorkspaceTab = 'chat-minghao';
    let selectedImage = null;

    const histories = {
      minghao: [{ role: 'assistant', text: 'Halo bro! Aku Mínghào. Ada HP mati total, short VDD_MAIN, atau bingung baca jalur skema? Ceritain aja atau unggah foto mesinnya di sini ya!' }],
      emily:   [{ role: 'assistant', text: 'Halo Kak! Aku Emily, asisten admin toko servis HP. Unggah foto nota atau tulis detail servisnya, nanti aku buatkan chat WhatsApp yang rapi dan siap disalin!' }]
    };

    const schematics = [
      { code: 'U2700', model: 'iPhone 15 Pro', name: 'Main PMIC 338S00946', rail: 'PP_VDD_MAIN (4.0V)', diode: '0.360V', tip: 'Suhu blower 340°C angin 3, lindungi konektor FPC dengan kapton tape.' },
      { code: 'U3300', model: 'iPhone 15 Pro', name: 'Charging & USB-C PD IC', rail: 'PP5V0_USB_VBUS (5V-9V)', diode: '0.410V', tip: 'Cek pin CC1 & CC2 sebelum angkat IC; reball pakai timah 183°C.' },
      { code: 'U5001', model: 'Samsung A54/S23', name: 'OVP Over Voltage IC', rail: 'VBUS_IN_5V -> CHG', diode: '0.450V', tip: 'IC WLCSP kecil, pakai angin 2.5 suhu 325°C agar tidak bergeser.' },
      { code: 'U2401', model: 'Redmi Note 12/13', name: 'Backlight Driver & Dioda', rail: 'LCD_BL_LED_A (18V-24V)', diode: '0.480V', tip: 'Pastikan polaritas garis katoda dioda tidak terbalik saat pemasangan.' }
    ];

    function renderSchematics() {
      const box = document.getElementById('schematic-list');
      box.innerHTML = schematics.map((s, idx) => \`
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs font-bold text-teal-700">\${s.code} · \${s.model}</span>
            <button onclick="askAboutNode(\${idx})" class="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-700">Tanya Mínghào</button>
          </div>
          <div class="mt-1 font-display text-sm font-bold text-slate-900">\${s.name}</div>
          <div class="mt-1.5 font-mono text-xs text-slate-600">Rail: \${s.rail} · Diode: \${s.diode}</div>
          <p class="mt-1.5 text-xs text-slate-600">\${s.tip}</p>
        </div>
      \`).join('');
    }

    function askAboutNode(idx) {
      const s = schematics[idx];
      switchWorkspaceTab('chat-minghao');
      document.getElementById('chat-input').value = \`Mínghào, jelaskan cara cek & teknik solder untuk \${s.code} (\${s.name}) pada \${s.model} jalur \${s.rail}.\`;
      document.getElementById('chat-input').focus();
    }

    function submitQuickNota(e) {
      e.preventDefault();
      const nama = document.getElementById('nota-nama').value || '[Nama Pelanggan]';
      const hp = document.getElementById('nota-hp').value || '[Tipe HP]';
      const keluhan = document.getElementById('nota-keluhan').value || '[Detail Kerusakan]';
      const biaya = document.getElementById('nota-biaya').value || '[Nominal Biaya]';
      const garansi = document.getElementById('nota-garansi').value || '14 Hari';
      switchWorkspaceTab('chat-emily');
      document.getElementById('chat-input').value = \`Emily, buatkan rangkuman nota & chat salinan WhatsApp: Pelanggan \${nama}, HP \${hp}, Tindakan \${keluhan}, Biaya \${biaya}, Garansi \${garansi}.\`;
      document.getElementById('chat-input').focus();
    }

    function switchWorkspaceTab(tab) {
      currentWorkspaceTab = tab;
      const tabIds = ['chat-minghao', 'skema-board', 'chat-emily', 'pembaca-nota'];
      tabIds.forEach((id) => {
        const el = document.getElementById('tab-' + id);
        const active = id === tab;
        const isEmilyTab = id === 'chat-emily' || id === 'pembaca-nota';
        el.className = active
          ? \`rounded-lg \${isEmilyTab ? 'bg-orange-600' : 'bg-teal-600'} px-3 py-2.5 text-xs font-bold text-white transition whitespace-nowrap\`
          : 'rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition whitespace-nowrap';
      });

      document.getElementById('panel-chat').classList.toggle('hidden', tab !== 'chat-minghao' && tab !== 'chat-emily');
      document.getElementById('panel-skema').classList.toggle('hidden', tab !== 'skema-board');
      document.getElementById('panel-skema').classList.toggle('flex', tab === 'skema-board');
      document.getElementById('panel-nota').classList.toggle('hidden', tab !== 'pembaca-nota');
      document.getElementById('panel-nota').classList.toggle('flex', tab === 'pembaca-nota');

      if (tab === 'chat-minghao' || tab === 'chat-emily') {
        currentPersona = tab === 'chat-emily' ? 'emily' : 'minghao';
        const isM = currentPersona === 'minghao';
        document.getElementById('chat-header').className = \`flex items-center justify-between border-b border-slate-200 px-5 py-3.5 \${isM ? 'bg-teal-50/70' : 'bg-orange-50/70'}\`;
        document.getElementById('send-btn').className    = \`min-h-[44px] rounded-xl px-5 text-xs font-bold text-white whitespace-nowrap \${isM ? 'bg-teal-600 hover:bg-teal-700' : 'bg-orange-600 hover:bg-orange-700'}\`;
        document.getElementById('persona-title').textContent    = isM ? 'Mínghào — Master Teknisi Hardware' : 'Emily — Master Admin Toko Servis HP';
        document.getElementById('persona-subtitle').textContent = isM ? 'Diagnosa komponen, diagram jalur & analisa foto PCB' : 'Baca foto nota servis & buat chat salinan WhatsApp';
        renderChat();
      }
    }

    function copyText(btn, text) {
      navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = 'Tersalin!';
      setTimeout(() => btn.textContent = prev, 1800);
    }

    function formatBubbleText(text) {
      return text.replace(/\`\`\`(salinan|text)?\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) => {
        const safe = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const encoded = encodeURIComponent(code.trim());
        if (lang === 'salinan') {
          return \`<div class="my-2 rounded-xl border border-orange-200 bg-orange-50 p-3"><div class="mb-1.5 flex items-center justify-between text-xs font-bold text-orange-900"><span>Chat Salinan Siap Kirim</span><button type="button" onclick="copyText(this, decodeURIComponent('\${encoded}'))" class="rounded-lg bg-white px-2.5 py-1 text-orange-700 shadow-xs hover:bg-orange-600 hover:text-white">Salin Chat</button></div><div class="whitespace-pre-wrap text-xs text-slate-800">\${safe}</div></div>\`;
        }
        return \`<pre class="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-xs text-teal-200">\${safe}</pre>\`;
      }).replace(/\\n/g, '<br>');
    }

    function renderChat() {
      const box = document.getElementById('chat-messages');
      const isM = currentPersona === 'minghao';
      box.innerHTML = histories[currentPersona].map(m => {
        if (m.role === 'user') {
          return \`<div class="flex justify-end"><div class="max-w-[80%] rounded-2xl rounded-br-sm \${isM ? 'bg-teal-600' : 'bg-orange-600'} px-4 py-2.5 text-sm text-white">\${m.text}</div></div>\`;
        }
        return \`<div class="flex justify-start"><div class="max-w-[88%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">\${formatBubbleText(m.text)}</div></div>\`;
      }).join('');
      box.scrollTop = box.scrollHeight;
    }

    function handleImagePick(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        selectedImage = { base64: reader.result.split(',')[1], mimeType: file.type, name: file.name };
        document.getElementById('preview-name').textContent = 'Terlampir: ' + file.name;
        document.getElementById('preview-bar').classList.replace('hidden', 'flex');
      };
      reader.readAsDataURL(file);
    }

    function clearImage() {
      selectedImage = null;
      document.getElementById('preview-bar').classList.replace('flex', 'hidden');
    }

    function resetActiveChat() {
      histories[currentPersona] = histories[currentPersona].slice(0, 1);
      renderChat();
    }

    async function sendMessage(e) {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text && !selectedImage) return;
      const userMsg = { role: 'user', text: text || 'Tolong analisa gambar terlampir ini.' };
      histories[currentPersona].push(userMsg);
      input.value = '';
      renderChat();

      const imgPayload = selectedImage;
      clearImage();

      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona: currentPersona,
            messages: histories[currentPersona],
            imageBase64: imgPayload ? imgPayload.base64 : null,
            mimeType: imgPayload ? imgPayload.mimeType : null
          })
        });
        const data = await res.json();
        histories[currentPersona].push({ role: 'assistant', text: data.reply || ('Error: ' + (data.error || 'Gagal memuat respons')) });
      } catch (err) {
        histories[currentPersona].push({ role: 'assistant', text: 'Gagal menghubungi api.php: ' + err.message });
      }
      renderChat();
    }

    renderSchematics();
    renderChat();
  </script>
</body>
</html>
`;

  const indexPhp = `<?php
// index.php — FixMate Studio Ready-to-Deploy (PHP 8 + HTML5 + Tailwind)
require_once __DIR__ . '/config.php';
?>
${htmlTemplate}`;

  const readmeTxt = `FIXMATE STUDIO — PANDUAN DEPLOY PHP/HTML
========================================

Isi Paket:
1. index.php   -> Halaman utama website bertema ceria (Double Tab Mínghào & Emily + Skema Interaktif)
2. api.php     -> Proxy backend PHP cURL ke Gemini API (model: gemini-4-hydrogen)
3. config.php  -> Pengaturan GEMINI_API_KEY di sisi server (aman, tidak terekspos ke browser)
4. index.html  -> Versi HTML murni jika Anda ingin menaruh frontend terpisah dari api.php

Cara Deploy (cPanel / Shared Hosting / Laragon / XAMPP / VPS):
1. Upload semua file (index.php, api.php, config.php) ke folder public_html/ atau htdocs/fixmate/.
2. Buka config.php lalu isi $GEMINI_API_KEY dengan API key Anda (atau atur environment variable GEMINI_API_KEY di server).
3. Pastikan ekstensi PHP cURL aktif (php-curl).
4. Buka domain Anda (misal: https://servisanda.com/index.php) dan langsung gunakan Mínghào & Emily!
`;

  return {
    'index.php': indexPhp,
    'api.php': apiPhp,
    'config.php': configPhp,
    'index.html': htmlTemplate,
    'README_DEPLOY.txt': readmeTxt,
  };
}

export async function downloadPhpDeployZip(): Promise<void> {
  const files = buildPhpDeployBundle();
  const zip = new JSZip();

  Object.entries(files).forEach(([filename, content]) => {
    zip.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fixmate-php-html-deploy.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
