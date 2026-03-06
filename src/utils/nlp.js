export function chunkText(text, size = 1000, overlap = 150) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= size) return [clean];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    chunks.push(clean.slice(start, Math.min(start + size, clean.length)));
    start += size - overlap;
  }
  return chunks;
}

export function retrieveChunks(query, docs, topK = 6) {
  const stop = new Set(['the','a','an','is','are','was','were','in','on','at','to','for','of','and','or','it','this','that','with','be','as','by','from']);
  const qWords = query.toLowerCase().match(/\b\w{3,}\b/g)?.filter(w => !stop.has(w)) || [];
  const scored = [];

  docs.forEach(doc => {
    doc.chunks.forEach((chunk, ci) => {
      const cl = chunk.toLowerCase();
      let s = 0;
      qWords.forEach(w => { if (cl.includes(w)) s += 1; });
      for (let i = 0; i < qWords.length - 1; i++) {
        if (cl.includes(qWords[i] + ' ' + qWords[i + 1])) s += 2;
      }
      if (s > 0) scored.push({ chunk, docName: doc.name, docType: doc.type, score: s, ci });
    });
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
