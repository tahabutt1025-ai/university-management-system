import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root');

// Inject a skip-to-content link for keyboard/screen-reader accessibility
const skipLink = document.createElement('a');
skipLink.href = '#main-content';
skipLink.className = 'skip-link';
skipLink.textContent = 'Skip to main content';
document.body.insertBefore(skipLink, root);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
