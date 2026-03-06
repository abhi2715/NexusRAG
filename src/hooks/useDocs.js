import { useState, useCallback } from 'react';
import { extractText } from '../utils/extractors';
import { chunkText }   from '../utils/nlp';
import { getType, fmtSz } from '../utils/format';

export function useDocs() {
  const [docs, setDocs]           = useState([]);
  const [processing, setProcessing] = useState('');
  const [dragging, setDragging]   = useState(false);

  const processFile = useCallback(async (file) => {
    if (file.size > 30 * 1024 * 1024) { alert('Max file size is 30MB'); return; }

    const type = getType(file.name);
    const id   = 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const doc  = { id, name: file.name, type, size: fmtSz(file.size), content: '', chunks: [], status: 'processing' };

    setDocs(prev => [...prev, doc]);
    setProcessing(`Reading ${file.name}…`);

    try {
      const result = await extractText(file);
      setProcessing(`Indexing ${file.name}…`);
      await new Promise(r => setTimeout(r, 10));

      if (result && typeof result === 'object' && result.b64) {
        // PDF — store b64 + extracted text
        const pdfText  = result.extractedText || '';
        const pdfChunks = pdfText.length > 50
          ? chunkText(pdfText)
          : [`[PDF: ${result.name}]`];
        setDocs(prev => prev.map(d =>
          d.id === id
            ? { ...d, b64: result.b64, content: pdfText || '[PDF binary]', chunks: pdfChunks, status: 'ready' }
            : d
        ));
      } else {
        const text   = String(result || '');
        const chunks = chunkText(text);
        setDocs(prev => prev.map(d => d.id === id ? { ...d, content: text, chunks, status: 'ready' } : d));
      }
    } catch (err) {
      console.error(err);
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'error' } : d));
    }
    setProcessing('');
  }, []);

  const handleFiles = useCallback((files) => {
    Array.from(files).forEach(processFile);
  }, [processFile]);

  const removeDoc = useCallback((id) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  return { docs, processing, dragging, setDragging, handleFiles, removeDoc };
}
