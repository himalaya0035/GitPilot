import React, { useState, useEffect } from 'react';
import { X, FlaskConical, ExternalLink } from 'lucide-react';
import './PlaygroundHelper.css';

const HINTS_KEY = 'git-workflow-playground-hints';

function PlaygroundHelper() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [seenHints, setSeenHints] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HINTS_KEY) || '{}');
      setSeenHints(stored);
      if (!stored.welcomeDismissed) {
        setShowWelcome(true);
      }
    } catch {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    const updated = { ...seenHints, welcomeDismissed: true };
    setSeenHints(updated);
    localStorage.setItem(HINTS_KEY, JSON.stringify(updated));
  };

  if (!showWelcome) return null;

  return (
    <div className="playground-welcome-overlay" onClick={dismissWelcome}>
      <div className="playground-welcome-modal" onClick={e => e.stopPropagation()}>
        <button className="playground-welcome-close" onClick={dismissWelcome} aria-label="Close">
          <X size={18} />
        </button>
        <div className="playground-welcome-icon">
          <FlaskConical size={32} />
        </div>
        <h2>Welcome to GitPilot Playground!</h2>
        <p>This is an interactive mockup for you to try out GitPilot. Design workflows, run simulated executions, and explore the interface.</p>
        <ul className="playground-welcome-tips">
          <li>Drag branches from the sidebar to start building your workflow</li>
          <li>Switch to the <strong>Workflow Runner</strong> tab to simulate execution</li>
          <li>Sample workflows are pre-loaded to help you get started</li>
        </ul>
        <div className="playground-welcome-cta">
          <p className="playground-welcome-real">To run workflows on real repositories, check out the full version:</p>
          <a
            href="https://himalaya0035.github.io/gitpilot-landing/usage.html#installation"
            target="_blank"
            rel="noopener noreferrer"
            className="playground-welcome-link"
          >
            Getting Started Guide <ExternalLink size={14} />
          </a>
        </div>
        <button className="playground-welcome-start" onClick={dismissWelcome}>
          Try the Playground
        </button>
      </div>
    </div>
  );
}

export default PlaygroundHelper;
