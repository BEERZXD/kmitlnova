import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { WarningModal } from './components/WarningModal';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <WarningModal />
  </React.StrictMode>,
);
