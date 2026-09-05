import React from 'react';
import { ArrowRightLeft, Volume2, Copy, Trash2 } from 'lucide-react';
import InteractiveText from './InteractiveText';
export default function TranslatorPanel(props) {
  const { inputText, setInputText, translatedText, sourceLang, targetLang, onSwapLanguages, inputTokens, outputTokens, isTranslating, translationError, onRetry, showToast } = props;
  function speak(text, lang) {
    if (!window.speechSynthesis) return showToast('Trình duyệt chưa hỗ trợ phát âm.');
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = lang === 'vi' ? 'vi-VN' : 'en-US'; speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(translatedText); showToast('Đã sao chép bản dịch!'); }
    catch { showToast('Không thể sao chép. Vui lòng thử lại.'); }
  }
  const name = lang => lang === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh';
  return <section aria-label="Dịch hai chiều">
    <button className="action-btn" onClick={onSwapLanguages} disabled={!translatedText || isTranslating} title="Đổi chiều dịch" style={{ width: 'auto', padding: '0.7rem', gap: '0.5rem' }}><ArrowRightLeft size={18} /> {name(sourceLang)} → {name(targetLang)}</button>
    <div className="translator-wrapper" style={{ marginTop: '1rem' }}>
      <div className="translator-card">
        <div className="card-header"><div className="lang-selector">{name(sourceLang)} <span className="brand-badge">Tự động phát hiện</span></div><div className="card-actions"><button className="action-btn" title="Nghe câu gốc" disabled={!inputText} onClick={() => speak(inputText, sourceLang)}><Volume2 size={18} /></button><button className="action-btn" title="Xóa văn bản" onClick={() => setInputText('')}><Trash2 size={18} /></button></div></div>
        <textarea className="input-area" aria-label="Nhập câu cần dịch" maxLength={500} value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Nhập câu tiếng Việt/tiếng Anh" />
        <div style={{ padding: '0 1.25rem', color: '#64748b', fontSize: '0.8rem' }}>{inputText.length}/500 · Rê chuột qua từ bên dưới để xem nghĩa. Bấm để ghim.</div>
        <div className="word-state-legend"><span><i aria-hidden="true" /> Rê chuột để xem</span><span><i className="pinned-swatch" aria-hidden="true" /> Tím: từ đã ghim</span></div>
        <InteractiveText {...props} tokens={inputTokens} emptyPlaceholder="Các từ trong câu sẽ hiện ở đây." />
      </div>
      <div className="translator-card" style={{ background: '#f8fafc' }}>
        <div className="card-header"><div className="lang-selector">Bản dịch {name(targetLang)}</div><div className="card-actions"><button className="action-btn" title="Nghe bản dịch" disabled={!translatedText} onClick={() => speak(translatedText, targetLang)}><Volume2 size={18} /></button><button className="action-btn" title="Sao chép bản dịch" disabled={!translatedText} onClick={copy}><Copy size={18} /></button></div></div>
        <div aria-live="polite" aria-busy={isTranslating}>{translationError ? <div role="alert" style={{ padding: '1.25rem' }}>{translationError} <button onClick={onRetry}>Thử lại</button></div> : <InteractiveText {...props} tokens={outputTokens} emptyPlaceholder={isTranslating ? 'Đang dịch…' : 'Bản dịch sẽ hiện tại đây.'} />}</div>
        <p style={{ padding: '0 1.25rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>Rê chuột qua từ trong câu trên để xem nghĩa. Bấm để ghim.</p>
      </div>
    </div>
  </section>;
}



