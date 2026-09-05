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
test('context request, full-sentence analysis, deduplication and whole-sentence cache reuse', async t => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GROQ_API_KEY;
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey; });
  process.env.GROQ_API_KEY = 'test-only';
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.includes('api.groq.com/openai/v1/chat/completions'));
    const request = JSON.parse(options.body);
    const rawMsg = request.messages[1].content;
    const userPayload = JSON.parse(rawMsg.slice(rawMsg.indexOf('{')));
    assert.equal(userPayload.sentence, 'So I thanked you so much.');
    const items = [
      { phrase: 'So', meaningVi: 'Vì thế', meaningEn: 'Therefore', pos: 'Liên từ', usageVi: 'Đứng đầu câu.', examples: [{ en: 'So I left.', vi: 'Vì thế tôi rời đi.' }] },
      { phrase: 'so much', meaningVi: 'rất nhiều', meaningEn: 'very much', pos: 'Trạng từ', usageVi: 'Nhấn mạnh mức độ.', examples: [{ en: 'Thank you so much.', vi: 'Cảm ơn bạn rất nhiều.' }] }
    ];
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ items }) } }] });
  };
  const sentence = 'So I thanked you so much.';
  const input = { word: 'so', sentence, lang: 'en', start: 17, end: 19 };
  const [one, two] = await Promise.all([analyzeContext(input), analyzeContext(input)]);
  assert.equal(one.meaning, 'rất nhiều'); assert.equal(two.phrase, 'so much'); assert.equal(calls, 1);
  const firstWordResult = await analyzeContext({ ...input, word: 'So', start: 0, end: 2 });
  assert.equal(firstWordResult.meaning, 'Vì thế');
  assert.equal(calls, 1, 'Sentence analysis must be reused across all word hovers in the sentence');
});
test('missing key and malformed model results are explicit fallback, not contextual meanings', async t => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GROQ_API_KEY;
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey; });
  delete process.env.GROQ_API_KEY;
  const input = { word: 'so', sentence: 'I miss you so much.', lang: 'en', start: 11, end: 13 };
  assert.equal((await analyzeContext(input)).source, 'general-fallback');
  process.env.GROQ_API_KEY = 'test-only';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }); };
  assert.equal((await analyzeContext(input)).source, 'general-fallback');
  assert.equal(calls, 1, 'missing-key fallback must not be cached');
  globalThis.fetch = async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ items: [{ phrase: 'unrelated phrase', meaningVi: 'x', meaningEn: 'x', pos: 'x', usageVi: 'x', examples: [] }] }) } }] });
  assert.equal((await analyzeContext(input)).source, 'general-fallback');
});

test('provider failures return safe diagnostic codes without leaking credentials', async t => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GROQ_API_KEY;
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey; });
  process.env.GROQ_API_KEY = 'secret-test-value';
  const input = { word: 'birthday', sentence: 'Happy birthday!', lang: 'en', start: 6, end: 14 };
  for (const [status, expected] of [[400, 'INVALID_REQUEST'], [403, 'PERMISSION_DENIED'], [404, 'MODEL_NOT_FOUND'], [429, 'QUOTA_EXCEEDED'], [503, 'PROVIDER_UNAVAILABLE']]) {
    globalThis.fetch = async () => Response.json({ error: { message: 'secret-test-value' } }, { status });
    const result = await analyzeContext(input);
    assert.equal(result.errorCode, expected);
    assert.ok(!JSON.stringify(result).includes('secret-test-value'));
  }
  globalThis.fetch = async () => Response.json({ error: { code: 'invalid_api_key', message: 'Invalid API key provided' } }, { status: 401 });
  assert.equal((await analyzeContext(input)).errorCode, 'API_KEY_INVALID');
  globalThis.fetch = async () => { throw new DOMException('Expired', 'TimeoutError'); };
  assert.equal((await analyzeContext(input)).errorCode, 'TIMEOUT');
});
