import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeText } from '../frontend/src/services/translator.js';
const setup = async t => {
  const oldFetch = globalThis.fetch;
  const keys = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];
  const previous = keys.map(k => process.env[k]);
  keys.forEach(k => { process.env[k] = 'test-key'; });
  t.after(() => { globalThis.fetch = oldFetch; keys.forEach((k, i) => previous[i] === undefined ? delete process.env[k] : process.env[k] = previous[i]); });
  return import(`./semanticAgent.js?test=${Math.random()}`);
};
function analysis(payload) {
  return { entries: payload.tokens.map(t => ({ id: t.id, phrase: t.text.toLowerCase() === 'so' && t.start > 0 ? 'so much' : t.text, meaningVi: t.text.toLowerCase() === 'so' ? t.start === 0 ? 'vì thế' : 'rất nhiều' : 'nghĩa', meaningEn: 'meaning', posVi: 'Từ', posEn: 'Word', usageVi: 'Cách dùng', usageEn: 'Usage', exampleVi: 'Cảm ơn rất nhiều.', exampleEn: 'Thank you so much.' })) };
}
const groqResponse = value => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });
test('all words and repeated occurrences share exactly one provider request', async t => {
  const { analyzeSentence, analyzeContext } = await setup(t);
  let calls = 0;
  globalThis.fetch = async (url, options) => { calls++; const body = JSON.parse(options.body); return groqResponse(analysis(JSON.parse(body.messages[1].content))); };
  const input = { sentence: 'So thank you so much.', lang: 'en' };
  const tokens = tokenizeText(input.sentence, input.lang).filter(t => !t.isPunctuation);
  const results = await Promise.all(tokens.map(t => analyzeContext({ ...input, word: t.text, start: t.start, end: t.end })));
  assert.equal(calls, 1);
  assert.equal(results[0].meaning, 'vì thế');
  assert.equal(results[3].meaning, 'rất nhiều');
  await analyzeSentence(input); assert.equal(calls, 1);
  await analyzeSentence({ ...input, sentence: 'Different sentence.' }); assert.equal(calls, 2);
});
test('Groq quota falls through Gemini unavailable to OpenAI; subsequent sentences skip cooled providers', async t => {
  const { analyzeSentence } = await setup(t);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.includes('groq')) return Response.json({}, { status: 429, headers: { 'retry-after': '60' } });
    if (url.includes('googleapis')) return Response.json({}, { status: 503 });
    const result = analysis(JSON.parse(JSON.parse(options.body).input));
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  };
  assert.equal((await analyzeSentence({ sentence: 'Hello there.', lang: 'en' })).provider, 'OpenAI');
  assert.equal(calls.length, 3);
  assert.equal((await analyzeSentence({ sentence: 'Hello again.', lang: 'en' })).provider, 'OpenAI');
  assert.equal(calls.length, 4);
});
test('missing providers are skipped and Gemini adapter parses a complete batch', async t => {
  const { analyzeSentence } = await setup(t);
  delete process.env.GROQ_API_KEY; delete process.env.OPENAI_API_KEY;
  globalThis.fetch = async (url, options) => {
    assert.ok(url.includes('googleapis'));
    const result = analysis(JSON.parse(JSON.parse(options.body).contents[0].parts[0].text));
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }] });
  };
  assert.equal((await analyzeSentence({ sentence: 'Xin chào.', lang: 'vi' })).provider, 'Gemini');
});
test('partial batches are rejected without spending on fallback providers', async t => {
  const { analyzeSentence } = await setup(t); let calls = 0;
  globalThis.fetch = async () => { calls++; return groqResponse({ entries: [] }); };
  const result = await analyzeSentence({ sentence: 'Hello world.', lang: 'en' });
  assert.equal(result.errorCode, 'INVALID_RESPONSE'); assert.equal(calls, 1);
  await analyzeSentence({ sentence: 'Hello world.', lang: 'en' }); assert.equal(calls, 1);
});
test('offset validation and no-key errors', async t => {
  const { validContext, analyzeSentence } = await setup(t);
  for (const sentence of ['🦄 Hôm nay đi dạo.', 'So, so much.']) for (const token of tokenizeText(sentence, 'vi')) assert.equal(sentence.slice(token.start, token.end), token.text);
  assert.equal(validContext({ sentence: 'Hello', word: 'no', start: 0, end: 2, lang: 'en' }), false);
  delete process.env.GROQ_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.OPENAI_API_KEY;
  assert.equal((await analyzeSentence({ sentence: 'Hello', lang: 'en' })).errorCode, 'MISSING_KEY');
});
test('browser shares in-flight sentence request across hovers and caller cancellation', async t => {
  const old = globalThis.fetch; t.after(() => globalThis.fetch = old);
  const client = await import(`../frontend/src/services/wordLookup.js?test=${Math.random()}`);
  const tokens = tokenizeText('Hello world.', 'en').filter(t => !t.isPunctuation);
  let finish, calls = 0;
  globalThis.fetch = async () => { calls++; await new Promise(resolve => finish = resolve); return Response.json({ source: 'semantic', entries: tokens.map(token => ({ ...token, word: token.text, source: 'semantic' })) }); };
  const controller = new AbortController();
  const first = client.lookupWordAsync(tokens[0], controller.signal);
  const second = client.lookupWordAsync(tokens[1]);
  controller.abort(); finish();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal((await second).word, 'world');
  assert.equal((await client.lookupWordAsync(tokens[0])).word, 'Hello');
  assert.equal(calls, 1);
});
