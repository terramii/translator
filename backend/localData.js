import { readFileSync } from 'node:fs';

const readData = name => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const vocabulary = readData('vn_english_learning_db.json');
const grammar = readData('english_grammar_for_vietnamese_db.json');
const normalize = text => text.normalize('NFC').toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
const unaccented = text => normalize(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const viIndex = new Map(), enIndex = new Map(), sentences = new Map();
function add(index, key, value) { if (key && !index.has(key)) index.set(key, value); }
function sentence(en, vi) {
  if (!en || !vi) return;
  add(sentences, `en:${normalize(en)}`, vi);
  add(sentences, `vi:${normalize(vi)}`, en);
}
for (const entry of vocabulary) {
  add(viIndex, normalize(entry.word), entry);
  add(viIndex, entry.search_key, entry);
  for (const english of entry.english.replace(/\([^)]*\)/g, '').split(/[/;]/)) add(enIndex, normalize(english), entry);
  sentence(entry.example_en, entry.example_vi);
}
for (const topic of grammar) for (const example of topic.examples || []) sentence(example.en, example.vi);

export function localWordLookup(word, lang) {
  const key = normalize(word);
  const entry = lang === 'vi' ? viIndex.get(key) || viIndex.get(unaccented(key)) : enIndex.get(key);
  if (!entry) return null;
  const englishWords = ` ${normalize(entry.example_en || '').replace(/[^\p{L}\p{N}' ]/gu, ' ')} `;
  const examples = entry.example_en && entry.example_vi && (lang === 'vi' || englishWords.includes(` ${key} `)) ? [{ en: entry.example_en, vi: entry.example_vi }] : [];
  const topic = grammar.find(topic => topic.examples?.some(example => normalize(example.en) === normalize(entry.example_en || '')));
  return {
    word, lang, source: 'local', pos: lang === 'vi' ? entry.pos : 'Từ tiếng Anh',
    ...(lang === 'vi' ? { meaningEn: entry.english, translationGuide: `${entry.usage_vi} Cách diễn đạt tiếng Anh: ${entry.english}.` }
      : { meaning: entry.word, usage: `Trong dữ liệu song ngữ, “${word}” tương ứng với “${entry.word}”. Ghi chú về từ tiếng Việt tương ứng: ${entry.usage_vi}` }),
    examples, ...(topic ? { grammar: { title: topic.topic_vi, explanation: topic.explanation_vi, structure: topic.structure } } : {})
  };
}
export function localTranslate(text, sourceLang) {
  const sentence = sentences.get(`${sourceLang}:${normalize(text)}`);
  if (sentence) return sentence;
  const word = localWordLookup(text, sourceLang);
  return word ? (sourceLang === 'vi' ? word.meaningEn : word.meaning) : null;
}
export function localGrammarLookup(word, lang) {
  const key = normalize(word);
  const topic = grammar.find(topic => normalize(lang === 'en' ? topic.topic_en : topic.topic_vi) === key);
  if (!topic) return null;
  return { word, lang, source: 'local', meaning: topic.topic_vi, meaningEn: topic.topic_en,
    usage: `${topic.explanation_vi}\n${topic.structure}`, translationGuide: `${topic.explanation_vi}\n${topic.structure}`,
    examples: topic.examples, grammar: { title: topic.topic_vi, explanation: topic.common_mistakes_vi, structure: topic.structure } };
}
