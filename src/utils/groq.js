const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || "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";
const GROQ_MODEL = process.env.REACT_APP_GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Send a chat completion request to Groq.
 * @param {string} system  - System prompt
 * @param {Array}  history - Prior messages [{role, content}]
 * @param {string} userText - Current user message
 * @returns {Promise<string>} AI response text
 */
export async function groqChat(system, history, userText) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: userText },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content?.trim() || 'No response.';
}
