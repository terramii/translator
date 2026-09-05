import { localTranslate, localWordLookup, localGrammarLookup } from './localData.js';
import { analyzeContext, validContext } from './semanticAgent.js';
const cache = new Map();
async function readBody(req, limit) {
  if (req.body !== undefined) {
    const body = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    if (body.length > limit) throw new Error('Body too large');
    return body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > limit) throw new Error('Body too large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Upstream service unavailable');
  return response.json();
}
export async function translate(text, sourceLang, targetLang) {
  const key = `${sourceLang}:${targetLang}:${text}`;
  if (cache.has(key)) return cache.get(key);
  let translation;
  try {
    const data = await json(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    translation = data?.[0]?.map(part => part?.[0] || '').join('');
    if (!translation) throw new Error('Empty translation');
  } catch {
    try {
    const data = await json(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
    if (Number(data.responseStatus) !== 200 || !data.responseData?.translatedText) throw new Error('Translation unavailable');
    translation = data.responseData.translatedText;
    } catch (error) {
      translation = localTranslate(text, sourceLang);
      if (!translation) throw error;
    }
  }
  if (cache.size >= 500) cache.delete(cache.keys().next().value);
  cache.set(key, translation);
  return translation;
}
const partsOfSpeech = { noun: 'Danh từ', verb: 'Động từ', adjective: 'Tính từ', adverb: 'Trạng từ', pronoun: 'Đại từ', preposition: 'Giới từ', conjunction: 'Liên từ', interjection: 'Thán từ' };
export async function wordLookup(word, lang) {
  const local = localWordLookup(word, lang) || localGrammarLookup(word, lang);
  if (local) return local;
  const translation = await translate(word, lang, lang === 'en' ? 'vi' : 'en');
  if (lang === 'vi') return { word, lang, meaningEn: translation, translationGuide: `Có thể dịch là “${translation}”. Chọn cách diễn đạt theo ngữ cảnh của cả câu.`, examples: [] };
  let entry;
  try { entry = (await json(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`))?.[0]; } catch {}
  const meaning = entry?.meanings?.[0];
  const definition = meaning?.definitions?.find(item => item.example) || meaning?.definitions?.[0];
  let usage = 'Từ điển chưa có hướng dẫn cho từ này. Nghĩa có thể thay đổi theo ngữ cảnh.';
  if (definition?.definition) {
    try { usage = await translate(definition.definition.slice(0, 500), 'en', 'vi'); } catch {}
  }
  const examples = [];
  if (definition?.example) {
    let vi = '';
    try { vi = await translate(definition.example.slice(0, 500), 'en', 'vi'); } catch {}
    examples.push({ en: definition.example, vi });
  }
  return { word, lang, meaning: translation, ipa: entry?.phonetic || entry?.phonetics?.find(item => item.text)?.text, pos: partsOfSpeech[meaning?.partOfSpeech], usage, examples };
}
export async function apiMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return next();
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  try {
    if (url.pathname === '/api/word/context' && req.method === 'POST') {
      let body;
      try { body = await readBody(req, 16000); } catch { return send(413, { error: 'Văn bản quá dài.' }); }
      let input;
      try { input = JSON.parse(body); } catch { return send(400, { error: 'Dữ liệu không hợp lệ.' }); }
      if (!validContext(input)) return send(400, { error: 'Từ được chọn không khớp với câu.' });
      return send(200, await analyzeContext(input));
    }
    if (url.pathname === '/api/translate' && req.method === 'POST') {
      let body;
      try { body = await readBody(req, 10000); } catch { return send(413, { error: 'Văn bản quá dài.' }); }
      let data;
      try { data = JSON.parse(body); } catch { return send(400, { error: 'Dữ liệu không hợp lệ.' }); }
      const { text, sourceLang, targetLang } = data || {};
      if (typeof text !== 'string' || !text.trim() || text.length > 500 || !['vi', 'en'].includes(sourceLang) || !['vi', 'en'].includes(targetLang) || sourceLang === targetLang) return send(400, { error: 'Văn bản hoặc ngôn ngữ không hợp lệ.' });
      return send(200, { translation: await translate(text, sourceLang, targetLang) });
    }
    if (url.pathname === '/api/word' && req.method === 'GET') {
      const word = url.searchParams.get('word'), lang = url.searchParams.get('lang');
      if (!word?.trim() || word.length > 100 || !['vi', 'en'].includes(lang)) return send(400, { error: 'Từ hoặc ngôn ngữ không hợp lệ.' });
      return send(200, await wordLookup(word, lang));
    }
    return send(404, { error: 'Không tìm thấy.' });
  } catch (error) { console.error('API request failed:', error.message); send(502, { error: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.' }); }
}
