// File-type presentation metadata. Colors are fixed hues that read well in both themes.
export const FILE_TYPES = {
  pdf:  { label: 'PDF',  color: '#f7783c' },
  docx: { label: 'DOC',  color: '#5b8ef5' },
  csv:  { label: 'CSV',  color: '#34d27e' },
  json: { label: 'JSON', color: '#e0af68' },
  md:   { label: 'MD',   color: '#a066ff' },
  html: { label: 'HTML', color: '#f05591' },
  code: { label: 'CODE', color: '#22c3c3' },
  txt:  { label: 'TXT',  color: '#8a90b0' },
};

export const fileMeta = type => FILE_TYPES[type] || FILE_TYPES.txt;

/** Background/border/text style for a file-type badge. */
export const badgeStyle = type => {
  const { color } = fileMeta(type);
  return { background: color + '1f', border: `1px solid ${color}55`, color };
};
