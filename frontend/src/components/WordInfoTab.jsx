import React, { useEffect, useState } from 'react';
import { Pin, X, Volume2 } from 'lucide-react';
import { lookupWord, lookupWordAsync } from '../services/wordLookup';
import { useLanguage, errorMessage } from '../language';
export default function WordInfoTab({ token, isPinned, onClose, onTogglePin, showToast }) {
  const { locale, t } = useLanguage();
  const [data, setData] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); const initial = lookupWord(token);
    setData(initial); setError('');
    if (!initial) {
      const timer = setTimeout(() => lookupWordAsync(token, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setError('NETWORK_ERROR'); }), 250);
      return () => { clearTimeout(timer); controller.abort(); };
    }
    return () => controller.abort();
  }, [token.sentence, token.start, token.end, token.lang, retry]);
  function speak() { if (!window.speechSynthesis) return showToast(t('Trình duyệt chưa hỗ trợ phát âm.', 'Speech playback is not supported.')); window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(token.text); speech.lang = token.lang === 'en' ? 'en-US' : 'vi-VN'; window.speechSynthesis.speak(speech); }
  return <section className="word-info-wrapper" aria-label={t('Thông tin từ', 'Word details')} aria-live="polite"><div className="word-info-card">
    <div className="word-info-header"><div className="word-title-group"><h3 className="target-word">{token.text}</h3><button className="action-btn" title={t('Nghe phát âm', 'Listen')} onClick={speak}><Volume2 size={18} /></button>{data?.pos && <span className="pos-tag">{locale === 'en' ? data.posEn : data.pos}</span>}</div><div className="card-actions"><button className="action-btn" title={isPinned ? t('Bỏ ghim', 'Unpin') : t('Ghim thẻ nghĩa', 'Pin details')} aria-pressed={isPinned} onClick={onTogglePin}><Pin size={18} fill={isPinned ? 'currentColor' : 'none'} /></button><button className="action-btn" title={t('Đóng thẻ nghĩa', 'Close details')} onClick={onClose}><X size={18} /></button></div></div>
    {isPinned && <p className="pinned-badge">{t('Đã ghim · Bấm từ khác để đổi · Esc để đóng', 'Pinned · Click another word to change · Esc to close')}</p>}
    {error ? <p role="alert">{errorMessage(error, locale)} <button onClick={() => setRetry(n => n + 1)}>{t('Thử lại', 'Retry')}</button></p> : !data ? <p>{t('Đang tìm nghĩa của từ…', 'Looking up this word…')}</p> : data.source !== 'semantic' ? <div className="context-explanation"><p>{errorMessage(data.errorCode, locale)}</p><button className="preset-chip" onClick={() => setRetry(n => n + 1)}>{t('Thử lại sau 30 giây', 'Retry after 30 seconds')}</button></div> : <>
      <div className="context-explanation"><div className="section-label">{t('Trong câu này', 'In this sentence')}</div><p>{t('Cụm đang xét:', 'Phrase:')} <strong>{data.phrase}</strong></p><p className="context-sentence">{token.sentence.slice(0, data.phraseStart)}<mark>{token.sentence.slice(data.phraseStart, data.phraseEnd)}</mark>{token.sentence.slice(data.phraseEnd)}</p></div>
      <div className="info-grid"><div className="info-section"><div className="section-label">{token.lang === 'en' ? t('Nghĩa tiếng Việt', 'Vietnamese meaning') : t('Dịch sang tiếng Anh', 'English translation')}</div><div className="meaning-main">{token.lang === 'en' ? data.meaning : data.meaningEn}</div>{locale === 'en' && token.lang === 'en' && <p>{data.meaningEn}</p>}</div><div className="info-section"><div className="section-label">{t('Cách dùng trong câu', 'Usage in this sentence')}</div><div className="usage-text">{locale === 'en' ? data.usageEn : data.usage}</div></div></div>
      <div className="example-list">{data.examples?.map((ex, i) => <div className="example-item" key={i}><div className="example-en">{ex.en}</div><div className="example-vi">{ex.vi}</div></div>)}</div>
    </>}
  </div></section>;
}
