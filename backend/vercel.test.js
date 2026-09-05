import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/handler.js';

function response() {
  return { status: 0, body: null, writeHead(status) { this.status = status; }, end(body) { this.body = JSON.parse(body); } };
}
test('Vercel rewrites preserve dictionary query parameters', async () => {
  const res = response();
  await handler({ url: '/api/handler?route=word&word=friend&lang=en', method: 'GET' }, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.meaning, 'bạn');
});
test('Vercel accepts parsed JSON bodies and validates contextual selections', async () => {
  const res = response();
  await handler({ url: '/api/handler?route=word/context', method: 'POST', body: { word: 'so', sentence: 'Thank you so much.', start: 0, end: 2, lang: 'en' } }, res);
  assert.equal(res.status, 400);
});
test('Vercel parsed translation request reaches translation backend', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => Response.json([[['Xin chào!']]]);
  const res = response();
  await handler({ url: '/api/handler?route=translate', method: 'POST', body: { text: 'Hello Vercel!', sourceLang: 'en', targetLang: 'vi' } }, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.translation, 'Xin chào!');
});
