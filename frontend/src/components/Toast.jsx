import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle2 size={18} color="#10b981" />,
    error: <AlertCircle size={18} color="#ef4444" />,
    info: <Info size={18} color="#6366f1" />
  };

  return (
    <div className="toast-container">
      <div className={`toast ${type}`}>
        {icons[type] || icons.info}
        <span style={{ flex: 1 }}>{message}</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
