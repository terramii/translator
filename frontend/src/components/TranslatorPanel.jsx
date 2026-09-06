import React from 'react';
import { ArrowRightLeft, Volume2, Copy, Trash2 } from 'lucide-react';
import InteractiveText from './InteractiveText';
import { useLanguage } from '../language';
export default function TranslatorPanel(props) {
  const { t } = useLanguage();
  const { inputText, setInputText, translatedText, sourceLang, targetLang, onSwapLanguages, inputTokens, outputTokens, isTranslating, translationError, onRetry, showToast } = props;
  function speak(text, lang) {
    if (!window.speechSynthesis) return showToast(t('Trình duyệt chưa hỗ trợ phát âm.', 'Speech playback is not supported in this browser.'));
    window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(text); speech.lang = lang === 'vi' ? 'vi-VN' : 'en-US'; speech.rate = .9; window.speechSynthesis.speak(speech);
  }
  async function copy() { try { await navigator.clipboard.writeText(translatedText); showToast(t('Đã sao chép bản dịch!', 'Translation copied!')); } catch { showToast(t('Không thể sao chép.', 'Could not copy the translation.')); } }
  const name = lang => lang === 'vi' ? t('Tiếng Việt', 'Vietnamese') : t('Tiếng Anh', 'English');
  return <section aria-label="Dịch hai chiều">
    <button className="action-btn" onClick={onSwapLanguages} disabled={!translatedText || isTranslating} title={t('Đổi chiều dịch', 'Swap languages')} style={{ width: 'auto', padding: '.7rem', gap: '.5rem' }}><ArrowRightLeft size={18} /> {name(sourceLang)} → {name(targetLang)}</button>
    <div className="translator-wrapper" style={{ marginTop: '1rem' }}><div className="translator-card">
      <div className="card-header"><div className="lang-selector">{name(sourceLang)} <span className="brand-badge">{t('Tự động phát hiện', 'Auto-detected')}</span></div><div className="card-actions"><button className="action-btn" title={t('Nghe câu gốc', 'Listen to original')} disabled={!inputText} onClick={() => speak(inputText, sourceLang)}><Volume2 size={18} /></button><button className="action-btn" title={t('Xóa văn bản', 'Clear text')} onClick={() => setInputText('')}><Trash2 size={18} /></button></div></div>
      <textarea className="input-area" aria-label={t('Nhập câu cần dịch', 'Enter a sentence to translate')} maxLength={500} value={inputText} onChange={e => setInputText(e.target.value)} placeholder={t('Nhập câu tiếng Việt/tiếng Anh', 'Enter a Vietnamese/English sentence')} />
      <div style={{ padding: '0 1.25rem', color: '#64748b', fontSize: '.8rem' }}>{inputText.length}/500 · {t('Rê chuột qua từ bên dưới để xem nghĩa. Bấm để ghim.', 'Hover over a word below to see its meaning. Click to pin.')}</div>
      <div className="word-state-legend"><span><i aria-hidden="true" /> {t('Rê chuột để xem', 'Hover to explore')}</span><span><i className="pinned-swatch" aria-hidden="true" /> {t('Tím: từ đã ghim', 'Purple: pinned word')}</span></div>
      <InteractiveText {...props} tokens={inputTokens} emptyPlaceholder={t('Các từ trong câu sẽ hiện ở đây.', 'Your sentence’s words will appear here.')} />
    </div><div className="translator-card">
      <div className="card-header"><div className="lang-selector">{t('Bản dịch', 'Translation')} · {name(targetLang)}</div><div className="card-actions"><button className="action-btn" title={t('Nghe bản dịch', 'Listen to translation')} disabled={!translatedText} onClick={() => speak(translatedText, targetLang)}><Volume2 size={18} /></button><button className="action-btn" title={t('Sao chép bản dịch', 'Copy translation')} disabled={!translatedText} onClick={copy}><Copy size={18} /></button></div></div>
      <div aria-live="polite" aria-busy={isTranslating}>{translationError ? <div role="alert" style={{ padding: '1.25rem' }}>{t('Không thể kết nối dịch vụ dịch.', 'Could not reach the translation service.')} <button onClick={onRetry}>{t('Thử lại', 'Retry')}</button></div> : <InteractiveText {...props} tokens={outputTokens} emptyPlaceholder={isTranslating ? t('Đang dịch…', 'Translating…') : t('Bản dịch sẽ hiện tại đây.', 'Your translation will appear here.')} />}</div>
      <p style={{ padding: '0 1.25rem 1rem', color: '#64748b', fontSize: '.8rem' }}>{t('Rê chuột qua từ trong câu trên để xem nghĩa. Bấm để ghim.', 'Hover over a word above to see its meaning. Click to pin.')}</p>
    </div></div>
  </section>;
}
