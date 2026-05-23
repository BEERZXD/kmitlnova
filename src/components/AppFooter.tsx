import { Github, Instagram } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-socials">
        <a href="https://github.com/BEERZXD" target="_blank" rel="noreferrer" aria-label="GitHub">
          <Github size={18} />
        </a>
        <a href="https://www.instagram.com/_bxxr.t/" target="_blank" rel="noreferrer" aria-label="Instagram">
          <Instagram size={18} />
        </a>
      </div>
      MADE WITH <span aria-label="love" role="img">❤️</span> BY{' '}
      <a href="https://www.instagram.com/_bxxr.t/" target="_blank" rel="noreferrer">
        _BXXR.T
      </a>
    </footer>
  );
}
