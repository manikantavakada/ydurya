'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  createdAt?: string;
}

interface PendingAction {
  name: string;
  args: Record<string, unknown>;
  summary: string;
  risk: 'write-low' | 'write-high';
}

interface ImportRowResult {
  row: number;
  name: string;
  status: 'created' | 'error';
  message?: string;
}

interface ImportSummary {
  created: number;
  failed: number;
  results: ImportRowResult[];
}

const SUGGESTED_PROMPTS = [
  "Show today's orders",
  'Which products are low in stock?',
  'Show best selling products',
  "Show this month's sales",
];

const IMPORT_EXTENSIONS = /\.(csv|xlsx|xls)$/i;

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AiChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportSummary | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/ai/history')
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json?.messages)) setMessages(json.messages);
      })
      .catch(() => {});
  }, []);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending || pendingAction) return;

    const next: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(next);
    setInput('');
    setPending(true);

    try {
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, text: m.text })) }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({ title: json?.error ?? 'The assistant could not answer that.', variant: 'error' });
        return;
      }

      if (json.pendingAction) {
        setPendingAction(json.pendingAction);
        return;
      }

      setMessages([...next, { role: 'model', text: json.text || "I don't have an answer for that." }]);
    } catch {
      toast({ title: 'Could not reach the assistant — check your connection.', variant: 'error' });
    } finally {
      setPending(false);
      scrollToBottom();
    }
  }

  async function resolveAction(confirmed: boolean) {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pendingAction.name, args: pendingAction.args, cancelled: !confirmed }),
      });
      const json = await res.json().catch(() => ({}));

      const text = !confirmed
        ? `Cancelled: ${json.summary ?? pendingAction.summary}`
        : json.ok
          ? `Done — ${json.summary}`
          : `Couldn't do it — ${json.summary} — ${json.error ?? 'unknown error'}`;
      setMessages((m) => [...m, { role: 'model', text }]);
      if (confirmed && !json.ok) toast({ title: json.error ?? 'That action failed.', variant: 'error' });
    } catch {
      toast({ title: 'Could not reach the server to confirm that action.', variant: 'error' });
    } finally {
      setActionBusy(false);
      setPendingAction(null);
      scrollToBottom();
    }
  }

  function pickFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const f of Array.from(fileList)) {
      if (IMPORT_EXTENSIONS.test(f.name)) setSheetFile(f);
      else if (/\.zip$/i.test(f.name)) setZipFile(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function previewImport() {
    if (!sheetFile) return;
    setImportBusy(true);
    setImportPreview(null);
    try {
      const form = new FormData();
      form.set('csv', sheetFile);
      if (zipFile) form.set('images', zipFile);

      const res = await fetch('/api/admin/ai/import/preview', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: json?.error?.message ?? 'Could not validate that file.', variant: 'error' });
        return;
      }
      setImportPreview(json);
    } catch {
      toast({ title: 'Could not reach the server to validate that file.', variant: 'error' });
    } finally {
      setImportBusy(false);
      scrollToBottom();
    }
  }

  async function commitImport() {
    if (!sheetFile) return;
    setImportBusy(true);
    try {
      const form = new FormData();
      form.set('csv', sheetFile);
      if (zipFile) form.set('images', zipFile);

      const res = await fetch('/api/admin/ai/import/commit', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: json?.error?.message ?? 'The import failed.', variant: 'error' });
        return;
      }
      setMessages((m) => [
        ...m,
        { role: 'user', text: `Import ${sheetFile.name}${zipFile ? ` + ${zipFile.name}` : ''}` },
        { role: 'model', text: `Imported ${json.created} product${json.created === 1 ? '' : 's'}, ${json.failed} failed.` },
      ]);
      toast({ title: `Imported ${json.created} products.`, variant: 'success' });
    } catch {
      toast({ title: 'Could not reach the server to run that import.', variant: 'error' });
    } finally {
      setImportBusy(false);
      setImportPreview(null);
      setSheetFile(null);
      setZipFile(null);
      scrollToBottom();
    }
  }

  let lastDay = '';

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-line bg-surface">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && !pendingAction && !importPreview && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm text-ink transition hover:bg-bg"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const day = m.createdAt ? dayLabel(m.createdAt) : '';
          const showDivider = day && day !== lastDay;
          if (showDivider) lastDay = day;
          return (
            <div key={i}>
              {showDivider && <p className="mb-3 text-center text-xs text-faint">{day}</p>}
              <div className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[80%] rounded-lg bg-ink px-4 py-2 text-sm text-white'
                      : 'max-w-[80%] whitespace-pre-wrap rounded-lg border border-line bg-bg px-4 py-2 text-sm text-ink'
                  }
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}

        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}

        {pendingAction && (
          <div className="max-w-[90%] space-y-3 rounded-lg border border-line bg-bg p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {pendingAction.risk === 'write-high' ? 'Confirm — bulk change' : 'Confirm this change'}
            </p>
            <p className="text-sm text-ink">{pendingAction.summary}</p>
            <div className="flex gap-2">
              <Button size="sm" loading={actionBusy} onClick={() => resolveAction(true)}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" disabled={actionBusy} onClick={() => resolveAction(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {importPreview && (
          <div className="max-w-[90%] space-y-3 rounded-lg border border-line bg-bg p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Confirm — bulk import</p>
            <p className="text-sm text-ink">
              Will create <strong>{importPreview.created}</strong> product{importPreview.created === 1 ? '' : 's'}
              {importPreview.failed > 0 && (
                <>
                  {' '}— <strong>{importPreview.failed}</strong> row{importPreview.failed === 1 ? '' : 's'} will fail
                </>
              )}
              .
            </p>
            {importPreview.failed > 0 && (
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted">
                {importPreview.results
                  .filter((r) => r.status === 'error')
                  .slice(0, 10)
                  .map((r) => (
                    <li key={r.row}>Row {r.row} ({r.name}): {r.message}</li>
                  ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={importBusy}
                disabled={importPreview.created === 0}
                onClick={commitImport}
              >
                Import {importPreview.created} product{importPreview.created === 1 ? '' : 's'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={importBusy}
                onClick={() => {
                  setImportPreview(null);
                  setSheetFile(null);
                  setZipFile(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {(sheetFile || zipFile) && !importPreview && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 pt-3">
          {sheetFile && (
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1 text-xs text-ink">
              {sheetFile.name}
              <button type="button" onClick={() => setSheetFile(null)} aria-label="Remove file">
                <X className="size-3" />
              </button>
            </span>
          )}
          {zipFile && (
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1 text-xs text-ink">
              {zipFile.name}
              <button type="button" onClick={() => setZipFile(null)} aria-label="Remove file">
                <X className="size-3" />
              </button>
            </span>
          )}
          {sheetFile && (
            <Button size="sm" variant="outline" loading={importBusy} onClick={previewImport}>
              Preview import
            </Button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-line p-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.zip"
          multiple
          className="hidden"
          onChange={(e) => pickFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Attach a product CSV/Excel sheet, optionally with a ZIP of images"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about orders, products, inventory, coupons, customers, or sales…"
          rows={1}
          className="min-h-0 flex-1 resize-none"
        />
        <Button type="submit" size="icon" loading={pending} disabled={!input.trim() || Boolean(pendingAction)}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
