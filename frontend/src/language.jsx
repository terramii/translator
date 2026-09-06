import React, { createContext, useContext, useEffect, useState } from 'react';
const Context = createContext(null);
export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => { try { return localStorage.getItem('dich-beo-locale') === 'en' ? 'en' : 'vi'; } catch { return 'vi'; } });
  useEffect(() => { document.documentElement.lang = locale; document.title = locale === 'vi' ? 'Dịch bèo - Dịch & Học Tiếng Anh' : 'Dịch bèo - Translate & Learn'; try { localStorage.setItem('dich-beo-locale', locale); } catch {} }, [locale]);
  return <Context.Provider value={{ locale, setLocale, t: (vi, en) => locale === 'vi' ? vi : en }}>{children}</Context.Provider>;
}
export const useLanguage = () => useContext(Context);
export function errorMessage(code, locale) {
  const messages = {
    MISSING_KEY: ['Chưa cấu hình khóa API trên máy chủ.', 'No API key is configured on the server.'],
    API_KEY_INVALID: ['Khóa API không hợp lệ.', 'The API key was rejected.'],
    PERMISSION_DENIED: ['Nhà cung cấp từ chối quyền truy cập.', 'The provider denied access.'],
    MODEL_NOT_FOUND: ['Mô hình đã chọn không khả dụng.', 'The configured model is unavailable.'],
    QUOTA_EXCEEDED: ['Các nhà cung cấp khả dụng đã đạt hạn mức. Vui lòng đợi rồi thử lại.', 'Available providers have reached their limits. Please wait before retrying.'],
    TIMEOUT: ['Phân tích mất quá nhiều thời gian. Vui lòng thử lại.', 'Analysis took too long. Please try again.'],
    NETWORK_ERROR: ['Không thể kết nối dịch vụ phân tích.', 'Could not reach the analysis service.'],
    INVALID_REQUEST: ['Cấu hình yêu cầu chưa hợp lệ.', 'The provider rejected the request configuration.'],
    INVALID_RESPONSE: ['Phân tích chưa khớp đầy đủ với câu. Vui lòng thử lại.', 'The analysis did not cover the sentence correctly. Please retry.'],
    INCOMPLETE_RESPONSE: ['Phân tích chưa hoàn chỉnh. Vui lòng thử lại.', 'The analysis was incomplete. Please retry.'],
    REFUSAL: ['Nhà cung cấp không thể phân tích nội dung này.', 'The provider could not analyze this content.'],
    PROVIDER_UNAVAILABLE: ['Dịch vụ tạm thời không khả dụng.', 'The service is temporarily unavailable.']
  };
  return (messages[code] || messages.PROVIDER_UNAVAILABLE)[locale === 'vi' ? 0 : 1];
}
