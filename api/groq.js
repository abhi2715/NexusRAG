// Vercel Edge Function: proxies Groq so the API key stays server-side.
// Set GROQ_API_KEY (no REACT_APP_ prefix!) in Vercel → Project → Settings → Environment Variables.
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://api.groq.com/openai/v1/';
const ALLOWED = new Set(['chat/completions', 'models']);
const MAX_TOKENS = 8192;
const MAX_BODY = 500_000; // bytes

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';
  const key = process.env.GROQ_API_KEY;

  if (path === 'status') return json({ configured: !!key });
  if (!ALLOWED.has(path)) return json({ error: { message: 'Not found' } }, 404);
  if (!key) return json({ error: { message: 'This deployment has no GROQ_API_KEY configured. Add your own key in Settings.' } }, 401);

  // Only accept browser calls from this site (blocks other websites from using your key).
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: { message: 'Forbidden origin' } }, 403);

  let body;
  if (path === 'chat/completions') {
    if (req.method !== 'POST') return json({ error: { message: 'Method not allowed' } }, 405);
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: { message: 'Request too large' } }, 413);
    let parsed;
    try { parsed = JSON.parse(text); } catch { return json({ error: { message: 'Invalid JSON' } }, 400); }
    parsed.max_tokens = Math.min(Number(parsed.max_tokens) || 1024, MAX_TOKENS);
    body = JSON.stringify(parsed);
  }

  const upstream = await fetch(UPSTREAM + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body,
    signal: req.signal,
  });

  // Pass the (possibly streaming) body straight through.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
  });
}
