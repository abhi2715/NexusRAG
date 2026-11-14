import { Zap, Upload, Search, Quote, KeyRound, Sparkles, ListChecks, Table2, GraduationCap, Lightbulb } from 'lucide-react';

const GENERIC_DOC_PROMPTS = [
  { icon: Sparkles, text: 'Summarize the key points of my documents' },
  { icon: ListChecks, text: 'List every important name, number and date mentioned' },
  { icon: GraduationCap, text: 'Create a study guide with 5 quiz questions and answers' },
  { icon: Table2, text: 'Build a table comparing the main topics covered' },
];

const GENERIC_PROMPTS = [
  { icon: Lightbulb, text: 'Explain retrieval-augmented generation in simple terms' },
  { icon: Sparkles, text: 'What kinds of documents can I analyze here?' },
];

export default function EmptyState({ hasKey, onOpenSettings, docs, onPrompt, onUpload }) {
  const docQuestions = docs.flatMap(d => (d.questions || []).slice(0, 2)).slice(0, 4);
  const prompts = docs.length
    ? [...docQuestions.map(text => ({ icon: Lightbulb, text })), ...GENERIC_DOC_PROMPTS].slice(0, 6)
    : GENERIC_PROMPTS;

  return (
    <div className="empty">
      <div className="hero-logo"><Zap size={32} /></div>
      <div>
        <div className="hero-title">Nexus<span>RAG</span></div>
        <div className="hero-sub">
          {docs.length
            ? `${docs.length} document${docs.length > 1 ? 's' : ''} ready. Ask a question and every answer comes back with clickable citations to the exact passage.`
            : 'Chat with your PDFs, Word docs, spreadsheets, Markdown and code. Upload documents, then ask questions and get answers with citations.'}
        </div>
      </div>

      {!hasKey && (
        <div className="banner">
          <KeyRound size={16} style={{ flexShrink: 0 }} />
          <span>Add your free Groq API key to start chatting.</span>
          <button className="btn btn-sm btn-primary" onClick={onOpenSettings}>Add key</button>
        </div>
      )}

      {!docs.length && (
        <div className="feature-grid">
          {[
            [Upload, 'Upload', 'PDF, DOCX, CSV, MD, JSON, HTML, code'],
            [Search, 'Retrieve', 'BM25 ranking over smart chunks'],
            [Quote, 'Cite', 'Answers link to exact pages & passages'],
          ].map(([Icon, t, d]) => (
            <button key={t} className="feature" onClick={t === 'Upload' ? onUpload : undefined} style={{ cursor: t === 'Upload' ? 'pointer' : 'default' }}>
              <div className="f-icon"><Icon size={18} /></div>
              <div className="f-t">{t}</div>
              <div className="f-d">{d}</div>
            </button>
          ))}
        </div>
      )}

      <div className="prompt-grid">
        {prompts.map(({ icon: Icon, text }) => (
          <button key={text} className="prompt-card" onClick={() => onPrompt(text)}>
            <Icon size={14} />{text}
          </button>
        ))}
      </div>
    </div>
  );
}
