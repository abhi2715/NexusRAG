import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Search, Sparkles, MessageSquarePlus } from 'lucide-react';
import { useEscape } from './Modal';
import { badgeStyle, fileMeta } from '../styles/tokens';
import { fmtSz, fmtNum } from '../utils/format';
import { tokenize } from '../utils/nlp';

function highlight(text, terms) {
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

/**
 * Drawer showing a document's summary, stats and indexed passages.
 * `focus` = { ci, text } scrolls to and highlights a cited passage.
 */
export default function DocPreview({ doc, focus, onClose, onAsk, onSummarize, summarizing }) {
  const [q, setQ] = useState('');
  const bodyRef = useRef(null);
  useEscape(onClose);

  useEffect(() => {
    if (focus?.ci == null || !doc) return;
    const el = bodyRef.current?.querySelector(`[data-ci="${focus.ci}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus, doc]);

  const terms = useMemo(() => (q.trim() ? q.trim().split(/\s+/).filter(w => w.length > 1) : []), [q]);
  const chunks = useMemo(() => {
    if (!doc) return [];
    const list = doc.chunks.map((c, ci) => ({ ...c, ci }));
    if (!terms.length) return list;
    const stems = tokenize(q);
    return list.filter(c => {
      const low = c.text.toLowerCase();
      return terms.some(t => low.includes(t.toLowerCase())) || stems.some(s => low.includes(s));
    });
  }, [doc, terms, q]);

  // Source whose document has since been deleted: show the stored passage only.
  if (!doc) {
    return (
      <div className="drawer" role="dialog" aria-label="Source">
        <div className="drawer-head">
          <div style={{ flex: 1, fontWeight: 700, fontSize: '.88rem' }}>{focus?.docName || 'Source'}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="drawer-body">
          <div className="hint" style={{ fontSize: '.74rem', color: 'var(--text3)', marginBottom: 10 }}>This document is no longer in your library. Showing the passage saved with the answer.</div>
          {focus?.text ? <div className="chunk hl">{focus.text}</div> : <div className="chunk">No passage text was stored.</div>}
        </div>
      </div>
    );
  }

  const meta = fileMeta(doc.type);
  const stats = [
    doc.pages ? [doc.pages, 'Pages'] : doc.rows ? [fmtNum(doc.rows), 'Rows'] : [fmtSz(doc.size), 'Size'],
    [fmtNum(doc.words), 'Words'],
    [doc.chunks.length, 'Passages'],
    [`~${fmtNum(Math.round(doc.chars / 4))}`, 'Tokens'],
  ];

  return (
    <>
      <div className="mobile-overlay" style={{ zIndex: 449 }} onClick={onClose} />
      <div className="drawer" role="dialog" aria-label={`Preview ${doc.name}`}>
        <div className="drawer-head">
          <div className="doc-icon" style={{ ...badgeStyle(doc.type), width: 34, height: 34, fontSize: '.6rem' }}>{meta.label}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>{doc.title || doc.name}</div>
            <div style={{ fontSize: '.66rem', color: 'var(--text3)' }}>{doc.name} · added {new Date(doc.addedAt).toLocaleDateString()}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          <div className="stat-grid">
            {stats.map(([v, l]) => <div key={l} className="stat"><div className="v">{v}</div><div className="l">{l}</div></div>)}
          </div>

          {doc.summary ? (
            <div className="summary-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accent)', fontSize: '.72rem', marginBottom: 6 }}><Sparkles size={13} /> AI summary</div>
              <div style={{ color: 'var(--text)' }}>{doc.summary}</div>
              {doc.questions?.length > 0 && (
                <div className="followups" style={{ marginTop: 10 }}>
                  {doc.questions.map(qq => (
                    <button key={qq} className="followup" onClick={() => onAsk(qq)}><MessageSquarePlus size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />{qq}</button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-soft btn-block" style={{ marginBottom: 14 }} onClick={() => onSummarize(doc)} disabled={summarizing}>
              {summarizing ? <><span className="spinner" /> Summarizing…</> : <><Sparkles size={14} /> Generate summary &amp; questions</>}
            </button>
          )}

          <div className="search-box">
            <Search size={13} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search inside this document…" />
            {q && <span style={{ fontSize: '.64rem' }}>{chunks.length} hits</span>}
          </div>

          {chunks.slice(0, 300).map(c => (
            <div key={c.ci} data-ci={c.ci} className={`chunk${focus?.ci === c.ci ? ' hl' : ''}`}>
              <div className="c-head">
                <span>Passage {c.ci + 1}</span>
                {c.page && <span>Page {c.page}</span>}
                {focus?.ci === c.ci && <span style={{ color: 'var(--accent)' }}>Cited source</span>}
              </div>
              {highlight(c.text, terms)}
            </div>
          ))}
          {chunks.length > 300 && <div style={{ textAlign: 'center', fontSize: '.7rem', color: 'var(--text3)', padding: 10 }}>Showing the first 300 of {chunks.length} passages. Use search to narrow them down.</div>}
          {chunks.length === 0 && <div style={{ textAlign: 'center', fontSize: '.74rem', color: 'var(--text3)', padding: 20 }}>No passages match.</div>}
        </div>
      </div>
    </>
  );
}
