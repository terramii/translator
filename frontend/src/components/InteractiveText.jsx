import React from 'react';
import { useLanguage } from '../language';
export default function InteractiveText({ tokens = [], hoveredToken, pinnedToken, onWordHover, onWordClick, emptyPlaceholder }) {
  const { t } = useLanguage();
  const matches = (a, b) => a?.start === b.start && a?.sentence === b.sentence && a?.lang === b.lang;
  return <div className="interactive-text-box" style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
    {!tokens.length && <span style={{ color: '#94a3b8' }}>{emptyPlaceholder || t('Bản dịch hiển thị tại đây…', 'Your translation will appear here…')}</span>}
    {tokens.map((token, index) => token.isPunctuation ? <React.Fragment key={index}>{token.text}</React.Fragment> :
      <button key={index} type="button" style={{ font: 'inherit' }} className={`word-chip${matches(pinnedToken, token) ? ' pinned' : matches(hoveredToken, token) ? ' active-hover' : ''}`}
        aria-label={`Tra từ ${token.text}`} aria-pressed={matches(pinnedToken, token)} onMouseEnter={() => onWordHover(token)} onFocus={() => onWordHover(token)} onClick={() => onWordClick(token)}>{token.text}</button>)}
  </div>;
}

