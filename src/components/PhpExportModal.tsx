import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, X } from 'lucide-react';
import {
  buildPhpDeployBundle,
  downloadPhpDeployZip,
  PhpBundleFiles,
} from '../data/phpExportGenerator';

interface PhpExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILE_TABS: Array<keyof PhpBundleFiles> = [
  'index.php',
  'api.php',
  'config.php',
  'index.html',
  'README_DEPLOY.txt',
];

export function PhpExportModal({ isOpen, onClose }: PhpExportModalProps) {
  const bundle = useMemo(() => buildPhpDeployBundle(), []);
  const [activeFile, setActiveFile] = useState<keyof PhpBundleFiles>('index.php');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopyFile = async () => {
    try {
      await navigator.clipboard.writeText(bundle[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadPhpDeployZip();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="php-export-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="php-export-title" className="font-display text-base font-bold text-slate-900">
                Paket Website PHP &amp; HTML Siap Deploy
              </h2>
              <p className="text-xs text-slate-500">
                Langsung upload ke cPanel, Laragon, XAMPP, atau VPS PHP 8+ tanpa build step.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal ekspor"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Tabs + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {FILE_TABS.map((file) => {
              const active = activeFile === file;
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => setActiveFile(file)}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {file}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyFile}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Kode Tersalin' : 'Salin Kode'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloading}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? 'Menyiapkan ZIP...' : 'Unduh Paket .ZIP'}</span>
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="custom-scrollbar flex-1 overflow-auto bg-slate-950 p-5">
          <pre className="font-mono text-xs leading-relaxed text-slate-200">
            <code>{bundle[activeFile]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
