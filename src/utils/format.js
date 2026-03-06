export const fmtSz = b =>
  b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'KB' : (b / 1048576).toFixed(1) + 'MB';

export const fmtTime = iso => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

export const fmtDate = iso => {
  try { return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short' }); }
  catch { return ''; }
};

export const getType = name => {
  const e = name.split('.').pop().toLowerCase();
  if (e === 'pdf') return 'pdf';
  if (['docx', 'doc'].includes(e)) return 'docx';
  if (e === 'csv') return 'csv';
  return 'txt';
};
