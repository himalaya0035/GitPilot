import React, { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import './MobilePlaygroundBlocker.css';

const MOBILE_QUERY = '(max-width: 768px)';

function MobilePlaygroundBlocker() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="mobile-playground-blocker">
      <div className="mobile-playground-blocker-card">
        <div className="mobile-playground-blocker-icon">
          <Monitor size={32} />
        </div>
        <h2>Desktop Only</h2>
        <p>
          The GitPilot Playground is best experienced on a larger screen.
          Please switch to a desktop or tablet in landscape mode.
        </p>
      </div>
    </div>
  );
}

export default MobilePlaygroundBlocker;
