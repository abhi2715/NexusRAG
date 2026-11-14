import { useState, useRef, useCallback, useEffect } from 'react';

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

/** Voice dictation via the Web Speech API. `onText(final, interim)` fires as speech is recognized. */
export function useSpeechInput(onText) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!Recognition) return false;
    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    let finalText = '';
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      cbRef.current(finalText, interim);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    return true;
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported: !!Recognition, listening, start, stop };
}

/** Read text aloud with speechSynthesis; one utterance at a time. */
export function useSpeak() {
  const [speakingId, setSpeakingId] = useState(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((id, text) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) { setSpeakingId(null); return; }
    const plain = text.replace(/```[\s\S]*?```/g, ' code block ').replace(/[*_#>`|]/g, '').replace(/\[(\d+)\]/g, '');
    const u = new SpeechSynthesisUtterance(plain);
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }, [speakingId, supported]);

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);

  return { supported, speakingId, speak };
}
