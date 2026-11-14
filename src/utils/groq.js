const BASE = 'https://api.groq.com/openai/v1';

/**
 * With a user-supplied key, call Groq directly from the browser.
 * Without one, go through the /api/groq serverless proxy, which holds the key server-side.
 */
function target(apiKey, path) {
  if (apiKey) return { url: `${BASE}/${path}`, headers: { Authorization: `Bearer ${apiKey}` }, proxy: false };
  return { url: `/api/groq?path=${encodeURIComponent(path)}`, headers: {}, proxy: true };
}

/** Does this deployment have a server-side key? (false in `npm start`, where /api doesn't exist) */
export async function checkServerKey() {
  try {
    const res = await fetch('/api/groq?path=status', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return false;
    return !!(await res.json()).configured;
  } catch {
    return false;
  }
}

export class GroqError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function errorFrom(res, proxy) {
  let msg = `HTTP ${res.status}`;
  try {
    const data = await res.json();
    msg = data?.error?.message || msg;
  } catch { /* non-JSON body */ }
  if (res.status === 401 && !proxy) msg = 'Invalid Groq API key. Open Settings to update it.';
  if (res.status === 429) msg = `Rate limited by Groq: ${msg}`;
  return new GroqError(msg, res.status);
}

/**
 * Stream a chat completion. Calls `onToken(delta, fullText)` as tokens arrive.
 * @returns {Promise<{text: string, usage?: object, model: string}>}
 */
export async function streamChat({ apiKey, model, messages, temperature = 0.3, maxTokens = 2048, signal, onToken, onReasoning }) {
  const t = target(apiKey, 'chat/completions');
  const res = await fetch(t.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...t.headers },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true }),
    signal,
  });
  if (!res.ok) throw await errorFrom(res, t.proxy);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  let usage;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        if (json.error) throw new GroqError(json.error.message || 'Stream error');
        const d = json.choices?.[0]?.delta || {};
        if (d.reasoning) onReasoning?.(d.reasoning);
        const delta = d.content || '';
        if (delta) {
          text += delta;
          onToken?.(delta, text);
        }
        usage = json.x_groq?.usage || json.usage || usage;
      } catch (e) {
        if (e instanceof GroqError) throw e;
        /* partial / keep-alive line */
      }
    }
  }
  return { text: stripThinking(text), usage, model };
}

/** Some reasoning models emit <think>…</think>; hide it from the final answer. */
export const stripThinking = t => t.replace(/<think>[\s\S]*?<\/think>\s*/g, '').replace(/^<think>[\s\S]*$/, '');

/** Non-streaming completion that returns parsed JSON (best effort). */
export async function completeJSON({ apiKey, model, system, user, maxTokens = 400, signal }) {
  const t = target(apiKey, 'chat/completions');
  const res = await fetch(t.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...t.headers },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      // reasoning models spend tokens thinking first, so leave headroom and keep effort low
      max_tokens: maxTokens + 1200,
      ...(/gpt-oss/.test(model) ? { reasoning_effort: 'low' } : {}),
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
    signal,
  });
  if (!res.ok) throw await errorFrom(res, t.proxy);
  const data = await res.json();
  const raw = stripThinking(data.choices?.[0]?.message?.content || '{}');
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

/** List chat-capable models available to this key. */
export async function listModels(apiKey) {
  const t = target(apiKey, 'models');
  const res = await fetch(t.url, { headers: t.headers });
  if (!res.ok) throw await errorFrom(res, t.proxy);
  const data = await res.json();
  return (data.data || [])
    .filter(m => m.active !== false && !/whisper|tts|guard|playai|orpheus|distil|allam/i.test(m.id) && !(m.context_window && m.context_window < 8000))
    .map(m => ({ id: m.id, ctx: m.context_window, owner: m.owned_by }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
