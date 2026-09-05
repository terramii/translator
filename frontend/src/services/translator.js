export function removeVietnameseTones(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); }
export function restoreVietnameseTones(text) { return text; }
export function detectLanguage(text) {
  const normalized = text.normalize('NFC').toLowerCase();
  if (/[àáảãạăâđèéẻẽẹêìíỉĩịòóỏõọôơùúủũụưỳýỷỹỵ\u1ea0-\u1ef9]/u.test(normalized)) return 'vi';
  const words = normalized.match(/[a-z]+/g) || [];
  const vietnamese = new Set('xin chao hom nay troi dep qua minh cung di dao nhe hoc tieng anh viet toi khong muon thich nguoi cam'.split(' '));
  return words.length && words.filter(word => vietnamese.has(word)).length / words.length >= 0.5 ? 'vi' : 'en';
}
export async function translateSentence(text, sourceLang, targetLang, signal) {
  if (!text.trim()) return '';
  const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, sourceLang, targetLang }), signal });
  const data = await response.json();
  if (!response.ok || typeof data.translation !== 'string') throw new Error(data.error || 'Translation failed');
  return data.translation;
}
export function tokenizeText(text, lang) {
  const parts = text.match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*|\s+|[^\p{L}\p{M}\p{N}\s]/gu) || [];
  const compounds = new Set(['tiếng anh', 'tiếng việt', 'hôm nay', 'đi dạo', 'bạn bè', 'thời tiết', 'học tập', 'cảm ơn']);
  const result = [];
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (lang === 'vi' && /^ +$/.test(parts[i + 1] || '') && compounds.has(`${part} ${parts[i + 2]}`.toLowerCase())) { part += parts[i + 1] + parts[i + 2]; i += 2; }
    result.push({ text: part, cleanText: part.toLowerCase().normalize('NFC'), lang, sentence: text, start: offset, end: offset + part.length, isPunctuation: !/[\p{L}\p{N}]/u.test(part) });
    offset += part.length;
  }
  return result;
}
