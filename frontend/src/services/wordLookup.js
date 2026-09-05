const cache = new Map();
const keyFor = token => JSON.stringify([token.lang, token.sentence, token.start, token.end]);
export function lookupWord(token) { return cache.get(keyFor(token)) || null; }
export async function lookupWordAsync(token, signal) {
  const local = lookupWord(token);
  if (local) return local;
  const response = await fetch('/api/word/context', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ word: token.text, lang: token.lang, sentence: token.sentence, start: token.start, end: token.end })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Chưa thể phân tích ngữ cảnh.');
  // A temporary outage or missing API key must not poison the semantic cache.
  if (data.source === 'semantic') {
    if (Array.isArray(data.sentenceAnalyses)) {
      for (const item of data.sentenceAnalyses) {
        if (cache.size >= 500) cache.delete(cache.keys().next().value);
        cache.set(keyFor(item), item);
      }
    } else {
      if (cache.size >= 500) cache.delete(cache.keys().next().value);
      cache.set(keyFor(token), data);
    }
  }
  return cache.get(keyFor(token)) || data;
}
