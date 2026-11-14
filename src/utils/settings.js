const KEY = 'nexusrag_settings_v2';

export const DEFAULT_MODEL = process.env.REACT_APP_GROQ_MODEL || 'llama-3.3-70b-versatile';

// Shown before the live model list loads (or if it can't be fetched).
export const FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
];

export const DEFAULT_SETTINGS = {
  apiKey: '',
  model: DEFAULT_MODEL,
  temperature: 0.3,
  maxTokens: 2048,
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
