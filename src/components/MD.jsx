import { memo, useState, Children } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check } from 'lucide-react';

function textOf(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node?.props?.children) return textOf(node.props.children);
  return '';
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const child = Children.toArray(children)[0];
  const lang = (child?.props?.className || '').match(/language-([\w-]+)/)?.[1] || 'text';
  const copy = () => {
    navigator.clipboard?.writeText(textOf(child).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="code-block">
      <div className="code-head">
        <span>{lang}</span>
        <button className="icon-btn sm" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

// Turn bare [n] / [n, m] citation markers into links we can intercept (but leave [text](url) alone).
// Only numbers that match a real source become links; anything else is left as plain text.
const linkifyCitations = (text, valid) =>
  text.replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?!\()/g, (match, nums) => {
    const ns = nums.split(/\s*,\s*/);
    return ns.every(n => valid.has(Number(n))) ? ns.map(n => `[${n}](#cite-${n})`).join('') : match;
  });

function MD({ text, onCite, cites }) {
  const components = {
    pre: CodeBlock,
    table: ({ node, ...props }) => <div className="table-wrap"><table {...props} /></div>,
    a: ({ node, href = '', children, ...props }) => {
      if (href.startsWith('#cite-')) {
        const n = Number(href.slice(6));
        return (
          <button type="button" className="cite" title={`Source ${n}`} onClick={() => onCite?.(n)}>{n}</button>
        );
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
  };
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: false }]]} components={components}>
        {onCite && cites?.size ? linkifyCitations(text || '', cites) : text || ''}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MD);
