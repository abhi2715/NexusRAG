import { fmtTime } from './format';

export function download(filename, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeName = s => (s || 'chat').replace(/[^\w\- ]+/g, '').trim().slice(0, 60).replace(/\s+/g, '-') || 'chat';

export function sessionToMarkdown(session) {
  let md = `# ${session.title}\n\n_Exported from NexusRAG · ${new Date().toLocaleString()}_\n\n---\n\n`;
  for (const m of session.messages) {
    md += `### ${m.role === 'user' ? '🧑 You' : '⚡ NexusRAG'} · ${fmtTime(m.ts)}\n\n${m.content}\n\n`;
    if (m.sources?.length) {
      md += '**Sources**\n\n' + m.sources.map(s => `- [${s.n}] ${s.docName}${s.page ? `, p.${s.page}` : ''}`).join('\n') + '\n\n';
    }
  }
  return md;
}

export function exportSession(session, format) {
  const name = safeName(session.title);
  if (format === 'json') download(`${name}.json`, JSON.stringify(session, null, 2), 'application/json');
  else download(`${name}.md`, sessionToMarkdown(session), 'text/markdown');
}
