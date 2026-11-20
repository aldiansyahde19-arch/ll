import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Code2,
  Cpu,
  Download,
  FileText,
  ImagePlus,
  RotateCcw,
  Send,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { ChatMessage, ChatMessageBubble } from './components/ChatMessageBubble';
import { SchematicDatabasePanel } from './components/SchematicDatabasePanel';
import { ReceiptScannerPanel } from './components/ReceiptScannerPanel';
import { PhpExportModal } from './components/PhpExportModal';
import { downloadPhpDeployZip } from './data/phpExportGenerator';
import { BoardComponentNode, MotherboardModel } from './data/schematics';

type PersonaTab = 'minghao' | 'emily';
type WorkspaceTab = 'chat-minghao' | 'skema-board' | 'chat-emily' | 'pembaca-nota';

const AVATAR_URLS: Record<PersonaTab, string> = {
  minghao: '/src/assets/images/avatar_minghao_1795211571336.jpg',
  emily: '/src/assets/images/avatar_emily_1795211573579.jpg',
};

const INITIAL_MESSAGES: Record<PersonaTab, ChatMessage[]> = {
  minghao: [
    {
      id: 'm-welcome',
      role: 'assistant',
      timestamp: 'Sekarang',
      text: `Halo bro/sis! Aku **Mínghào**, asisten teknisi hardware & micro-soldering kamu.

Mau belajar dari nol atau lagi pegang kasus mesin yang bikin pusing? Ceritain aja gejalanya di sini — mulai dari HP mati total, arus PSU gantung, jalur \`VDD_MAIN\` short, sampai teknik reball IC BGA.

Kamu juga bisa:
1. **Unggah foto motherboard / komponen** di bawah supaya aku bantu kenali IC, jalur putus, atau area korosinya secara real-time.
2. **Buka tab Basis Data Skema** untuk cek nilai mode dioda, lihat jalur board, dan langsung tanya aku soal komponennya.`,
    },
  ],
  emily: [
    {
      id: 'e-welcome',
      role: 'assistant',
      timestamp: 'Sekarang',
      text: `Halo Kak! Aku **Emily**, asisten admin toko servis HP yang siap bantu urus nota & chat ke pelanggan.

Tinggal kirim **foto nota servis** (tulisan tangan atau struk) atau tempel rincian servisnya di sini. Nanti aku bantu:
1. Merangkum detail nota (nama, tipe HP, keluhan, biaya, garansi) dengan rapi.
2. Membuatkan **chat salinan WhatsApp siap kirim** yang ramah dan jelas — tinggal klik tombol **Salin Chat** dan kirim ke pelanggan!`,
    },
  ],
};

const QUICK_PROMPTS: Record<PersonaTab, string[]> = {
  minghao: [
    'HP mati total arus PSU 0.02A, cek apa dulu?',
    'Suhu aman angkat IC PMIC tanpa rontok',
    'Cara ukur short jalur VDD_MAIN pakai multimeter',
    'Langkah jumper jalur konektor LCD yang putus',
  ],
  emily: [
    'Buatkan chat salinan HP sudah selesai & siap diambil',
    'Template chat konfirmasi persetujuan biaya ganti LCD',
    'Balasan sopan saat pelanggan tanya status servis',
    'Pesan follow-up garansi 7 hari setelah pengambilan',
  ],
};

function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('chat-minghao');
  const activeTab: PersonaTab =
    workspaceTab === 'chat-emily' || workspaceTab === 'pembaca-nota' ? 'emily' : 'minghao';
  const [messagesByTab, setMessagesByTab] =
    useState<Record<PersonaTab, ChatMessage[]>>(INITIAL_MESSAGES);
  const [inputByTab, setInputByTab] = useState<Record<PersonaTab, string>>({
    minghao: '',
    emily: '',
  });
  const [loadingTab, setLoadingTab] = useState<PersonaTab | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
    name: string;
  } | null>(null);

  const [activeSchematicContext, setActiveSchematicContext] = useState<{
    label: string;
    detail: string;
  } | null>(null);

  const [avatarError, setAvatarError] = useState<Record<PersonaTab, boolean>>({
    minghao: false,
    emily: false,
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const currentMessages = messagesByTab[activeTab];
  const currentInput = inputByTab[activeTab];
  const isSending = loadingTab === activeTab;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentMessages, isSending, activeTab]);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorBanner('Format file harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      setPendingImage({
        base64,
        mimeType: file.type || 'image/jpeg',
        preview: dataUrl,
        name: file.name,
      });
      setErrorBanner(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageSelect(file);
          return;
        }
      }
    }
  };

  const sendMessageToAssistant = async (
    targetTab: PersonaTab,
    textOverride?: string,
    imageOverride?: { base64: string; mimeType: string; preview: string },
    schematicOverride?: string
  ) => {
    const textToSend = (textOverride ?? inputByTab[targetTab]).trim();
    const imageToUse = imageOverride ?? pendingImage;

    if (!textToSend && !imageToUse) return;
    if (loadingTab === targetTab) return;

    setErrorBanner(null);
    const displayPrompt =
      textToSend ||
      (targetTab === 'emily'
        ? 'Tolong baca foto nota ini dan buatkan chat salinan WhatsApp siap kirim.'
        : 'Tolong kenali komponen pada foto board ini dan jelaskan langkah diagnosanya.');

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: displayPrompt,
      timestamp: getCurrentTimeLabel(),
      imagePreview: imageToUse?.preview,
      attachedTag:
        targetTab === 'minghao' && activeSchematicContext
          ? `Skema: ${activeSchematicContext.label}`
          : undefined,
    };

    const nextHistory = [...messagesByTab[targetTab], userMessage];
    setMessagesByTab((prev) => ({
      ...prev,
      [targetTab]: nextHistory,
    }));

    if (!textOverride) {
      setInputByTab((prev) => ({ ...prev, [targetTab]: '' }));
    }
    if (!imageOverride) {
      setPendingImage(null);
    }

    setLoadingTab(targetTab);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: targetTab,
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          imageBase64: imageToUse?.base64,
          mimeType: imageToUse?.mimeType,
          schematicContext:
            schematicOverride ??
            (targetTab === 'minghao' ? activeSchematicContext?.detail : undefined),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan balasan dari server AI.');
      }

      const botMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        timestamp: getCurrentTimeLabel(),
      };

      setMessagesByTab((prev) => ({
        ...prev,
        [targetTab]: [...prev[targetTab], botMessage],
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Koneksi ke asisten terputus. Coba ulangi lagi.';
      setErrorBanner(message);
    } finally {
      setLoadingTab((prev) => (prev === targetTab ? null : prev));
    }
  };

  const handleAskFromSchematic = (model: MotherboardModel, node: BoardComponentNode) => {
    setWorkspaceTab('chat-minghao');
    const label = `${model.modelName} · ${node.designator} (${node.name})`;
    const detail = [
      `Model: ${model.brand} ${model.modelName} (${model.boardCode})`,
      `Komponen: ${node.designator} - ${node.name}`,
      `Jalur: ${node.railName}`,
      `Tegangan Normal: ${node.normalVoltage}`,
      `Diode Mode: ${node.diodeMode}`,
      `Gejala Khas: ${node.symptoms.join('; ')}`,
      `Tips Solder: ${node.solderTips}`,
    ].join('\n');

    setActiveSchematicContext({ label, detail });

    const prompt = `Mínghào, aku lagi pegang ${model.modelName} bagian ${node.designator} (${node.name}) di jalur ${node.railName}. Jelasin dong cara ngeceknya langkah demi langkah buat pemula, diagram jalurnya, sama trik soldernya biar aman!`;
    void sendMessageToAssistant('minghao', prompt, undefined, detail);
  };

  const handleSendReceiptToEmily = (
    promptText: string,
    image?: { base64: string; mimeType: string; preview: string }
  ) => {
    setWorkspaceTab('chat-emily');
    void sendMessageToAssistant('emily', promptText, image);
  };

  const handleResetChat = () => {
    setMessagesByTab((prev) => ({
      ...prev,
      [activeTab]: INITIAL_MESSAGES[activeTab],
    }));
    setErrorBanner(null);
    if (activeTab === 'minghao') {
      setActiveSchematicContext(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessageToAssistant(activeTab);
    }
  };

  const isMinghao = activeTab === 'minghao';

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-slate-900">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-8">
          <a
            href="#top"
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            FixMate Studio
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a
              href="#ruang-kerja"
              onClick={() => setWorkspaceTab('chat-minghao')}
              className="transition-colors hover:text-teal-700 whitespace-nowrap shrink-0"
            >
              Chat Mínghào
            </a>
            <a
              href="#ruang-kerja"
              onClick={() => setWorkspaceTab('skema-board')}
              className="transition-colors hover:text-teal-700 whitespace-nowrap shrink-0"
            >
              Skema Board
            </a>
            <a
              href="#ruang-kerja"
              onClick={() => setWorkspaceTab('chat-emily')}
              className="transition-colors hover:text-orange-600 whitespace-nowrap shrink-0"
            >
              Admin Emily
            </a>
            <a
              href="#ruang-kerja"
              onClick={() => setWorkspaceTab('pembaca-nota')}
              className="transition-colors hover:text-orange-600 whitespace-nowrap shrink-0"
            >
              Pembaca Nota
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Code2 className="h-4 w-4" />
              <span>Ekspor PHP/HTML</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
        {/* Cheerful Studio Header & Separated Tab Switcher */}
        <section className="mb-6 flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span className="font-semibold text-teal-700">Asisten Teknisi Hardware</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-orange-600">Admin Nota Servis HP</span>
                <span aria-hidden="true">·</span>
                <span>Siap Deploy PHP/HTML</span>
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance] sm:text-3xl">
                Bengkel Cerdas dengan Tab Asisten &amp; Alat Kerja Terpisah
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Setiap fitur memiliki tab khusus agar fokus dan lega: pilih <strong>Chat Mínghào</strong>, <strong>Basis Data Skema Motherboard</strong>, <strong>Chat Admin Emily</strong>, atau <strong>Pembaca Nota &amp; Salinan</strong>.
              </p>
            </div>
          </div>

          {/* 4-Tab Separated Navigation */}
          <div
            role="tablist"
            aria-label="Pilih ruang kerja"
            className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1.5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'chat-minghao'}
              onClick={() => setWorkspaceTab('chat-minghao')}
              className={`flex min-h-[48px] items-center gap-2.5 rounded-xl px-4 py-2 text-left transition-all whitespace-nowrap shrink-0 ${
                workspaceTab === 'chat-minghao'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <Wrench className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-display text-xs font-bold">Chat Mínghào</div>
                <div
                  className={`truncate text-[11px] ${
                    workspaceTab === 'chat-minghao' ? 'text-teal-100' : 'text-slate-500'
                  }`}
                >
                  Teknisi Hardware AI
                </div>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'skema-board'}
              onClick={() => setWorkspaceTab('skema-board')}
              className={`flex min-h-[48px] items-center gap-2.5 rounded-xl px-4 py-2 text-left transition-all whitespace-nowrap shrink-0 ${
                workspaceTab === 'skema-board'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <Cpu className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-display text-xs font-bold">Skema Motherboard</div>
                <div
                  className={`truncate text-[11px] ${
                    workspaceTab === 'skema-board' ? 'text-teal-100' : 'text-slate-500'
                  }`}
                >
                  Basis Data Jalur &amp; IC
                </div>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'chat-emily'}
              onClick={() => setWorkspaceTab('chat-emily')}
              className={`flex min-h-[48px] items-center gap-2.5 rounded-xl px-4 py-2 text-left transition-all whitespace-nowrap shrink-0 ${
                workspaceTab === 'chat-emily'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-display text-xs font-bold">Chat Admin Emily</div>
                <div
                  className={`truncate text-[11px] ${
                    workspaceTab === 'chat-emily' ? 'text-orange-100' : 'text-slate-500'
                  }`}
                >
                  Asisten Admin Toko
                </div>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'pembaca-nota'}
              onClick={() => setWorkspaceTab('pembaca-nota')}
              className={`flex min-h-[48px] items-center gap-2.5 rounded-xl px-4 py-2 text-left transition-all whitespace-nowrap shrink-0 ${
                workspaceTab === 'pembaca-nota'
                  ? 'bg-orange-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-display text-xs font-bold">Pembaca Nota &amp; Salinan</div>
                <div
                  className={`truncate text-[11px] ${
                    workspaceTab === 'pembaca-nota' ? 'text-orange-100' : 'text-slate-500'
                  }`}
                >
                  Studio Nota &amp; WhatsApp
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Main Active Tab Viewport */}
        <section id="ruang-kerja" className="mx-auto w-full max-w-5xl">
          {(workspaceTab === 'chat-minghao' || workspaceTab === 'chat-emily') && (
            <div className="flex h-[680px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Chat Window Header */}
              <div
                className={`flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5 transition-colors ${
                  isMinghao ? 'bg-teal-50/70' : 'bg-orange-50/70'
                }`}
              >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white bg-slate-200 shadow-xs">
                  {!avatarError[activeTab] ? (
                    <img
                      src={AVATAR_URLS[activeTab]}
                      alt={isMinghao ? 'Foto Mínghào' : 'Foto Emily'}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setAvatarError((prev) => ({ ...prev, [activeTab]: true }))
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center font-display text-sm font-bold text-white ${
                        isMinghao ? 'bg-teal-600' : 'bg-orange-600'
                      }`}
                    >
                      {isMinghao ? 'MH' : 'EM'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-display text-sm font-bold text-slate-900 sm:text-base">
                      {isMinghao
                        ? 'Mínghào · Master Teknisi Servis HP'
                        : 'Emily · Master Admin Toko Servis'}
                    </h2>
                  </div>
                  <p className="truncate text-xs text-slate-600">
                    {isMinghao
                      ? 'Diagnosa komponen, skema jalur, teknik solder & baca foto PCB'
                      : 'Baca foto nota servis, rangkum biaya & buat chat WhatsApp siap salin'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setWorkspaceTab(isMinghao ? 'skema-board' : 'pembaca-nota')
                  }
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isMinghao
                      ? 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
                      : 'border-orange-200 bg-white text-orange-800 hover:bg-orange-50'
                  }`}
                >
                  {isMinghao ? (
                    <>
                      <Cpu className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Buka Skema Board</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Buka Pembaca Nota</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetChat}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Percakapan Baru</span>
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div
              ref={chatScrollRef}
              className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-[#F7F9FB] p-5"
            >
              {currentMessages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  persona={activeTab}
                  avatarUrl={AVATAR_URLS[activeTab]}
                />
              ))}

              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <img
                      src={AVATAR_URLS[activeTab]}
                      alt={isMinghao ? 'Mínghào' : 'Emily'}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-xs">
                    {isMinghao
                      ? 'Mínghào sedang mengecek jalur & menyusun panduan langkah demi langkah...'
                      : 'Emily sedang membaca rincian nota & merapikan chat salinan...'}
                  </div>
                </div>
              )}

              {errorBanner && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                  <span>{errorBanner}</span>
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    className="font-semibold text-rose-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>

            {/* Quick Prompt Strip */}
            <div className="border-t border-slate-200 bg-white px-4 pt-2.5 pb-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_PROMPTS[activeTab].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessageToAssistant(activeTab, prompt)}
                    className={`min-h-[34px] rounded-lg border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isMinghao
                        ? 'border-teal-200 bg-teal-50/60 text-teal-800 hover:bg-teal-100'
                        : 'border-orange-200 bg-orange-50/60 text-orange-800 hover:bg-orange-100'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Context & Image Attachment Bar */}
            {(pendingImage || (isMinghao && activeSchematicContext)) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2">
                {isMinghao && activeSchematicContext && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900">
                    <Cpu className="h-3.5 w-3.5 text-teal-600" />
                    <span className="max-w-[260px] truncate">{activeSchematicContext.label}</span>
                    <button
                      type="button"
                      onClick={() => setActiveSchematicContext(null)}
                      aria-label="Hapus konteks skema"
                      className="text-teal-700 hover:text-teal-950"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {pendingImage && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                    <img
                      src={pendingImage.preview}
                      alt="Pratinjau lampiran"
                      className="h-6 w-6 rounded object-cover"
                    />
                    <span className="max-w-[180px] truncate font-medium">
                      {pendingImage.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      aria-label="Hapus gambar"
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Chat Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessageToAssistant(activeTab);
              }}
              className="flex items-end gap-2 border-t border-slate-200 bg-white p-3.5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={
                  isMinghao
                    ? 'Unggah foto PCB / kerusakan komponen'
                    : 'Unggah foto nota servis'
                }
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isMinghao
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800'
                }`}
              >
                {isMinghao ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isMinghao ? 'Foto PCB' : 'Foto Nota'}
                </span>
              </button>

              <textarea
                ref={textInputRef}
                rows={1}
                value={currentInput}
                onChange={(e) =>
                  setInputByTab((prev) => ({ ...prev, [activeTab]: e.target.value }))
                }
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  isMinghao
                    ? 'Tanya gejala HP, kode IC, atau tempel foto PCB (Ctrl+V)...'
                    : 'Tempel catatan nota servis atau minta Emily buatkan chat WhatsApp...'
                }
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
              />

              <button
                type="submit"
                disabled={isSending || (!currentInput.trim() && !pendingImage)}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 ${
                  isMinghao
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>Kirim</span>
              </button>
            </form>
          </div>
          )}

          {workspaceTab === 'skema-board' && (
            <div className="h-[720px]">
              <SchematicDatabasePanel onAskMinghao={handleAskFromSchematic} />
            </div>
          )}

          {workspaceTab === 'pembaca-nota' && (
            <div className="h-[720px]">
              <ReceiptScannerPanel onSendReceiptToEmily={handleSendReceiptToEmily} />
            </div>
          )}
        </section>

        {/* Ready-to-Deploy PHP & HTML Section */}
        <section
          id="ekspor-php"
          className="mt-8 flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center"
        >
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
              <Sparkles className="h-4 w-4" />
              <span>Siap Upload ke cPanel, Laragon, XAMPP, atau VPS</span>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              Butuh Versi Website Format PHP &amp; HTML Siap Deploy?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Unduh paket lengkap berisi <code className="font-mono text-xs">index.php</code>,{' '}
              <code className="font-mono text-xs">api.php</code> (proxy cURL aman),{' '}
              <code className="font-mono text-xs">config.php</code>, dan{' '}
              <code className="font-mono text-xs">index.html</code> dengan desain ceria double-tab Mínghào &amp; Emily yang langsung jalan di hosting PHP 8+.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap"
            >
              <Code2 className="h-4 w-4" />
              <span>Pratinjau Kode PHP/HTML</span>
            </button>
            <button
              type="button"
              onClick={() => void downloadPhpDeployZip()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-700 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Paket .ZIP</span>
            </button>
          </div>
        </section>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row">
          <span>FixMate Studio · Asisten Teknisi Mínghào &amp; Admin Toko Emily</span>
          <span>Mendukung unggah foto PCB &amp; nota servis secara real-time</span>
        </footer>
      </main>

      <PhpExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
