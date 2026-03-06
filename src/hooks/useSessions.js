import { useState, useCallback, useEffect } from 'react';
import { saveSessions, loadSessions } from '../utils/storage';

export function useSessions() {
  const [sessions, setSessions]   = useState([]);
  const [activeId, setActiveId]   = useState(null);

  useEffect(() => {
    const saved = loadSessions();
    if (saved.length > 0) {
      setSessions(saved);
      setActiveId(saved[0].id);
    }
  }, []);

  const _update = useCallback((updater) => {
    setSessions(prev => {
      const next = updater(prev);
      saveSessions(next);
      return next;
    });
  }, []);

  const newSession = useCallback((title = 'New Chat') => {
    const s = {
      id: 's_' + Date.now(),
      title,
      messages: [],
      docIds: [],
      createdAt: new Date().toISOString(),
    };
    _update(prev => [s, ...prev]);
    setActiveId(s.id);
    return s.id;
  }, [_update]);

  const updateSession = useCallback((id, updater) => {
    _update(prev => prev.map(s => s.id === id ? updater(s) : s));
  }, [_update]);

  const deleteSession = useCallback((id) => {
    _update(prev => prev.filter(s => s.id !== id));
    setActiveId(prev => {
      if (prev !== id) return prev;
      const rem = sessions.filter(s => s.id !== id);
      return rem[0]?.id || null;
    });
  }, [_update, sessions]);

  const activeSession = sessions.find(s => s.id === activeId) || null;

  return { sessions, activeId, setActiveId, activeSession, newSession, updateSession, deleteSession };
}
