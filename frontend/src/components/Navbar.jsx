import React from 'react';
import { Globe, Languages } from 'lucide-react';
import { useLanguage } from '../language';
export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  return <header className="navbar"><div className="brand"><div className="brand-icon" aria-label={t('Kỳ lân nhỏ', 'Little unicorn')}><span aria-hidden="true">🦄</span></div><div><div className="brand-title">Dịch bèo <span className="brand-badge">{t('SỔ TAY DIỆU KỲ ✧', 'A LITTLE MAGIC ✧')}</span></div><p className="brand-description">{t('Mỗi ngày một câu. Mỗi trang một điều mới.', 'One sentence a day. Something new on every page.')}</p></div></div><div className="nav-tabs"><span className="nav-tab active"><Languages size={18} /> {t('Dịch & Học', 'Translate & Learn')}</span><div className="interface-language-control"><Globe size={18} aria-hidden="true" /><select className="interface-language" aria-label={t('Ngôn ngữ giao diện', 'Interface language')} value={locale} onChange={e => setLocale(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div></div></header>;
}
