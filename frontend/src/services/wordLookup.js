const cache = new Map(), pending = new Map();
const keyFor = token => JSON.stringify([token.lang, token.sentence]);
function select(result, token) {
  if (result.source === 'semantic') {
    const entry = result.entries.find(e => e.start === token.start && e.end === token.end);
    if (!entry) throw new Error('INVALID_RESPONSE');
    return entry;
  }
  return { ...result, word: token.text, lang: token.lang, examples: [] };
}
export function lookupWord(token) {
  const hit = cache.get(keyFor(token));
  return hit && hit.expires > Date.now() ? select(hit.data, token) : null;
}
export async function lookupWordAsync(token, signal) {
  // The caller's signal controls its UI subscription, NOT the shared request.
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const hit = lookupWord(token);
  if (hit) return hit;
  const key = keyFor(token);
  if (!pending.has(key)) {
    const task = (async () => {
      try {
        const response = await fetch('/api/sentence/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(58000), body: JSON.stringify({ lang: token.lang, sentence: token.sentence }) });
        const data = await response.json();
        if (!response.ok) throw new Error('INVALID_RESPONSE');
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, { data, expires: Date.now() + (data.source === 'semantic' ? 3600000 : data.retryAfterMs || 30000) });
        return data;
      } catch (error) {
        // Cache transport failures briefly too; crossing words must not flood the API.
        const data = { source: 'general-fallback', errorCode: error.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR', entries: [], retryAfterMs: 30000 };
        cache.set(key, { data, expires: Date.now() + 30000 });
        return data;
      } finally { pending.delete(key); }
    })();
    pending.set(key, task);
  }
  const result = await pending.get(key);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return select(result, token);
}
