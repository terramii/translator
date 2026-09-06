import React, { createContext, useContext, useEffect, useState } from 'react';
const Context = createContext(null);
export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => { try { return localStorage.getItem('dich-beo-locale') === 'en' ? 'en' : 'vi'; } catch { return 'vi'; } });
  useEffect(() => { document.documentElement.lang = locale; document.title = locale === 'vi' ? 'Dịch bèo - Dịch & Học Tiếng Anh' : 'Dịch bèo - Translate & Learn'; try { localStorage.setItem('dich-beo-locale', locale); } catch {} }, [locale]);
  return <Context.Provider value={{ locale, setLocale, t: (vi, en) => locale === 'vi' ? vi : en }}>{children}</Context.Provider>;
}
export const useLanguage = () => useContext(Context);
export function errorMessage(code, locale) {
  const unavailable = ['Tạm thời chưa thể tra nghĩa. Vui lòng thử lại sau.', 'Word meanings are temporarily unavailable. Please try again later.'];
  const messages = {
    TIMEOUT: ['Tra nghĩa hơi lâu. Vui lòng thử lại.', 'This is taking a little longer. Please try again.'],
    NETWORK_ERROR: ['Không thể kết nối. Vui lòng thử lại.', 'Could not connect. Please try again.'],
    INVALID_RESPONSE: ['Chưa tìm được nghĩa phù hợp. Vui lòng thử lại.', 'Could not find the right meaning. Please try again.'],
    INCOMPLETE_RESPONSE: ['Chưa tìm được nghĩa đầy đủ. Vui lòng thử lại.', 'Could not finish looking up this word. Please try again.'],
    REFUSAL: ['Chưa thể tra nghĩa trong câu này. Hãy thử một câu khác.', 'Could not look up the meaning in this sentence. Try another sentence.']
  };
  return (messages[code] || unavailable)[locale === 'vi' ? 0 : 1];
}
