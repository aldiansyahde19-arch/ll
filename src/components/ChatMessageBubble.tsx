import React, { useState } from 'react';
import { Check, Copy, Cpu, MessageSquareText } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  imagePreview?: string;
  attachedTag?: string;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  persona: 'minghao' | 'emily';
  avatarUrl: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function CopyableBlock({
  content,
  variant,
}: {
  content: string;
  variant: 'salinan' | 'diagram';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored safely
    }
  };

  if (variant === 'salinan') {
    return (
      <div className="my-2.5 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/70">
        <div className="flex items-center justify-between border-b border-orange-200/80 bg-orange-100/60 px-3.5 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-900">
            <MessageSquareText className="h-3.5 w-3.5 text-orange-600" />
            <span>Chat Salinan Siap Kirim</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-xs transition-colors hover:bg-orange-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Chat</span>
              </>
            )}
          </button>
        </div>
        <div className="whitespace-pre-wrap px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-800">
          {content.trim()}
        </div>
      </div>
    );
  }

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-teal-300">
          <Cpu className="h-3.5 w-3.5" />
          <span>Diagram Jalur & Catatan Teknis</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[30px] items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-teal-400" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-xs leading-relaxed text-teal-200">
        {content.trim()}
      </pre>
    </div>
  );
}

function FormattedMessageBody({ text }: { text: string }) {
  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-[14.5px] leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const inner = segment.slice(3, -3);
          const firstNewLine = inner.indexOf('\n');
          const lang = firstNewLine > -1 ? inner.slice(0, firstNewLine).trim().toLowerCase() : '';
          const body = firstNewLine > -1 ? inner.slice(firstNewLine + 1) : inner;
          const variant = lang === 'salinan' || lang === 'whatsapp' || lang === 'wa' ? 'salinan' : 'diagram';
          return <CopyableBlock key={index} content={body} variant={variant} />;
        }

        const lines = segment.split('\n').filter((line, i, arr) => {
          if (line.trim() === '' && (i === 0 || i === arr.length - 1)) return false;
          return true;
        });

        return (
          <div key={index} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lineIdx} className="h-1" />;
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lineIdx} className="pt-1 font-display text-[14.5px] font-bold text-slate-900">
                    {renderInlineFormatting(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} className="pt-1.5 font-display text-[15.5px] font-bold text-slate-900">
                    {renderInlineFormatting(trimmed.slice(3))}
                  </h3>
                );
              }
              if (/^\d+\.\s+/.test(trimmed)) {
                const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
                if (match) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-1">
                      <span className="mt-0.5 min-w-[20px] font-mono text-xs font-semibold text-slate-500">
                        {match[1]}
                      </span>
                      <span className="flex-1">{renderInlineFormatting(match[2])}</span>
                    </div>
                  );
                }
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</span>
                  </div>
                );
              }
              return <p key={lineIdx}>{renderInlineFormatting(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ChatMessageBubble({ message, persona, avatarUrl }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isMinghao = persona === 'minghao';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%]">
          {message.attachedTag && (
            <div className="mb-1 text-right text-xs font-medium text-slate-500">
              {message.attachedTag}
            </div>
          )}
          <div
            className={`rounded-2xl rounded-br-sm px-4 py-3 text-[14.5px] leading-relaxed text-white shadow-xs ${
              isMinghao ? 'bg-teal-600' : 'bg-orange-600'
            }`}
          >
            {message.imagePreview && (
              <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20 bg-black/10">
                <img
                  src={message.imagePreview}
                  alt="Lampiran perangkat atau nota"
                  referrerPolicy="no-referrer"
                  className="max-h-56 w-full object-cover"
                />
              </div>
            )}
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
          <div className="mt-1 text-right font-mono text-[11px] text-slate-400">
            Anda · {message.timestamp}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <img
          src={avatarUrl}
          alt={isMinghao ? 'Mínghào' : 'Emily'}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 max-w-[88%] flex-1 sm:max-w-[82%]">
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-display font-bold text-slate-900">
            {isMinghao ? 'Mínghào' : 'Emily'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{isMinghao ? 'Master Teknisi Hardware' : 'Master Admin Toko'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[11px]">{message.timestamp}</span>
        </div>
        <div
          className={`rounded-2xl rounded-tl-sm border px-4 py-3.5 text-slate-700 ${
            isMinghao
              ? 'border-teal-100 bg-white shadow-xs'
              : 'border-orange-100 bg-white shadow-xs'
          }`}
        >
          <FormattedMessageBody text={message.text} />
        </div>
      </div>
    </div>
  );
}
