import React from 'react';
import { useLanguage } from '../language';
export default function MascotTip({ activeWord }) {
  const { t } = useLanguage();
  return <aside className="mascot-container"><div className="mascot-avatar"><span aria-hidden="true">🦄</span></div><div className="mascot-content"><h4>{t('Một chút phép màu, một từ mới', 'A little magic, a new word')}</h4><p>{activeWord ? t(`Ghi lại một câu của riêng bạn với “${activeWord.text}” để nhớ lâu hơn.`, `Write your own sentence with “${activeWord.text}” to help it stick.`) : t('Rê chuột để khám phá từ, bấm để ghim.', 'Hover to explore words, click to pin.')}</p></div><span className="notebook-doodle" aria-hidden="true">✧</span></aside>;
}
