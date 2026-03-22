import React, { useState } from 'react';
import { FlaskConical, X, ExternalLink } from 'lucide-react';
import './PlaygroundBanner.css';

function PlaygroundBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('playground-banner-dismissed') === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('playground-banner-dismissed', 'true');
    setDismissed(true);
    window.dispatchEvent(new Event('playground-banner-dismissed'));
  };

  return (
    <div className="playground-banner">
      <div className="playground-banner-content">
        <FlaskConical size={16} />
        <span className="playground-banner-text">
          <strong>Playground</strong> — This is a mockup. To use GitPilot on real repos, check out the full version.
        </span>
      </div>
      <div className="playground-banner-actions">
        <a
          href="https://himalaya0035.github.io/gitpilot-landing/usage.html#installation"
          target="_blank"
          rel="noopener noreferrer"
          className="playground-banner-link"
        >
          Get Started <ExternalLink size={13} />
        </a>
        <button
          className="playground-banner-close"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default PlaygroundBanner;
