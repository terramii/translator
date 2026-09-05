import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContext, validContext } from './semanticAgent.js';
import { tokenizeText } from '../frontend/src/services/translator.js';

test('tokens carry exact source offsets, including Vietnamese compounds and repeated words', () => {
  for (const sentence of ['So I thanked you so much.', '🦄 Hôm nay mình đi dạo nhé!']) {
    const tokens = tokenizeText(sentence, sentence.includes('Hôm') ? 'vi' : 'en');
    for (const token of tokens) assert.equal(sentence.slice(token.start, token.end), token.text);
    const selections = tokens.filter(token => token.cleanText === 'so');
    if (selections.length === 2) assert.notEqual(selections[0].start, selections[1].start);
  }
});
test('rejects mismatched selection or excessive context', () => {
  assert.equal(validContext({ word: 'so', sentence: 'Thank you so much.', lang: 'en', start: 0, end: 2 }), false);
  assert.equal(validContext({ word: 'a', sentence: 'a'.repeat(2001), lang: 'en', start: 0, end: 1 }), false);
});
test('context request, phrase validation, deduplication and occurrence-specific cache', async t => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GEMINI_API_KEY;
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });
  process.env.GEMINI_API_KEY = 'test-only';
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.includes(':generateContent'));
    const request = JSON.parse(options.body);
    const selection = JSON.parse(request.contents[0].parts[0].text);
    assert.equal(selection.sentence, 'So I thanked you so much.');
    const result = { phrase: selection.start === 0 ? 'So' : 'so much', meaningVi: selection.start === 0 ? 'Vì thế' : 'rất nhiều', meaningEn: 'very much', pos: 'Trạng từ', usageVi: 'Nhấn mạnh mức độ.', examples: [{ en: 'Thank you so much.', vi: 'Cảm ơn bạn rất nhiều.' }] };
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }] });
  };
  const sentence = 'So I thanked you so much.';
  const input = { word: 'so', sentence, lang: 'en', start: 17, end: 19 };
  const [one, two] = await Promise.all([analyzeContext(input), analyzeContext(input)]);
  assert.equal(one.meaning, 'rất nhiều'); assert.equal(two.phrase, 'so much'); assert.equal(calls, 1);
  assert.equal((await analyzeContext({ ...input, word: 'So', start: 0, end: 2 })).meaning, 'Vì thế');
  assert.equal(calls, 2);
});
test('missing key and malformed model results are explicit fallback, not contextual meanings', async t => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GEMINI_API_KEY;
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });
  delete process.env.GEMINI_API_KEY;
  const input = { word: 'so', sentence: 'I miss you so much.', lang: 'en', start: 11, end: 13 };
  assert.equal((await analyzeContext(input)).source, 'general-fallback');
  process.env.GEMINI_API_KEY = 'test-only';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }); };
  assert.equal((await analyzeContext(input)).source, 'general-fallback');
  assert.equal(calls, 1, 'missing-key fallback must not be cached');
  globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ phrase: 'unrelated phrase', meaningVi: 'x', meaningEn: 'x', pos: 'x', usageVi: 'x', examples: [] }) }] } }] });
  assert.equal((await analyzeContext(input)).source, 'general-fallback');
});

test('provider failures return safe diagnostic codes without leaking credentials', async t => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GEMINI_API_KEY;
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });
  process.env.GEMINI_API_KEY = 'secret-test-value';
  const input = { word: 'birthday', sentence: 'Happy birthday!', lang: 'en', start: 6, end: 14 };
  for (const [status, expected] of [[400, 'INVALID_REQUEST'], [403, 'PERMISSION_DENIED'], [404, 'MODEL_NOT_FOUND'], [429, 'QUOTA_EXCEEDED'], [503, 'PROVIDER_UNAVAILABLE']]) {
    globalThis.fetch = async () => Response.json({ error: { message: 'secret-test-value' } }, { status });
    const result = await analyzeContext(input);
    assert.equal(result.errorCode, expected);
    assert.ok(!JSON.stringify(result).includes('secret-test-value'));
  }
  globalThis.fetch = async () => Response.json({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }, { status: 400 });
  assert.equal((await analyzeContext(input)).errorCode, 'API_KEY_INVALID');
  globalThis.fetch = async () => { throw new DOMException('Expired', 'TimeoutError'); };
  assert.equal((await analyzeContext(input)).errorCode, 'TIMEOUT');
});
