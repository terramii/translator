import { localTranslate, localWordLookup, localGrammarLookup } from './localData.js';
import { analyzeContext, validContext, analyzeSentence, validSentence } from './semanticAgent.js';
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

  let gtxMeaning = '', gtxPos = '', gtxDetails = [], gtxTranslation = '';
  try {
    const gtxData = await json(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=${lang === 'en' ? 'vi' : 'en'}&dt=t&dt=bd&q=${encodeURIComponent(word)}`);
    gtxTranslation = gtxData?.[0]?.map(part => part?.[0] || '').join('') || '';

    if (Array.isArray(gtxData?.[1])) {
      const posMap = [];
      for (const posGroup of gtxData[1]) {
        const rawPos = posGroup?.[0];
        const posLabel = partsOfSpeech[rawPos] || rawPos;
        const meanings = Array.isArray(posGroup?.[1]) ? posGroup[1].slice(0, 4).join(', ') : '';
        if (meanings) posMap.push(`${posLabel}: ${meanings}`);
      }
      if (posMap.length) {
        gtxPos = partsOfSpeech[gtxData[1][0]?.[0]] || gtxData[1][0]?.[0] || '';
        gtxMeaning = gtxData[1][0]?.[1]?.[0] || gtxTranslation;
        gtxDetails = posMap;
      }
    }
  } catch {}

  const primaryMeaning = gtxMeaning || gtxTranslation || await translate(word, lang, lang === 'en' ? 'vi' : 'en');

  if (lang === 'vi') {
    return {
      word, lang, source: 'dictionary',
      meaningEn: primaryMeaning,
      pos: gtxPos || 'Từ tiếng Việt',
      usage: gtxDetails.length ? `Nghĩa từ loại: ${gtxDetails.join('; ')}` : `Có thể dịch là “${primaryMeaning}”.`,
      translationGuide: gtxDetails.length ? `Nghĩa từ loại: ${gtxDetails.join('; ')}` : `Có thể dịch là “${primaryMeaning}”.`,
      examples: []
    };
  }

  let entry, datamuse;
  try { entry = (await json(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`))?.[0]; } catch {}
  try {
    const dmList = await json(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dpr`);
    datamuse = dmList?.find(item => item.word?.toLowerCase() === word.toLowerCase()) || dmList?.[0];
  } catch {}

  const ipa = entry?.phonetic || entry?.phonetics?.find(item => item.text && item.text.includes('/'))?.text;
  const meaningObj = entry?.meanings?.[0];
  const pos = partsOfSpeech[meaningObj?.partOfSpeech] || gtxPos || 'Từ tiếng Anh';

  const definitionObj = meaningObj?.definitions?.find(item => item.example) || meaningObj?.definitions?.[0];
  let rawDef = definitionObj?.definition;
  if (!rawDef && datamuse?.defs?.[0]) {
    rawDef = datamuse.defs[0].replace(/^(n|v|adj|adv)\s+/, '');
  }

  let usage = gtxDetails.length ? `Nghĩa từ loại: ${gtxDetails.join('; ')}` : 'Từ điển tham khảo chưa có hướng dẫn thêm.';
  if (rawDef) {
    let viDef = '';
    try { viDef = await translate(rawDef.slice(0, 300), 'en', 'vi'); } catch {}
    const defNote = viDef ? `Định nghĩa từ điển: ${rawDef} (${viDef})` : `Định nghĩa từ điển: ${rawDef}`;
    usage = gtxDetails.length ? `${gtxDetails.join('; ')}. ${defNote}` : defNote;
  }

  const examples = [];
  if (definitionObj?.example) {
    let viEx = '';
    try { viEx = await translate(definitionObj.example.slice(0, 300), 'en', 'vi'); } catch {}
    examples.push({ en: definitionObj.example, vi: viEx || 'Ví dụ minh họa.' });
  }

  return {
    word, lang, source: 'dictionary',
    meaning: primaryMeaning,
    ipa,
    pos,
    usage,
    translationGuide: usage,
    examples
  };
}
export async function apiMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return next();
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  try {
    if (url.pathname === '/api/sentence/context' && req.method === 'POST') {
      let input;
      try { input = JSON.parse(await readBody(req, 16000)); } catch { return send(400, { error: 'Invalid request' }); }
      if (!validSentence(input)) return send(400, { error: 'Invalid sentence' });
      return send(200, await analyzeSentence(input));
    }
    if (url.pathname === '/api/word/context' && req.method === 'POST') {
      let body;
      try { body = await readBody(req, 16000); } catch { return send(413, { error: 'Văn bản quá dài.' }); }
      let input;
      try { input = JSON.parse(body); } catch { return send(400, { error: 'Dữ liệu không hợp lệ.' }); }
      if (!validContext(input)) return send(400, { error: 'Từ được chọn không khớp với câu.' });
      const result = await analyzeContext(input);
      if (result.source === 'general-fallback') {
        try {
          const dict = await wordLookup(input.word, input.lang);
          if (dict) {
            result.generalReference = dict;
            if (!result.meaning || result.meaning === 'Chưa xác định nghĩa trong câu') {
              result.meaning = input.lang === 'en' ? (dict.meaning || result.meaning) : (dict.meaningEn || result.meaning);
              result.meaningEn = input.lang === 'en' ? (dict.meaningEn || result.meaningEn) : (dict.meaning || result.meaningEn);
            }
            if (!result.usage || result.usage === 'Hãy thử lại khi kết nối phân tích ngữ cảnh sẵn sàng.') {
              result.usage = input.lang === 'en' ? (dict.usage || result.usage) : (dict.translationGuide || result.usage);
              result.translationGuide = result.usage;
            }
            if (!result.pos && dict.pos) result.pos = dict.pos;
            if (!result.ipa && dict.ipa) result.ipa = dict.ipa;
            if ((!result.examples || !result.examples.length) && dict.examples?.length) result.examples = dict.examples;
          }
        } catch {}
      }
      return send(200, result);
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
