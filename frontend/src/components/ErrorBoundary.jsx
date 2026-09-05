import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: '600px',
          margin: '4rem auto',
          padding: '2.5rem',
          background: 'white',
          borderRadius: '24px',
          border: '2px solid #f472b6',
          boxShadow: '0 20px 40px rgba(244, 114, 182, 0.2)',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🦄✨</div>
          <h2 style={{ color: '#0c4a6e', fontSize: '1.6rem', fontWeight: 800 }}>
            Kỳ Lân Uni Đã Khôi Phục Trạng Thái!
          </h2>
          <p style={{ color: '#475569', margin: '0.8rem 0 1.5rem', lineHeight: 1.6 }}>
            Ứng dụng đã tự động bảo vệ dữ liệu của bạn. Nhấp nút bên dưới để tiếp tục trải nghiệm nhé!
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.8rem 1.8rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #2563eb, #a855f7)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)'
            }}
          >
            <RefreshCw size={18} /> Tải lại ứng dụng
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
