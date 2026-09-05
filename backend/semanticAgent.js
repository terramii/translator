import './config.js';
import { localWordLookup, localGrammarLookup } from './localData.js';
import { tokenizeText } from '../frontend/src/services/translator.js';

const SYSTEM = `You are a bilingual language tutor for Vietnamese learners of English.
Analyze the FULL sentence and break down every meaningful word or phrase in it.
Identify smallest meaningful phrases including collocations, idioms, and phrasal verbs.
Explain each word or phrase's actual grammatical role and meaning IN THIS sentence, not its generic dictionary sense.
For example, 'so' in 'Thank you so much' intensifies 'much' (meaning 'rất nhiều'); it does not mean 'therefore' ('vì thế').
All explanations, pos, meaningVi, and usageVi must be in Vietnamese. meaningEn is an English equivalent.
Give one natural bilingual example using the same phrase and sense. Never fabricate IPA; omit it.
Return phrase as an EXACT contiguous substring of the sentence.
Return a JSON object with key "items", which is an array of objects:
{
  "items": [
    {
      "phrase": "exact phrase from sentence",
      "meaningVi": "string in Vietnamese",
      "meaningEn": "string in English",
      "pos": "string in Vietnamese",
      "usageVi": "string in Vietnamese",
      "examples": [{ "en": "string", "vi": "string" }]
    }
  ]
}`;

const errorNotices = {
  MISSING_KEY: 'Chưa cấu hình khóa Groq trên máy chủ.',
  API_KEY_INVALID: 'Khóa Groq không hợp lệ. Kiểm tra khóa API trong cài đặt máy chủ.',
  PERMISSION_DENIED: 'Groq từ chối quyền truy cập. Kiểm tra quyền và giới hạn của khóa API.',
  QUOTA_EXCEEDED: 'Groq đã đạt giới hạn lượt gọi hoặc hạn mức sử dụng. Vui lòng thử lại sau.',
  MODEL_NOT_FOUND: 'Không tìm thấy mô hình Groq đã cấu hình hoặc tài khoản chưa được cấp quyền sử dụng.',
  INVALID_REQUEST: 'Groq không chấp nhận cấu hình yêu cầu. Cần kiểm tra cấu hình mô hình trên máy chủ.',
  PROVIDER_UNAVAILABLE: 'Dịch vụ Groq tạm thời không khả dụng. Vui lòng thử lại sau.',
  TIMEOUT: 'Groq phản hồi quá chậm. Vui lòng thử lại.',
  NETWORK_ERROR: 'Máy chủ chưa kết nối được với Groq. Vui lòng thử lại.',
  INCOMPLETE_RESPONSE: 'Groq chưa trả về phân tích hoàn chỉnh. Vui lòng thử lại.',
  INVALID_RESPONSE: 'Phân tích Groq chưa khớp với câu được chọn. Vui lòng thử lại.'
};

const sentenceCache = new Map();
const pendingSentences = new Map();

function failure(code, status) { return Object.assign(new Error(code), { code, status }); }

export function validContext(input) {
  return input && ['en', 'vi'].includes(input.lang) && typeof input.word === 'string' && input.word.trim() && input.word.length <= 100
    && typeof input.sentence === 'string' && input.sentence.length <= 2000
    && Number.isInteger(input.start) && Number.isInteger(input.end) && input.start >= 0 && input.end > input.start
    && input.end <= input.sentence.length && input.sentence.slice(input.start, input.end) === input.word;
}

export async function analyzeContext(input) {
  if (!validContext(input)) throw new Error('Invalid selection');
  const model = process.env.GROQ_MODEL?.trim() || 'groq/compound';
  const sentenceKey = JSON.stringify([model, input.lang, input.sentence]);

  let sentenceResult;
  if (sentenceCache.has(sentenceKey)) {
    sentenceResult = sentenceCache.get(sentenceKey);
  } else if (pendingSentences.has(sentenceKey)) {
    sentenceResult = await pendingSentences.get(sentenceKey);
  } else {
    const task = runSentenceAnalysis(input.sentence, input.lang, model);
    pendingSentences.set(sentenceKey, task);
    try {
      sentenceResult = await task;
      if (sentenceResult.source === 'semantic') {
        if (sentenceCache.size >= 100) sentenceCache.delete(sentenceCache.keys().next().value);
        sentenceCache.set(sentenceKey, sentenceResult);
      }
    } finally {
      pendingSentences.delete(sentenceKey);
    }
  }

  const reference = localWordLookup(input.word, input.lang) || localGrammarLookup(input.word, input.lang);

  if (sentenceResult.source !== 'semantic') {
    const fallbackMeaning = input.lang === 'en'
      ? (reference?.meaning || 'Chưa xác định nghĩa trong câu')
      : (reference?.meaningEn || 'Chưa xác định nghĩa trong câu');
    const fallbackMeaningEn = input.lang === 'en'
      ? (reference?.meaningEn || reference?.meaning || 'Chưa xác định nghĩa trong câu')
      : (reference?.meaning || 'Chưa xác định nghĩa trong câu');
    const fallbackUsage = input.lang === 'en'
      ? (reference?.usage || reference?.translationGuide || 'Hãy thử lại khi kết nối phân tích ngữ cảnh sẵn sàng.')
      : (reference?.translationGuide || reference?.usage || 'Hãy thử lại khi kết nối phân tích ngữ cảnh sẵn sàng.');

    return {
      word: input.word, lang: input.lang, source: 'general-fallback',
      errorCode: sentenceResult.errorCode, notice: `${errorNotices[sentenceResult.errorCode]} (${sentenceResult.errorCode})`,
      meaning: fallbackMeaning, meaningEn: fallbackMeaningEn,
      usage: fallbackUsage, translationGuide: fallbackUsage,
      pos: reference?.pos || null, ipa: reference?.ipa || null,
      examples: reference?.examples || [], generalReference: reference
    };
  }

  const tokenKey = `${input.start}:${input.end}`;
  const targetAnalysis = sentenceResult.tokenMap?.[tokenKey] || findFallbackAnalysis(input, sentenceResult.items);

  if (!targetAnalysis) {
    const errorCode = 'INVALID_RESPONSE';
    const fallbackMeaning = input.lang === 'en'
      ? (reference?.meaning || 'Chưa xác định nghĩa trong câu')
      : (reference?.meaningEn || 'Chưa xác định nghĩa trong câu');
    const fallbackMeaningEn = input.lang === 'en'
      ? (reference?.meaningEn || reference?.meaning || 'Chưa xác định nghĩa trong câu')
      : (reference?.meaning || 'Chưa xác định nghĩa trong câu');
    const fallbackUsage = input.lang === 'en'
      ? (reference?.usage || reference?.translationGuide || 'Hãy thử lại khi kết nối phân tích ngữ cảnh sẵn sàng.')
      : (reference?.translationGuide || reference?.usage || 'Hãy thử lại khi kết nối phân tích ngữ cảnh sẵn sàng.');

    return {
      word: input.word, lang: input.lang, source: 'general-fallback',
      errorCode, notice: `${errorNotices[errorCode]} (${errorCode})`,
      meaning: fallbackMeaning, meaningEn: fallbackMeaningEn,
      usage: fallbackUsage, translationGuide: fallbackUsage,
      pos: reference?.pos || null, ipa: reference?.ipa || null,
      examples: reference?.examples || [], generalReference: reference
    };
  }

  return {
    ...targetAnalysis,
    sentenceAnalyses: sentenceResult.allTokenAnalyses
  };
}

async function runSentenceAnalysis(sentence, lang, model) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { source: 'general-fallback', errorCode: 'MISSING_KEY' };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Respond strictly in JSON format as specified.\nInput: ${JSON.stringify({ sentence, lang })}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      let details;
      try { details = await response.json(); } catch {}
      const msg = details?.error?.message || '';
      const codeStr = details?.error?.code;
      const invalidKey = codeStr === 'invalid_api_key' || msg.includes('API key') || response.status === 401;
      const code = invalidKey ? 'API_KEY_INVALID'
        : ({ 400: 'INVALID_REQUEST', 403: 'PERMISSION_DENIED', 404: 'MODEL_NOT_FOUND', 429: 'QUOTA_EXCEEDED' })[response.status] || 'PROVIDER_UNAVAILABLE';
      throw failure(code, response.status);
    }

    const responseData = await response.json();
    const choice = responseData.choices?.[0];
    if (choice?.finish_reason !== 'stop') throw failure('INCOMPLETE_RESPONSE');

    let contentText = choice?.message?.content || '';
    if (contentText.includes('```')) {
      contentText = contentText.replace(/```json/gi, '').replace(/```/g, '').trim();
    }
    const parsed = JSON.parse(contentText);
    const rawItems = parsed.items || parsed.words || parsed.phrases;
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw failure('INVALID_RESPONSE');

    const items = [];
    for (const item of rawItems) {
      if (typeof item.phrase !== 'string' || !item.phrase.trim()) continue;
      if (typeof item.meaningVi !== 'string' || typeof item.meaningEn !== 'string' || typeof item.pos !== 'string' || typeof item.usageVi !== 'string') continue;
      const examples = Array.isArray(item.examples) ? item.examples.filter(ex => typeof ex.en === 'string' && typeof ex.vi === 'string').slice(0, 2) : [];
      items.push({
        phrase: item.phrase,
        meaningVi: item.meaningVi,
        meaningEn: item.meaningEn,
        pos: item.pos,
        usageVi: item.usageVi,
        examples
      });
    }

    if (items.length === 0) throw failure('INVALID_RESPONSE');

    const tokens = tokenizeText(sentence, lang).filter(t => !t.isPunctuation);
    const tokenMap = {};
    const allTokenAnalyses = [];

    for (const token of tokens) {
      const matched = findItemForToken(token, items, sentence);
      if (matched) {
        const analysis = {
          word: token.text,
          lang,
          start: token.start,
          end: token.end,
          source: 'semantic',
          phrase: matched.item.phrase,
          phraseStart: matched.phraseStart,
          phraseEnd: matched.phraseEnd,
          sentence,
          meaning: matched.item.meaningVi,
          meaningEn: matched.item.meaningEn,
          pos: matched.item.pos,
          usage: matched.item.usageVi,
          translationGuide: matched.item.usageVi,
          examples: matched.item.examples
        };
        tokenMap[`${token.start}:${token.end}`] = analysis;
        allTokenAnalyses.push(analysis);
      }
    }

    return { source: 'semantic', items, tokenMap, allTokenAnalyses };

  } catch (error) {
    const errorCode = errorNotices[error.code] ? error.code
      : ['TimeoutError', 'AbortError'].includes(error.name) ? 'TIMEOUT'
      : error instanceof TypeError && error.message === 'fetch failed' ? 'NETWORK_ERROR' : 'INVALID_RESPONSE';
    console.warn('Groq contextual lookup failed', { code: errorCode, ...(error.status ? { httpStatus: error.status } : {}) });
    return { source: 'general-fallback', errorCode };
  }
}

function findItemForToken(token, items, sentence) {
  for (const item of items) {
    let phraseStart = sentence.indexOf(item.phrase);
    while (phraseStart >= 0) {
      const phraseEnd = phraseStart + item.phrase.length;
      if (phraseStart <= token.start && phraseEnd >= token.end) {
        return { item, phraseStart, phraseEnd };
      }
      phraseStart = sentence.indexOf(item.phrase, phraseStart + 1);
    }
  }
  for (const item of items) {
    if (item.phrase.toLowerCase() === token.text.toLowerCase()) {
      const phraseStart = sentence.indexOf(token.text);
      if (phraseStart >= 0) return { item, phraseStart, phraseEnd: phraseStart + token.text.length };
    }
  }
  return null;
}

function findFallbackAnalysis(input, items) {
  for (const item of items) {
    let phraseStart = input.sentence.indexOf(item.phrase);
    while (phraseStart >= 0) {
      const phraseEnd = phraseStart + item.phrase.length;
      if (phraseStart <= input.start && phraseEnd >= input.end) {
        return {
          word: input.word,
          lang: input.lang,
          start: input.start,
          end: input.end,
          source: 'semantic',
          phrase: item.phrase,
          phraseStart,
          phraseEnd,
          sentence: input.sentence,
          meaning: item.meaningVi,
          meaningEn: item.meaningEn,
          pos: item.pos,
          usage: item.usageVi,
          translationGuide: item.usageVi,
          examples: item.examples
        };
      }
      phraseStart = input.sentence.indexOf(item.phrase, phraseStart + 1);
    }
  }
  return null;
}
