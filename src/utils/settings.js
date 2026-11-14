const KEY = 'nexusrag_settings_v2';

export const DEFAULT_MODEL = process.env.REACT_APP_GROQ_MODEL || 'openai/gpt-oss-120b';

// Best-first preference when the saved model isn't offered by the account anymore.
export const PREFERRED_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'];

// Shown before the live model list loads (or if it can't be fetched).
export const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

/** Pick a model the account actually has: keep `current` if listed, else the best preferred one. */
export function pickModel(current, available) {
  const ids = available.map(m => m.id);
  if (ids.includes(current)) return current;
  return PREFERRED_MODELS.find(id => ids.includes(id)) || ids[0] || current;
}

export const DEFAULT_SETTINGS = {
  apiKey: '',
  model: DEFAULT_MODEL,
  temperature: 0.3,
  maxTokens: 4096,
  topK: 8,
  contextChars: 14000,
  historyTurns: 6,
  systemPrompt: '',
  theme: 'dark',          // 'dark' | 'light' | 'system'
  customCursor: true,
  followUps: true,
  autoSummarize: true,
  sendOnEnter: true,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota / private mode */ }
}

/** The key the user entered in Settings. When empty, requests go through the server proxy (if configured). */
export const effectiveApiKey = s => (s.apiKey || '').trim();
