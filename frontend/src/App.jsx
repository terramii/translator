import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TranslatorPanel from './components/TranslatorPanel';
import WordInfoTab from './components/WordInfoTab';
import MascotTip from './components/MascotTip';
import { LanguageProvider, useLanguage } from './language';
import { detectLanguage, translateSentence, tokenizeText } from './services/translator';
export default function App() { return <LanguageProvider><AppContent /></LanguageProvider>; }
function AppContent() {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [retry, setRetry] = useState(0);
  const [hoveredToken, setHoveredToken] = useState(null);
  const [pinnedToken, setPinnedToken] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const sourceLang = detectLanguage(inputText), targetLang = sourceLang === 'vi' ? 'en' : 'vi';
  const activeWordToken = pinnedToken || hoveredToken;
  const closeInfo = () => { setPinnedToken(null); setHoveredToken(null); };
  useEffect(() => {
    if (!pinnedToken) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('.word-info-wrapper')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start'
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pinnedToken]);
  useEffect(() => { const timer = setTimeout(() => setToastMessage(''), 3000); return () => clearTimeout(timer); }, [toastMessage]);
  useEffect(() => { const listener = e => { if (e.key === 'Escape') closeInfo(); }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener); }, []);
  useEffect(() => {
    const controller = new AbortController();
    closeInfo(); setTranslatedText(''); setTranslationError(''); setIsTranslating(!!inputText.trim());
    if (!inputText.trim()) return () => controller.abort();
    const timer = setTimeout(async () => {
      try { const result = await translateSentence(inputText, sourceLang, targetLang, controller.signal); if (!controller.signal.aborted) setTranslatedText(result); }
      catch { if (!controller.signal.aborted) setTranslationError(true); }
      finally { if (!controller.signal.aborted) setIsTranslating(false); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [inputText, sourceLang, targetLang, retry]);
  function pin(token) { if (pinnedToken?.start === token.start && pinnedToken?.sentence === token.sentence && pinnedToken?.lang === token.lang) setPinnedToken(null); else setPinnedToken(token); }
  return <><div className="sky-clouds" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div><div className="app-container"><Navbar />
    <main>
      <TranslatorPanel inputText={inputText} setInputText={setInputText} translatedText={translatedText} sourceLang={sourceLang} targetLang={targetLang} detectedLang={sourceLang} onSwapLanguages={() => { if (translatedText) setInputText(translatedText); }} inputTokens={tokenizeText(inputText, sourceLang)} outputTokens={tokenizeText(translatedText, targetLang)} hoveredToken={hoveredToken} pinnedToken={pinnedToken} onWordHover={setHoveredToken} onWordClick={pin} isTranslating={isTranslating} translationError={translationError} onRetry={() => setRetry(n => n + 1)} showToast={setToastMessage} />
      {activeWordToken && <WordInfoTab key={`${activeWordToken.lang}:${activeWordToken.sentence}:${activeWordToken.start}`} token={activeWordToken} isPinned={!!pinnedToken} onClose={closeInfo} onTogglePin={() => pin(activeWordToken)} showToast={setToastMessage} />}
      <MascotTip activeWord={activeWordToken} sourceLang={sourceLang} />
    </main>
    {toastMessage && <div className="toast-message" role="status">{toastMessage}</div>}
  </div></>;
}

