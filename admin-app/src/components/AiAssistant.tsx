import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Send, X, RotateCcw, AlertCircle } from 'lucide-react';
import { getAiStatus, sendAiChat } from '../api/client';
import type { AiMessage } from '../api/client';

type Msg = AiMessage & { error?: boolean };

const STORE_KEY = 'gr_ai_chat_v1';
const MAX_CHARS = 4000;
const SUGGESTIONS = [
  'How are we doing today?',
  'Which withdrawals are pending?',
  'Which drivers are waiting for approval?',
  'Show revenue for the last 7 days',
  'Are there any open safety alerts?',
];

const loadChat = (): Msg[] => {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-30) : [];
  } catch { return []; }
};
const saveChat = (m: Msg[]) => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(m.slice(-30))); } catch { /* private mode */ } };

// ── tiny, safe markdown: bold, `code`, lists and tables. Everything is rendered as React text, never as HTML ──
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok.startsWith('**')
      ? <strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>
      : <code key={`${key}-${i++}`} style={st.code}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) {                       // table
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push(
        <div key={k++} style={{ overflowX: 'auto', margin: '6px 0' }}>
          <table style={st.table}><tbody>{rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => ri === 0
              ? <th key={ci} style={st.th}>{inline(c, `t${ri}${ci}`)}</th>
              : <td key={ci} style={st.td}>{inline(c, `t${ri}${ci}`)}</td>)}</tr>
          ))}</tbody></table>
        </div>);
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {                // list
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, '')); i++; }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(<Tag key={k++} style={st.list}>{items.map((it, n) => <li key={n}>{inline(it, `l${k}${n}`)}</li>)}</Tag>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*\|.*\|\s*$/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { para.push(lines[i].replace(/^#{1,6}\s+/, '')); i++; }
    blocks.push(<p key={k++} style={st.p}>{inline(para.join(' '), `p${k}`)}</p>);
  }
  return <>{blocks}</>;
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { saveChat(msgs); }, [msgs]);
  useEffect(() => {
    if (!open) return;
    getAiStatus().then(setStatus).catch(() => setStatus({ configured: false, model: '' }));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy, open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = async (text: string) => {
    const q = text.trim().slice(0, MAX_CHARS);
    if (!q || busy) return;
    // errors are shown in the chat but never sent back to the assistant
    const history: AiMessage[] = [...msgs.filter((m) => !m.error), { role: 'user', content: q }];
    setMsgs([...msgs, { role: 'user', content: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await sendAiChat(history.slice(-20));
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply }]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : err?.code === 'ECONNABORTED' ? 'That took too long. Please try a simpler question.' : 'Could not reach the assistant. Check your connection and try again.';
      setMsgs((m) => [...m, { role: 'assistant', content: msg, error: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const clear = () => { if (!busy) { setMsgs([]); setInput(''); } };
  const off = status && !status.configured;

  return createPortal(
    <>
      {!open && (
        <button id="ai-open" aria-label="Open the AI assistant" title="Ask the AI assistant" style={st.fab} onClick={() => setOpen(true)}>
          <Sparkles size={22} />
        </button>
      )}
      {open && (
        <section id="ai-panel" role="dialog" aria-label="AI assistant" style={st.panel}>
          <header style={st.header}>
            <div style={st.title}><Sparkles size={18} /> <span>Ask Golden Ride</span></div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={st.iconBtn} onClick={clear} disabled={busy || msgs.length === 0} aria-label="Start a new chat" title="New chat"><RotateCcw size={16} /></button>
              <button style={st.iconBtn} onClick={() => setOpen(false)} aria-label="Close" title="Close"><X size={18} /></button>
            </div>
          </header>

          <div style={st.body}>
            {off && (
              <div style={st.notice}><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>The AI assistant is not switched on yet. Ask your developer to add an AI API key on the server (a free Google Gemini or Groq key works).</span></div>
            )}
            {msgs.length === 0 && !off && (
              <div>
                <p style={{ ...st.p, color: 'var(--text-secondary)' }}>I can look up rides, drivers, riders, earnings, withdrawals and safety alerts. I can only read data, so I will never change anything.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {SUGGESTIONS.map((s) => <button key={s} style={st.chip} onClick={() => ask(s)} disabled={busy}>{s}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <div style={m.role === 'user' ? st.me : m.error ? st.err : st.bot}>
                  {m.role === 'user' ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span> : <Markdown text={m.content} />}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', marginBottom: 10 }}>
                <div style={st.bot}><span style={st.dots} aria-live="polite">Looking up your data…</span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form style={st.form} onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <textarea
              ref={inputRef} id="ai-input" rows={1} value={input} maxLength={MAX_CHARS} disabled={busy || !!off}
              placeholder={off ? 'Assistant is not set up yet' : 'Ask about rides, drivers, money…'}
              style={st.input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            />
            <button type="submit" id="ai-send" aria-label="Send" style={{ ...st.send, opacity: !input.trim() || busy || off ? 0.5 : 1 }} disabled={!input.trim() || busy || !!off}><Send size={18} /></button>
          </form>
          <div style={st.foot}>AI can make mistakes. Check important numbers on the pages.</div>
        </section>
      )}
    </>,
    document.body
  );
}

const st: Record<string, React.CSSProperties> = {
  fab: { position: 'fixed', right: 20, bottom: 20, zIndex: 150, width: 54, height: 54, borderRadius: 27, border: 'none', cursor: 'pointer', color: '#fff', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 10px 24px -6px rgba(79,70,229,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel: { position: 'fixed', right: 16, bottom: 16, zIndex: 150, width: 'min(420px, calc(100vw - 32px))', height: 'min(640px, calc(100vh - 32px))', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 18, boxShadow: '0 24px 60px -12px rgba(15,23,42,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', color: '#fff', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
  title: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 },
  iconBtn: { background: 'rgba(255,255,255,.16)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, overflowY: 'auto', padding: 14 },
  notice: { display: 'flex', gap: 8, padding: 12, borderRadius: 12, background: '#fef3c7', color: '#92400e', fontSize: 13, lineHeight: 1.4 },
  chip: { textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13.5 },
  me: { maxWidth: '85%', background: '#4f46e5', color: '#fff', padding: '8px 12px', borderRadius: '14px 14px 4px 14px', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word' },
  bot: { maxWidth: '92%', background: 'var(--bg-surface-hover)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word' },
  err: { maxWidth: '92%', background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.45 },
  p: { margin: '0 0 6px' },
  list: { margin: '2px 0 8px', paddingLeft: 20 },
  code: { background: 'rgba(100,116,139,.18)', padding: '1px 5px', borderRadius: 5, fontSize: 12.5 },
  table: { borderCollapse: 'collapse', fontSize: 12.5, width: '100%' },
  th: { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, whiteSpace: 'nowrap' },
  td: { padding: '4px 8px', borderBottom: '1px solid var(--border-light)', verticalAlign: 'top' },
  dots: { color: 'var(--text-muted)', fontStyle: 'italic' },
  form: { display: 'flex', gap: 8, padding: '10px 12px 6px', borderTop: '1px solid var(--border-color)', alignItems: 'flex-end' },
  input: { flex: 1, resize: 'none', maxHeight: 110, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  send: { width: 40, height: 40, borderRadius: 12, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  foot: { textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '0 12px 8px' },
};
