import React from 'react';
import { Languages } from 'lucide-react';
export default function Navbar() {
  return <header className="navbar">
    <div className="brand"><div className="brand-icon" aria-label="Kỳ lân nhỏ"><span aria-hidden="true">🦄</span></div><div><div className="brand-title">Dịch bèo <span className="brand-badge">SỔ TAY DIỆU KỲ ✧</span></div><p className="brand-description">Mỗi ngày một câu. Mỗi trang một điều mới.</p></div></div>
    <div className="nav-tabs"><span className="nav-tab active"><Languages size={18} /> Dịch &amp; Học</span></div>
  </header>;
}



