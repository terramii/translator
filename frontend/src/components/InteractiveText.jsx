import React from 'react';
export default function InteractiveText({ tokens = [], hoveredToken, pinnedToken, onWordHover, onWordClick, emptyPlaceholder }) {
  const matches = (a, b) => a?.start === b.start && a?.sentence === b.sentence && a?.lang === b.lang;
  return <div className="interactive-text-box" style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
    {!tokens.length && <span style={{ color: '#94a3b8' }}>{emptyPlaceholder || 'Bản dịch hiển thị tại đây…'}</span>}
    {tokens.map((token, index) => token.isPunctuation ? <React.Fragment key={index}>{token.text}</React.Fragment> :
      <button key={index} type="button" style={{ font: 'inherit' }} className={`word-chip${matches(pinnedToken, token) ? ' pinned' : matches(hoveredToken, token) ? ' active-hover' : ''}`}
        aria-label={`Tra từ ${token.text}`} aria-pressed={matches(pinnedToken, token)} onMouseEnter={() => onWordHover(token)} onFocus={() => onWordHover(token)} onClick={() => onWordClick(token)}>{token.text}</button>)}
  </div>;
}
