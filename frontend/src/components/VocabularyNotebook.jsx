import React, { useState } from 'react';
import { BookmarkCheck, Volume2, Trash2, BookOpen, Layers, Sparkles } from 'lucide-react';

export default function VocabularyNotebook({ savedVocab, onDeleteVocab, showToast }) {
  const [filter, setFilter] = useState('all'); // 'all', 'en', 'vi'
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});

  const validVocab = (savedVocab || []).filter(item => item && item.word);

  const filteredList = validVocab.filter(item => {
    if (filter === 'en') return item.lang === 'en';
    if (filter === 'vi') return item.lang === 'vi';
    return true;
  });

  const handlePlayAudio = (word, lang) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
    window.speechSynthesis.speak(utterance);
    showToast(`🔊 Đang đọc: ${word}`);
  };

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="notebook-container">
      <div className="notebook-header">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookmarkCheck style={{ color: '#2563eb' }} /> Sổ Từ Vựng Đã Lưu ({savedVocab.length})
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.2rem' }}>
            Lưu trữ từ mới để ôn tập và ghi nhớ dễ dàng hơn.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`preset-chip ${isFlashcardMode ? 'active' : ''}`}
            onClick={() => setIsFlashcardMode(!isFlashcardMode)}
            style={{
              background: isFlashcardMode ? '#2563eb' : 'white',
              color: isFlashcardMode ? 'white' : '#0369a1',
              fontWeight: 700
            }}
          >
            <Layers size={15} /> {isFlashcardMode ? 'Tắt Flashcard' : 'Chế Độ Flashcard'}
          </button>

          <div style={{ display: 'flex', gap: '0.3rem', background: '#f0f7ff', padding: '0.2rem', borderRadius: '999px' }}>
            <button
              className={`preset-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              style={{ background: filter === 'all' ? 'white' : 'transparent', border: 'none' }}
            >
              Tất cả ({savedVocab.length})
            </button>
            <button
              className={`preset-chip ${filter === 'en' ? 'active' : ''}`}
              onClick={() => setFilter('en')}
              style={{ background: filter === 'en' ? 'white' : 'transparent', border: 'none' }}
            >
              Tiếng Anh
            </button>
            <button
              className={`preset-chip ${filter === 'vi' ? 'active' : ''}`}
              onClick={() => setFilter('vi')}
              style={{ background: filter === 'vi' ? 'white' : 'transparent', border: 'none' }}
            >
              Tiếng Việt
            </button>
          </div>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>Chưa có từ vựng nào được lưu</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Hãy rê chuột hoặc nhấp vào bất kỳ từ nào trong phần Dịch để lưu từ vựng vào đây nhé!
          </p>
        </div>
      ) : (
        <div className="notebook-grid">
          {filteredList.map((item, idx) => {
            const isFlipped = flippedCards[item.word];
            const isEn = item.lang === 'en';

            return (
              <div
                key={idx}
                className="vocab-card"
                onClick={() => isFlashcardMode && toggleFlip(item.word)}
                style={{ cursor: isFlashcardMode ? 'pointer' : 'default' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="vocab-type">
                      {isEn ? 'Tiếng Anh' : 'Tiếng Việt'} • {item.pos || 'Từ vựng'}
                    </span>
                    
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(item.word, item.lang);
                        }}
                        title="Nghe đọc"
                      >
                        <Volume2 size={16} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteVocab(item.word);
                        }}
                        title="Xóa từ khỏi sổ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isFlashcardMode ? (
                    <div style={{ minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginTop: '0.5rem' }}>
                      <div className="vocab-word" style={{ fontSize: '1.4rem' }}>
                        {isFlipped ? (isEn ? item.meaning : item.meaningEn) : item.word}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                        {isFlipped ? 'Click để lật xem từ gốc' : 'Click để lật xem nghĩa'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="vocab-word" style={{ marginTop: '0.6rem' }}>
                        {item.word} {item.ipa && <span style={{ fontSize: '0.9rem', color: '#0284c7', fontWeight: 500 }}>{item.ipa}</span>}
                      </div>
                      <div className="vocab-meaning">
                        {isEn ? item.meaning : item.meaningEn}
                      </div>

                      {(item.usage || item.translationGuide) && (
                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.6rem', background: '#f8fafc', padding: '0.6rem', borderRadius: '8px' }}>
                          <strong>Mẹo dùng:</strong> {isEn ? item.usage : item.translationGuide}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
