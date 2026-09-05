import React from 'react';

export default function MascotTip({ activeWord }) {
  return <aside className="mascot-container"><div className="mascot-avatar"><span aria-hidden="true">🦄</span></div><div className="mascot-content"><h4>Một chút phép màu, một từ mới</h4><p>{activeWord ? `Ghi lại một câu của riêng bạn với “${activeWord.text}”. Một ví dụ gần gũi sẽ giúp bạn nhớ lâu hơn.` : 'Rê chuột qua một từ để khám phá, bấm để ghim thẻ nghĩa. Thử đặt câu với từ mới để ghi nhớ mỗi ngày.'}</p></div><span className="notebook-doodle" aria-hidden="true">✧</span></aside>;
}


