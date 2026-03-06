import * as pdfjsLib from 'pdfjs-dist';

export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') return file.text();
  if (ext === 'csv') return extractCSV(file);
  if (ext === 'pdf') return extractPDF(file);
  if (ext === 'docx' || ext === 'doc') return extractDOCX(file);
  return file.text();
}

async function extractCSV(file) {
  const raw = await file.text();
  const lines = raw.trim().split('\n').filter(Boolean);
  if (!lines.length) return '';

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = lines.slice(1).map(l => {
    const vals = []; let cur = '', q = false;
    for (const ch of l) {
      if (ch === '"') { q = !q; }
      else if (ch === ',' && !q) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return vals;
  });

  let out = `CSV: ${file.name}\nRows: ${rows.length} | Columns: ${headers.join(', ')}\n\n`;

  // Numeric stats
  headers.forEach((h, hi) => {
    const nums = rows.map(r => parseFloat(r[hi])).filter(v => !isNaN(v));
    if (nums.length > rows.length * 0.3) {
      const avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
      out += `${h}: min=${Math.min(...nums)}, max=${Math.max(...nums)}, avg=${avg}\n`;
    }
  });

  // Categorical stats
  headers.forEach((h, hi) => {
    const vals = rows.map(r => r[hi] || '').filter(Boolean);
    const counts = {};
    vals.forEach(v => (counts[v] = (counts[v] || 0) + 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length > 1 && top.length < vals.length)
      out += `${h}: ${top.map(([v, c]) => `${v}(${c})`).join(', ')}\n`;
  });

  out += '\nDATA:\n' + headers.join('\t') + '\n';
  rows.slice(0, 80).forEach(r => (out += r.join('\t') + '\n'));
  return out;
}

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('FileReader failed'));
    r.readAsDataURL(file);
  });
}

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

async function extractPDF(file) {
  const b64 = await fileToBase64(file);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let extractedText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    extractedText = extractedText.replace(/\s+/g, ' ').trim();

    return {
      type: 'pdf_b64',
      b64,
      name: file.name,
      extractedText: extractedText.length > 10 ? extractedText : ''
    };
  } catch (err) {
    console.error("PDF extraction error:", err);
    return { type: 'pdf_b64', b64, name: file.name, extractedText: '' };
  }
}

async function extractDOCX(file) {
  try {
    const buf = await file.arrayBuffer();
    const arr = new Uint8Array(buf);
    let str = '';
    for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);

    const texts = [];
    const re = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      const t = m[1].trim();
      if (t) texts.push(t);
    }
    const text = texts.join(' ').replace(/\s+/g, ' ').trim();
    return text.length > 50
      ? `DOCX: ${file.name}\n\n${text}`
      : `DOCX: ${file.name}\n[No text found]`;
  } catch (e) {
    return `DOCX: ${file.name}\n[Error: ${e.message}]`;
  }
}
