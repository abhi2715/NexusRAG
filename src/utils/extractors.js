import { getType } from './format';

let pdfjsPromise = null;
const loadPdfjs = () => {
  pdfjsPromise ||= import('pdfjs-dist').then(lib => {
    lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
    return lib;
  });
  return pdfjsPromise;
};

/**
 * Extract text from a file.
 * @returns {Promise<{segments: {text: string, page?: number}[], meta: object}>}
 *   `segments` keep page boundaries (PDF) so answers can cite page numbers.
 */
export async function extractFile(file, onProgress = () => {}) {
  const type = getType(file.name);
  switch (type) {
    case 'pdf':  return extractPDF(file, onProgress);
    case 'docx': return extractDOCX(file);
    case 'csv':  return extractCSV(file);
    case 'json': return extractJSON(file);
    case 'html': return extractHTML(file);
    default:     return { segments: [{ text: await file.text() }], meta: {} };
  }
}

// ── PDF ─────────────────────────────────────────────────────────────────────
async function extractPDF(file, onProgress) {
  const pdfjsLib = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const segments = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      text += item.str + (item.hasEOL ? '\n' : ' ');
    }
    text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (text) segments.push({ text, page: i });
    onProgress(i / pdf.numPages);
  }
  const title = (await pdf.getMetadata().catch(() => null))?.info?.Title;
  if (!segments.length) {
    throw new Error('No selectable text found. This PDF looks scanned (image-only); run OCR on it first.');
  }
  return { segments, meta: { pages: pdf.numPages, title: title || undefined } };
}

// ── DOCX (via mammoth, the file is a zip so raw regex scanning doesn't work) ──
async function extractDOCX(file) {
  const { default: mammoth } = await import('mammoth/mammoth.browser.min');
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  const text = value.replace(/\n{3,}/g, '\n\n').trim();
  if (!text) throw new Error('No text found in this Word document.');
  return { segments: [{ text }], meta: {} };
}

// ── CSV / TSV ───────────────────────────────────────────────────────────────
export function parseCSV(raw) {
  const firstLine = raw.slice(0, raw.indexOf('\n') > -1 ? raw.indexOf('\n') : raw.length);
  const delim = [',', '\t', ';', '|']
    .map(d => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (q) {
      if (ch === '"' && raw[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur.trim()); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      row.push(cur.trim()); cur = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const MAX_CSV_ROWS = 5000;

async function extractCSV(file) {
  const all = parseCSV(await file.text());
  if (!all.length) throw new Error('Empty CSV file.');
  const headers = all[0].map((h, i) => h || `col${i + 1}`);
  const rows = all.slice(1);

  let summary = `Table "${file.name}" with ${rows.length} rows and ${headers.length} columns.\nColumns: ${headers.join(', ')}\n\nColumn statistics:\n`;
  headers.forEach((h, hi) => {
    const vals = rows.map(r => r[hi] ?? '').filter(v => v !== '');
    const nums = vals.map(v => Number(v.replace(/[$,%\s]/g, ''))).filter(v => !Number.isNaN(v));
    if (vals.length && nums.length >= vals.length * 0.8) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const sorted = [...nums].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      summary += `- ${h} (numeric): count=${nums.length}, sum=${+sum.toFixed(4)}, min=${sorted[0]}, max=${sorted[sorted.length - 1]}, mean=${(sum / nums.length).toFixed(3)}, median=${median}\n`;
    } else {
      const counts = {};
      vals.forEach(v => (counts[v] = (counts[v] || 0) + 1));
      const distinct = Object.keys(counts).length;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      summary += `- ${h} (text): ${distinct} distinct values` +
        (distinct < vals.length ? `; most common: ${top.map(([v, c]) => `${v} (${c})`).join(', ')}` : '') + '\n';
    }
  });

  // Row-wise "key: value" lines retrieve far better than raw delimited rows.
  const rowLines = rows.slice(0, MAX_CSV_ROWS).map((r, i) =>
    `Row ${i + 1}: ` + headers.map((h, hi) => `${h}: ${r[hi] ?? ''}`).join('; '));
  if (rows.length > MAX_CSV_ROWS) rowLines.push(`… ${rows.length - MAX_CSV_ROWS} more rows not indexed.`);

  return {
    segments: [{ text: summary }, { text: rowLines.join('\n') }],
    meta: { rows: rows.length, columns: headers.length },
  };
}

// ── JSON / HTML ─────────────────────────────────────────────────────────────
async function extractJSON(file) {
  const raw = await file.text();
  try {
    return { segments: [{ text: JSON.stringify(JSON.parse(raw), null, 2) }], meta: {} };
  } catch {
    return { segments: [{ text: raw }], meta: {} };
  }
}

async function extractHTML(file) {
  const doc = new DOMParser().parseFromString(await file.text(), 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach(n => n.remove());
  const text = (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  return { segments: [{ text }], meta: { title: doc.title || undefined } };
}
