import React, { useState, useEffect } from 'react';
import './Notification.css';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  if (!message) return null;

  return (
    <div className={`notification ${type} ${isVisible ? 'visible' : ''}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {type === 'success' && <CheckCircle size={20} />}
          {type === 'error' && <XCircle size={20} />}
          {type === 'warning' && <AlertTriangle size={20} />}
          {type === 'info' && <Info size={20} />}
        </div>
        <span className="notification-message">{message}</span>
        <button className="notification-close" onClick={handleClose} aria-label="Close notification">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Notification;