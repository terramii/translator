import React, { useEffect, useState } from 'react';
import { Pin, X, Volume2 } from 'lucide-react';
import { lookupWord, lookupWordAsync } from '../services/wordLookup';
export default function WordInfoTab({ token, isPinned, onClose, onTogglePin, showToast }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const initial = lookupWord(token);
    setData(initial); setError('');
    if (!initial) {
      const timer = setTimeout(() => lookupWordAsync(token, controller.signal)
        .then(result => { if (!controller.signal.aborted) setData(result); })
        .catch(error => { if (!controller.signal.aborted) setError(error.message); }), 150);
      return () => { clearTimeout(timer); controller.abort(); };
    }
    return () => controller.abort();
  }, [token.sentence, token.start, token.end, token.lang, retry]);
  const isEnglish = token.lang === 'en';
  function speak() {
    if (!window.speechSynthesis) return showToast('Trình duyệt chưa hỗ trợ phát âm.');
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(token.text); speech.lang = isEnglish ? 'en-US' : 'vi-VN';
    window.speechSynthesis.speak(speech);
  }
  return <section className="word-info-wrapper" aria-label="Thông tin từ" aria-live="polite"><div className="word-info-card">
    <div className="word-info-header"><div className="word-title-group"><h3 className="target-word">{token.text}</h3>{data?.ipa && <span className="ipa-phonetic">{data.ipa}</span>}<button className="action-btn" title="Nghe phát âm" onClick={speak}><Volume2 size={18} /></button>{data?.pos && <span className="pos-tag">{data.pos}</span>}</div>
      <div className="card-actions"><button className="action-btn" title={isPinned ? 'Bỏ ghim' : 'Ghim thẻ nghĩa'} aria-pressed={isPinned} onClick={onTogglePin}><Pin size={18} fill={isPinned ? 'currentColor' : 'none'} /></button><button className="action-btn" title="Đóng thẻ nghĩa" onClick={onClose}><X size={18} /></button></div>
    </div>
    {isPinned && <p className="pinned-badge">Đã ghim · Bấm từ khác để đổi · Esc để đóng</p>}
    {data?.source === 'semantic' && <div className="context-explanation"><div className="section-label">Nghĩa theo ngữ cảnh · Groq</div><p>Cụm đang xét: <strong>{data.phrase}</strong></p><p className="context-sentence">{token.sentence.slice(0, data.phraseStart)}<mark>{token.sentence.slice(data.phraseStart, data.phraseEnd)}</mark>{token.sentence.slice(data.phraseEnd)}</p></div>}
    {data?.source === 'general-fallback' && <div className="context-explanation" role="status"><p>{data.notice}</p><button className="preset-chip" onClick={() => setRetry(n => n + 1)}>Thử phân tích lại</button>{data.generalReference && <details><summary>Nghĩa từ điển tham khảo — chưa xét ngữ cảnh</summary><p>{isEnglish ? data.generalReference.meaning : data.generalReference.meaningEn}</p><p>{isEnglish ? data.generalReference.usage : data.generalReference.translationGuide}</p></details>}</div>}
    {error ? <p role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>Thử lại</button></p> : !data ? <p>Đang tra từ…</p> : <>
      <div className="info-grid"><div className="info-section"><div className="section-label">{isEnglish ? 'Nghĩa tiếng Việt' : 'Dịch sang tiếng Anh'}{data.source === 'general-fallback' && <span style={{ color: '#d97706', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: '500' }}>(chưa xét ngữ cảnh)</span>}</div><div className="meaning-main">{isEnglish ? data.meaning : data.meaningEn}</div></div><div className="info-section"><div className="section-label">{isEnglish ? 'Cách dùng & cấu trúc' : 'Cách dịch & diễn đạt'}{data.source === 'general-fallback' && <span style={{ color: '#d97706', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: '500' }}>(chưa xét ngữ cảnh)</span>}</div><div className="usage-text">{isEnglish ? data.usage : data.translationGuide}</div></div></div>
      {!!data.examples?.length && <div className="example-list">{data.examples.map((example, index) => <div className="example-item" key={index}><div className="example-en">{example.en}</div><div className="example-vi">{example.vi}</div></div>)}</div>}
      {data.grammar && <div className="info-section"><div className="section-label">Ghi chú ngữ pháp · {data.grammar.title}</div><p className="usage-text">{data.grammar.explanation}</p><p className="example-en">{data.grammar.structure}</p></div>}
    </>}
  </div></section>;
}


