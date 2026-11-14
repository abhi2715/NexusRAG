import { useRef, useState, useLayoutEffect } from 'react';
import { ArrowUp, Square, Paperclip, Mic, MicOff, ChevronDown, Cpu, Check, FileText } from 'lucide-react';
import Menu from './Menu';
import { useSpeechInput } from '../hooks/useSpeech';
import { ACCEPT } from '../utils/format';

export default function Composer({
  value, setValue, onSend, onStop, busy, inputRef, activeDocCount,
  model, models, onModelChange, onFiles, sendOnEnter, isMobile, toast,
}) {
  const fileRef = useRef(null);
  const baseRef = useRef('');
  const [modelOpen, setModelOpen] = useState(false);

  const speech = useSpeechInput((finalText, interim) => {
    const sep = baseRef.current && !/\s$/.test(baseRef.current) ? ' ' : '';
    setValue(baseRef.current + sep + finalText + interim);
  });

  // auto-grow
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value, inputRef]);

  const toggleMic = () => {
    if (speech.listening) return speech.stop();
    baseRef.current = value;
    if (!speech.start()) toast?.('Voice input is not supported in this browser.', 'error');
  };

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      const send = sendOnEnter ? !e.shiftKey : (e.metaKey || e.ctrlKey);
      if (send) {
        e.preventDefault();
        if (speech.listening) speech.stop();
        if (!busy) onSend();
      }
    }
  };

  const onPaste = e => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      e.preventDefault();
      onFiles(files);
    }
  };

  const canSend = value.trim().length > 0 && !busy;

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          placeholder={speech.listening ? 'Listening…' : activeDocCount > 0
            ? `Ask anything about your ${activeDocCount} document${activeDocCount > 1 ? 's' : ''}…`
            : 'Ask anything, or attach a document…'}
          aria-label="Message"
        />
        <div className="composer-bar">
          <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
          <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Attach documents"><Paperclip size={16} /></button>
          {speech.supported && (
            <button className={`icon-btn${speech.listening ? ' mic-on' : ''}`} onClick={toggleMic} title={speech.listening ? 'Stop dictation' : 'Voice input'}>
              {speech.listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <button className="model-pill" onClick={() => setModelOpen(o => !o)} title="Choose model">
              <Cpu size={12} /><span>{model.split('/').pop()}</span><ChevronDown size={12} />
            </button>
            <Menu open={modelOpen} onClose={() => setModelOpen(false)} placement="top-start" style={{ maxHeight: 320, overflowY: 'auto', minWidth: 260 }}>
              <div className="menu-label">Model</div>
              {models.map(m => (
                <button key={m.id} className={`menu-item${m.id === model ? ' on' : ''}`} onClick={() => { onModelChange(m.id); setModelOpen(false); }}>
                  {m.id === model ? <Check size={13} /> : <span style={{ width: 13 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.id}</span>
                  {m.ctx && <span className="mi-sub">{Math.round(m.ctx / 1024)}k</span>}
                </button>
              ))}
            </Menu>
          </div>
          {activeDocCount > 0 && !isMobile && (
            <span className="chip" style={{ marginLeft: 4 }}><FileText size={11} />{activeDocCount} active</span>
          )}
          <div className="spacer" />
          {value.length > 200 && <span className="char-count">{value.length.toLocaleString()}</span>}
          {busy ? (
            <button className="send-btn stop" onClick={onStop} title="Stop generating (Esc)"><Square size={13} fill="currentColor" /></button>
          ) : (
            <button className="send-btn" onClick={onSend} disabled={!canSend} title="Send"><ArrowUp size={17} strokeWidth={2.5} /></button>
          )}
        </div>
      </div>
      {!isMobile && (
        <div className="composer-hint">
          <span><span className="kbd">{sendOnEnter ? 'Enter' : '⌘ Enter'}</span> send</span>
          <span><span className="kbd">Shift</span>+<span className="kbd">Enter</span> newline</span>
          <span><span className="kbd">⌘ K</span> commands</span>
          <span>Answers can be wrong. Check the cited sources.</span>
        </div>
      )}
    </div>
  );
}
