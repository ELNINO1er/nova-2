import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const Icon = ICONS[type] || ICONS.info;

  return (
    <div
      className={`fixed right-5 top-20 z-[80] rounded-xl border px-4 py-3 shadow-xl flex items-center gap-3 min-w-[280px] max-w-[400px]
        transition-all duration-300
        ${visible && !exiting ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
        ${STYLES[type] || STYLES.info}`}
      role="alert"
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <p className="text-xs font-bold flex-1">{message}</p>
      <button onClick={() => { setExiting(true); setTimeout(() => onClose?.(), 300); }}
        className="flex-shrink-0 opacity-60 hover:opacity-100" aria-label="Fermer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
