import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { apiMiddleware, translate, wordLookup } from './api.js';
import { detectLanguage, tokenizeText } from '../frontend/src/services/translator.js';
import { localTranslate, localWordLookup, localGrammarLookup } from './localData.js';

test('local datasets provide vocabulary, reverse lookups, and grammar example translations', () => {
  assert.equal(localWordLookup('tôi', 'vi').meaningEn, 'I / me');
  assert.equal(localWordLookup('toi', 'vi').meaningEn, 'I / me');
  assert.equal(localWordLookup('friend', 'en').meaning, 'bạn');
  assert.equal(localTranslate('Tôi là sinh viên.', 'vi'), 'I am a student.');
  assert.equal(localTranslate('She works at a bank.', 'en'), 'Cô ấy làm việc ở ngân hàng.');
  assert.ok(localGrammarLookup('Present Simple', 'en').usage.includes('S + V'));
  assert.equal(localTranslate('This unmatched sentence should not be guessed.', 'en'), null);
});
test('both translation providers can fail and a dataset sentence still translates', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { throw new Error('Offline'); };
  assert.equal(await translate('Tôi là sinh viên.', 'vi', 'en'), 'I am a student.');
  assert.equal((await wordLookup('tôi', 'vi')).source, 'local');
  await assert.rejects(translate('Unmatched offline sentence.', 'en', 'vi'));
});

test('detects both languages without confusing common English words', () => {
  assert.equal(detectLanguage('Hôm nay trời đẹp.'), 'vi');
  assert.equal(detectLanguage('xin chao ban'), 'vi');
  assert.equal(detectLanguage('I am on the bus.'), 'en');
  assert.equal(detectLanguage('Ban plastic bags.'), 'en');
});
test('tokens preserve punctuation, whitespace, compounds and contractions', () => {
  for (const [text, lang] of [["Let's learn!\n  Today.", 'en'], ['Hôm nay, mình đi dạo nhé!', 'vi']]) {
    const tokens = tokenizeText(text, lang);
    assert.equal(tokens.map(x => x.text).join(''), text);
    assert.ok(tokens.filter(x => !x.isPunctuation).every(x => x.lang === lang));
  }
  assert.ok(tokenizeText('đi dạo', 'vi').some(x => x.cleanText === 'đi dạo'));
});
test('translation falls back, rejects quota messages, and lookup returns real dictionary details', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async url => {
    if (url.includes('translate.googleapis')) throw new Error('Unavailable');
    return Response.json({ responseStatus: 200, responseData: { translatedText: 'Xin chào' } });
  };
  assert.equal(await translate('hello test', 'en', 'vi'), 'Xin chào');
  globalThis.fetch = async url => {
    if (url.includes('translate.googleapis')) throw new Error('Unavailable');
    return Response.json({ responseStatus: 429, responseData: { translatedText: 'QUOTA EXCEEDED' } });
  };
  await assert.rejects(translate('quota test', 'en', 'vi'));
  globalThis.fetch = async url => url.includes('dictionaryapi')
    ? Response.json([{ phonetic: '/test/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A trial.', example: 'This is a test.' }] }] }])
    : Response.json([[['bản dịch thử nghiệm']]]);
  const word = await wordLookup('test', 'en');
  assert.equal(word.pos, 'Danh từ');
  assert.equal(word.ipa, '/test/');
  assert.equal(word.examples[0].en, 'This is a test.');
  const vi = await wordLookup('kiểm tra', 'vi');
  assert.ok(vi.meaningEn);
  assert.ok(vi.translationGuide.includes(vi.meaningEn));
});
test('API rejects invalid language directions and malformed input', async t => {
  const server = http.createServer((req, res) => apiMiddleware(req, res, () => res.end()));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/translate`;
  for (const body of ['{', JSON.stringify({ text: 'hello', sourceLang: 'en', targetLang: 'en' }), JSON.stringify({ text: 'x'.repeat(501), sourceLang: 'en', targetLang: 'vi' })]) {
    const response = await fetch(url, { method: 'POST', body });
    assert.equal(response.status, 400);
  }
});
