import { useState, useCallback, useEffect, useRef } from 'react';
import { extractFile } from '../utils/extractors';
import { chunkSegments, forgetDoc } from '../utils/nlp';
import { getType, uid, countWords } from '../utils/format';
import { dbGetAll, dbPut, dbDelete, dbClear, STORES } from '../utils/db';

const MAX_BYTES = 50 * 1024 * 1024;

const persistable = d => (d.status === 'ready' ? dbPut(STORES.docs, d) : null);

export function useDocs({ onReady, onError } = {}) {
  const [docs, setDocs] = useState([]);
  const cbs = useRef({ onReady, onError });
  cbs.current = { onReady, onError };

  useEffect(() => {
    dbGetAll(STORES.docs).then(saved =>
      setDocs(saved.sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''))));
  }, []);

  const patch = useCallback((id, p, { persist = true } = {}) => {
    setDocs(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, ...(typeof p === 'function' ? p(d) : p) };
      if (persist) persistable(next);
      return next;
    }));
  }, []);

  const ingest = useCallback(async (name, size, getSegments) => {
    const id = uid('d_');
    const doc = {
      id, name, type: getType(name), size, status: 'processing', progress: 0, enabled: true,
      addedAt: new Date().toISOString(), chunks: [], words: 0, chars: 0,
    };
    setDocs(prev => [...prev, doc]);
    try {
      const { segments, meta } = await getSegments(p => patch(id, { progress: p }, { persist: false }));
      const chunks = chunkSegments(segments);
      const full = segments.map(s => s.text).join('\n\n');
      if (!full.trim()) throw new Error('No readable text found.');
      const ready = {
        ...doc, ...meta, status: 'ready', progress: 1, chunks,
        words: countWords(full), chars: full.length,
      };
      setDocs(prev => prev.map(d => (d.id === id ? { ...ready, enabled: d.enabled } : d)));
      dbPut(STORES.docs, ready);
      cbs.current.onReady?.(ready);
    } catch (err) {
      console.error(err);
      patch(id, { status: 'error', error: err.message || String(err) }, { persist: false });
      cbs.current.onError?.(name, err);
    }
  }, [patch]);

  const addFiles = useCallback(files => {
    Array.from(files).forEach(file => {
      if (file.size > MAX_BYTES) {
        cbs.current.onError?.(file.name, new Error('File is larger than 50 MB.'));
        return;
      }
      ingest(file.name, file.size, onProgress => extractFile(file, onProgress));
    });
  }, [ingest]);

  const addText = useCallback((name, text) => {
    const fname = /\.\w+$/.test(name) ? name : `${name}.txt`;
    ingest(fname, new Blob([text]).size, async () => ({ segments: [{ text }], meta: {} }));
  }, [ingest]);

  const removeDoc = useCallback(id => {
    setDocs(prev => prev.filter(d => d.id !== id));
    forgetDoc(id);
    dbDelete(STORES.docs, id);
  }, []);

  const toggleDoc = useCallback(id => patch(id, d => ({ enabled: !d.enabled })), [patch]);
  const setAllEnabled = useCallback(enabled => {
    setDocs(prev => prev.map(d => {
      const next = { ...d, enabled };
      persistable(next);
      return next;
    }));
  }, []);

  const clearDocs = useCallback(() => {
    docs.forEach(d => forgetDoc(d.id));
    setDocs([]);
    dbClear(STORES.docs);
  }, [docs]);

  return { docs, addFiles, addText, removeDoc, toggleDoc, setAllEnabled, patchDoc: patch, clearDocs };
}
