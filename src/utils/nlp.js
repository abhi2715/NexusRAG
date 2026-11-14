// Chunking + BM25 retrieval, all client-side.

const STOP = new Set(('a an and are as at be but by for from has have he her his i if in into is it its me my of on or our she so ' +
  'than that the their them then there these they this to was we were what when where which who whom why will with you your ' +
  'do does did can could should would about also any all been being both each few how more most no nor not only other own same ' +
  'some such too very just over under again further once here up down out off between through during before after above below ' +
  'tell show give please explain describe list').split(' '));

function stem(w) {
  if (w.length <= 4) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tokenize(text) {
  const words = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'_-]*/gu) || [];
  const out = [];
  for (const w of words) {
    const clean = w.replace(/'s$/, '').replace(/['_-]+$/, '');
    if (clean.length < 2 || STOP.has(clean)) continue;
    out.push(stem(clean));
  }
  return out;
}

// ── Chunking ────────────────────────────────────────────────────────────────
function splitSentences(text) {
  // Sentences that end a line carry a trailing "\n" so line structure (code, lists, rows) survives chunking.
  const out = [];
  for (const line of text.split(/\n+/)) {
    const parts = line.split(/(?<=[.!?。])\s+/).map(s => s.trim()).filter(Boolean);
    parts.forEach((s, i) => {
      const pieces = [];
      if (s.length <= 1200) pieces.push(s);
      else for (let j = 0; j < s.length; j += 1000) pieces.push(s.slice(j, j + 1000));
      pieces.forEach((pc, k) => out.push(i === parts.length - 1 && k === pieces.length - 1 ? pc + '\n' : pc));
    });
  }
  return out;
}

const joinSentences = buf => buf.join(' ').replace(/\n /g, '\n').trim();

/**
 * Pack sentences into ~`size`-char chunks with sentence-level overlap.
 * @param {{text: string, page?: number}[]} segments
 * @returns {{text: string, page?: number}[]}
 */
export function chunkSegments(segments, size = 1000, overlap = 180) {
  const chunks = [];
  for (const seg of segments) {
    const sentences = splitSentences(seg.text);
    let buf = [];
    let len = 0;
    let fresh = false; // has buf gained sentences since the last flush?
    const flush = () => {
      if (!buf.length) return;
      fresh = false;
      chunks.push({ text: joinSentences(buf), page: seg.page });
      // carry trailing sentences forward as overlap
      const carry = [];
      let carryLen = 0;
      for (let i = buf.length - 1; i >= 0 && carryLen + buf[i].length <= overlap; i--) {
        carry.unshift(buf[i]);
        carryLen += buf[i].length;
      }
      buf = carry;
      len = carryLen;
    };
    for (const s of sentences) {
      if (len + s.length > size && len > 0) flush();
      buf.push(s);
      len += s.length + 1;
      fresh = true;
    }
    if (fresh) chunks.push({ text: joinSentences(buf), page: seg.page });
  }
  return chunks;
}

// ── BM25 index ──────────────────────────────────────────────────────────────
const tokenCache = new Map(); // doc.id -> { ref, entries }

function docEntries(doc) {
  const hit = tokenCache.get(doc.id);
  if (hit && hit.ref === doc.chunks) return hit.entries;
  const entries = doc.chunks.map((c, ci) => {
    const toks = tokenize(c.text);
    const tf = new Map();
    toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    return { doc, ci, tf, len: toks.length, lower: c.text.toLowerCase() };
  });
  tokenCache.set(doc.id, { ref: doc.chunks, entries });
  return entries;
}

export const forgetDoc = id => tokenCache.delete(id);

const SUMMARY_INTENT = /\b(summar|overview|tl;?dr|gist|main (points|ideas|themes)|key (points|takeaways|ideas)|what (is|are) (this|these|the) (doc|document|file|paper|pdf)|outline|abstract)/i;

/**
 * Rank chunks across docs with BM25 (+ phrase bonus). Falls back to an even spread
 * across each document for summary-style questions or when nothing matches.
 */
export function retrieve(query, docs, { topK = 8, prevQuery = '' } = {}) {
  if (!docs.length) return { results: [], mode: 'none' };
  const all = docs.flatMap(docEntries);
  const N = all.length;
  const avgLen = all.reduce((a, e) => a + e.len, 0) / Math.max(N, 1);

  const qWeights = new Map();
  tokenize(query).forEach(t => qWeights.set(t, 1));
  tokenize(prevQuery).forEach(t => { if (!qWeights.has(t)) qWeights.set(t, 0.35); });

  const df = new Map();
  for (const t of qWeights.keys()) {
    let n = 0;
    for (const e of all) if (e.tf.has(t)) n++;
    df.set(t, n);
  }

  const rawWords = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const phrases = [];
  for (let i = 0; i < rawWords.length - 1; i++) {
    if (!STOP.has(rawWords[i]) || !STOP.has(rawWords[i + 1])) phrases.push(rawWords[i] + ' ' + rawWords[i + 1]);
  }

  const k1 = 1.4, b = 0.75;
  const scored = [];
  for (const e of all) {
    let s = 0;
    for (const [t, w] of qWeights) {
      const f = e.tf.get(t);
      if (!f) continue;
      const n = df.get(t);
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += w * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * e.len / avgLen));
    }
    if (s > 0) {
      for (const p of phrases) if (e.lower.includes(p)) s += 0.6;
      scored.push({ e, score: s });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const wantsSummary = SUMMARY_INTENT.test(query);
  if (!scored.length || wantsSummary) {
    const spread = spreadSample(docs, topK);
    // blend in the best keyword hits too, if any
    const top = scored.slice(0, Math.ceil(topK / 3)).map(x => toResult(x.e, x.score));
    const seen = new Set(top.map(r => r.docId + ':' + r.ci));
    return { results: [...top, ...spread.filter(r => !seen.has(r.docId + ':' + r.ci))].slice(0, topK + 2), mode: 'overview' };
  }

  const best = scored[0].score;
  const results = scored
    .filter(x => x.score >= best * 0.18)
    .slice(0, topK)
    .map(x => toResult(x.e, x.score));
  return { results, mode: 'search' };
}

function toResult(e, score) {
  const c = e.doc.chunks[e.ci];
  return { docId: e.doc.id, docName: e.doc.name, docType: e.doc.type, ci: e.ci, page: c.page, text: c.text, score };
}

function spreadSample(docs, k) {
  const per = Math.max(2, Math.ceil(k / docs.length));
  const out = [];
  for (const doc of docs) {
    const n = doc.chunks.length;
    const picks = new Set();
    for (let i = 0; i < Math.min(per, n); i++) picks.add(Math.floor((i * n) / Math.min(per, n)));
    for (const ci of picks) {
      const c = doc.chunks[ci];
      out.push({ docId: doc.id, docName: doc.name, docType: doc.type, ci, page: c.page, text: c.text, score: 0 });
    }
  }
  return out;
}

/** Number the retrieved chunks and pack them into a context block within `budget` chars. */
export function buildContext(results, budget) {
  let ctx = '';
  const sources = [];
  for (const r of results) {
    const n = sources.length + 1;
    const label = `[${n}] ${r.docName}${r.page ? ` (page ${r.page})` : ''}`;
    let body = r.text;
    const remaining = budget - ctx.length - label.length - 4;
    if (remaining < 200) break;
    if (body.length > remaining) body = body.slice(0, remaining) + '…';
    ctx += `${label}\n${body}\n\n`;
    sources.push({ n, docId: r.docId, docName: r.docName, docType: r.docType, ci: r.ci, page: r.page, text: r.text, score: r.score });
  }
  return { context: ctx.trim(), sources };
}
