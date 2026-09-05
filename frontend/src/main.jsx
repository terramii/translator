import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Auto-sanitize legacy corrupted localStorage
try {
  const v = localStorage.getItem('vietenglish_saved_vocab');
  if (v && (!v.startsWith('[') || v.includes('undefined') || v.includes('null'))) {
    localStorage.removeItem('vietenglish_saved_vocab');
  }
  const d = localStorage.getItem('vietenglish_dynamic_cache');
  if (d && (!d.startsWith('{') || d.includes('undefined') || d.includes('null'))) {
    localStorage.removeItem('vietenglish_dynamic_cache');
  }
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
