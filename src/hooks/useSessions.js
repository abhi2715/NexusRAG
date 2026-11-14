import { useState, useCallback, useEffect, useMemo } from 'react';
import { dbGetAll, dbPut, dbDelete, dbClear, STORES } from '../utils/db';
import { uid } from '../utils/format';

const LEGACY_KEY = 'nexusrag_sessions_v1';

const sortSessions = list =>
  [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

/** One-time migration of v1 sessions from localStorage into IndexedDB. */
function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const old = JSON.parse(raw);
    localStorage.removeItem(LEGACY_KEY);
    return old.map(s => ({
      id: s.id,
      title: s.title || 'Imported chat',
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.createdAt || new Date().toISOString(),
      pinned: false,
      messages: (s.messages || []).map(m => ({
        id: uid('m_'),
        role: m.role,
        content: m.content,
        ts: m.ts,
        sources: (m.sources || []).map((src, i) => ({ n: i + 1, docName: src.name, docType: src.type })),
      })),
    }));
  } catch {
    return [];
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      let saved = await dbGetAll(STORES.sessions);
      const legacy = migrateLegacy();
      if (legacy.length) {
        await Promise.all(legacy.map(s => dbPut(STORES.sessions, s)));
        saved = [...saved, ...legacy];
      }
      const sorted = sortSessions(saved);
      setSessions(sorted);
      setActiveId(sorted.find(s => !s.pinned)?.id ?? sorted[0]?.id ?? null);
      setLoaded(true);
    })();
  }, []);

  const createSession = useCallback((title = 'New chat') => {
    const now = new Date().toISOString();
    const s = { id: uid('s_'), title, messages: [], createdAt: now, updatedAt: now, pinned: false };
    setSessions(prev => sortSessions([s, ...prev]));
    setActiveId(s.id);
    dbPut(STORES.sessions, s);
    return s.id;
  }, []);

  /** Apply `fn` to a session. `touch` bumps updatedAt (new message), which reorders the list. */
  const updateSession = useCallback((id, fn, { touch = true } = {}) => {
    setSessions(prev => {
      let changed = null;
      const next = prev.map(s => {
        if (s.id !== id) return s;
        changed = { ...fn(s), ...(touch ? { updatedAt: new Date().toISOString() } : {}) };
        return changed;
      });
      if (changed) dbPut(STORES.sessions, changed);
      return touch ? sortSessions(next) : next;
    });
  }, []);

  const deleteSession = useCallback(id => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      setActiveId(a => (a === id ? next[0]?.id ?? null : a));
      return next;
    });
    dbDelete(STORES.sessions, id);
  }, []);

  const importSessions = useCallback(list => {
    const now = new Date().toISOString();
    const fresh = list.map(s => ({ ...s, id: uid('s_'), updatedAt: s.updatedAt || now, createdAt: s.createdAt || now }));
    fresh.forEach(s => dbPut(STORES.sessions, s));
    setSessions(prev => sortSessions([...fresh, ...prev]));
    return fresh.length;
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
    setActiveId(null);
    dbClear(STORES.sessions);
  }, []);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeId) || null, [sessions, activeId]);

  return { sessions, loaded, activeId, setActiveId, activeSession, createSession, updateSession, deleteSession, importSessions, clearSessions };
}
