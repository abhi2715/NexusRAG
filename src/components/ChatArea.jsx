import { useRef, useState, useEffect, useCallback } from 'react';
import { Menu as MenuIcon, PanelLeft, Download, Settings, Sun, Moon, MoreHorizontal, FileText, FileJson, Trash2, Pencil, Pin, PinOff, ArrowDown, Command } from 'lucide-react';
import MsgBubble from './MsgBubble';
import Composer from './Composer';
import EmptyState from './EmptyState';
import Menu, { MenuItem } from './Menu';

export default function ChatArea({
  session, messages, busy, input, setInput, onSend, onStop, inputRef, activeDocs,
  isMobile, sidebarOpen, onToggleSidebar, onOpenSettings, onOpenPalette, theme, onToggleTheme,
  onExport, onDelete, onRename, onTogglePin, onOpenSource, onRegenerate, onEditMessage,
  speak, followUpsEnabled, hasKey, settings, models, onModelChange, onFiles, toast, onUpload,
}) {
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stickRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  // follow the stream while the user is at the bottom
  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    if (stickRef.current) scrollToBottom(false);
  }, [messages.length, lastContent, scrollToBottom]);

  // jump to bottom on chat switch
  useEffect(() => {
    stickRef.current = true;
    requestAnimationFrame(() => scrollToBottom(false));
  }, [session?.id, scrollToBottom]);

  const send = useCallback(text => {
    stickRef.current = true;
    onSend(text);
  }, [onSend]);

  return (
    <main className="main">
      <header className="topbar">
        <button className="icon-btn bordered" onClick={onToggleSidebar} title="Toggle sidebar (⌘B)" aria-label="Toggle sidebar">
          {isMobile ? <MenuIcon size={16} /> : <PanelLeft size={16} />}
        </button>
        <div className="topbar-title" title={session?.title}>
          {session?.pinned && <Pin size={12} style={{ marginRight: 6, color: 'var(--accent)', verticalAlign: -1 }} />}
          {session?.title || 'New chat'}
        </div>
        {activeDocs.length > 0 && (
          <span className="chip hide-mobile" title={activeDocs.map(d => d.name).join('\n')}>
            <FileText size={11} /><b style={{ color: 'var(--green)' }}>{activeDocs.length}</b> doc{activeDocs.length > 1 ? 's' : ''} in context
          </span>
        )}
        <button className="icon-btn hide-mobile" onClick={onOpenPalette} title="Command palette (⌘K)"><Command size={16} /></button>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings (⌘,)"><Settings size={16} /></button>
        {session && (
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setMoreOpen(o => !o)} title="Chat options" aria-label="Chat options"><MoreHorizontal size={16} /></button>
            <Menu open={moreOpen} onClose={() => setMoreOpen(false)}>
              <MenuItem icon={Pencil} onClick={() => { setMoreOpen(false); onRename(); }}>Rename</MenuItem>
              <MenuItem icon={session.pinned ? PinOff : Pin} onClick={() => { setMoreOpen(false); onTogglePin(); }}>{session.pinned ? 'Unpin' : 'Pin to top'}</MenuItem>
              <div className="menu-sep" />
              <div className="menu-label"><Download size={10} style={{ verticalAlign: -1 }} /> Export</div>
              <MenuItem icon={FileText} onClick={() => { setMoreOpen(false); onExport('md'); }}>Markdown (.md)</MenuItem>
              <MenuItem icon={FileJson} onClick={() => { setMoreOpen(false); onExport('json'); }}>JSON (.json)</MenuItem>
              <div className="menu-sep" />
              <MenuItem icon={Trash2} danger onClick={() => { setMoreOpen(false); onDelete(); }}>Delete chat</MenuItem>
            </Menu>
          </div>
        )}
      </header>

      <div className="messages" ref={scrollRef} onScroll={onScroll}>
        <div className="messages-inner">
          {messages.length === 0 ? (
            <EmptyState hasKey={hasKey} onOpenSettings={onOpenSettings} docs={activeDocs} onPrompt={send} onUpload={onUpload} />
          ) : (
            messages.map((m, i) => (
              <MsgBubble
                key={m.id || i}
                msg={m}
                isLast={i === messages.length - 1}
                busy={busy}
                onOpenSource={onOpenSource}
                onRegenerate={onRegenerate}
                onEdit={text => onEditMessage(m.id, text)}
                onSpeak={speak.supported ? () => speak.speak(m.id, m.content) : undefined}
                speaking={speak.speakingId === m.id}
                onFollowUp={send}
                showFollowUps={followUpsEnabled}
              />
            ))
          )}
        </div>
      </div>

      {showJump && messages.length > 0 && (
        <button className="scroll-bottom" onClick={() => { stickRef.current = true; scrollToBottom(); }} aria-label="Scroll to bottom">
          <ArrowDown size={16} />
        </button>
      )}

      <Composer
        value={input}
        setValue={setInput}
        onSend={() => send()}
        onStop={onStop}
        busy={busy}
        inputRef={inputRef}
        activeDocCount={activeDocs.length}
        model={settings.model}
        models={models}
        onModelChange={onModelChange}
        onFiles={onFiles}
        sendOnEnter={settings.sendOnEnter}
        isMobile={isMobile}
        toast={toast}
      />
    </main>
  );
}
