const KEY = 'nexusrag_sessions_v1';

export function saveSessions(sessions) {
  try {
    const toSave = sessions
      .slice(0, 30)
      .map(s => ({ ...s, messages: s.messages.slice(-40) }));
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('saveSessions failed:', e);
  }
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
