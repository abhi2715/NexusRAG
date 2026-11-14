export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const fmtSz = b =>
  b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

export const fmtNum = n => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));

export const fmtTime = iso => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

export const fmtDate = iso => {
  try { return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short' }); }
  catch { return ''; }
};

export function relativeGroup(iso) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  if (days < 30) return 'Previous 30 days';
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

const CODE_EXT = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sql', 'sh', 'yaml', 'yml', 'xml', 'css', 'scss', 'toml', 'ini'];

export const extOf = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

export const getType = name => {
  const e = extOf(name);
  if (e === 'pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (e === 'csv' || e === 'tsv') return 'csv';
  if (e === 'json') return 'json';
  if (e === 'md' || e === 'markdown') return 'md';
  if (e === 'html' || e === 'htm') return 'html';
  if (CODE_EXT.includes(e)) return 'code';
  return 'txt';
};

export const ACCEPT = ['.pdf', '.docx', '.csv', '.tsv', '.txt', '.md', '.markdown', '.json', '.html', '.htm', ...CODE_EXT.map(e => '.' + e)].join(',');

export const countWords = t => (t.match(/\S+/g) || []).length;
