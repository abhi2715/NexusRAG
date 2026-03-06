function inl(t) {
  return t.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((p, i) => {
    if (/^\*\*/.test(p)) return <strong key={i} style={{ color: '#f0c97a', fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (/^`/.test(p))    return <code   key={i} style={{ background: '#1a1b2e', padding: '1px 6px', borderRadius: 4, color: '#3dd68c', fontFamily: 'monospace', fontSize: '0.82em', border: '1px solid #252840' }}>{p.slice(1, -1)}</code>;
    if (/^\*/.test(p))   return <em     key={i} style={{ color: '#7eb8f7', fontStyle: 'normal' }}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export default function MD({ text }) {
  const lines = (text || '').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const l = lines[i];
    if (/^###\s/.test(l)) {
      out.push(<h4 key={i} style={{ color: '#f0c97a', fontWeight: 700, margin: '10px 0 4px', fontSize: '0.9rem' }}>{l.slice(4)}</h4>);
      i++;
    } else if (/^##\s/.test(l)) {
      out.push(<h3 key={i} style={{ color: '#7eb8f7', fontWeight: 700, margin: '12px 0 4px' }}>{l.slice(3)}</h3>);
      i++;
    } else if (/^[-•]\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i])) {
        items.push(<li key={i} style={{ margin: '3px 0' }}>{inl(lines[i].slice(2))}</li>);
        i++;
      }
      out.push(<ul key={'ul' + i} style={{ margin: '6px 0 6px 18px' }}>{items}</ul>);
    } else if (/^\d+\.\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={{ margin: '3px 0' }}>{inl(lines[i].replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      out.push(<ol key={'ol' + i} style={{ margin: '6px 0 6px 18px' }}>{items}</ol>);
    } else if (l.trim() === '') {
      out.push(<div key={i} style={{ height: 6 }} />);
      i++;
    } else {
      out.push(<p key={i} style={{ margin: '3px 0', lineHeight: 1.7 }}>{inl(l)}</p>);
      i++;
    }
  }

  return <>{out}</>;
}
