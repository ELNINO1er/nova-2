import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export function PatientModal({ title, onClose, children, card, darkMode, maxWidth = 'max-w-3xl' }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  // Focus trap + Escape + body scroll lock
  useEffect(() => {
    previousFocus.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element
    const timer = setTimeout(() => {
      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable?.length) focusable[0].focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      previousFocus.current?.focus?.();
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label={title} onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-hidden="true"></div>
      <div ref={dialogRef} className={`relative w-full ${maxWidth} ${card} border rounded-2xl shadow-2xl overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, onCancel, onConfirm, card, darkMode }) {
  return (
    <PatientModal title={title} onClose={onCancel} card={card} darkMode={darkMode} maxWidth="max-w-md">
      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-5`}>{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className={`px-4 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Confirmer</button>
      </div>
    </PatientModal>
  );
}

export function DashSkeleton({ card, sub, darkMode }) {
  const pulse = 'animate-pulse rounded-lg';
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-5">
      <div className={`${pulse} h-36 ${darkMode ? 'bg-slate-800' : 'bg-red-100'} rounded-2xl`}></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} border rounded-2xl p-6`}><div className={`${pulse} ${block} h-44 w-44 rounded-full mx-auto`}></div></div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-5`}><div className={`${pulse} ${block} h-6 w-20 mb-2`}></div><div className={`${pulse} ${block} h-8 w-28 mb-3`}></div><div className={`${pulse} ${block} h-12 w-full`}></div></div>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-xl p-4 min-h-[92px]`}><div className={`${pulse} ${block} h-10 w-10 rounded-lg mb-3`}></div><div className={`${pulse} ${block} h-4 w-24`}></div></div>)}
      </div>
    </div>
  );
}

export function PageSkeleton({ darkMode }) {
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-4 animate-pulse">
      <div className={`h-10 w-48 rounded-lg ${block}`}></div>
      <div className={`h-64 rounded-2xl ${block}`}></div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`h-32 rounded-xl ${block}`}></div>
        <div className={`h-32 rounded-xl ${block}`}></div>
      </div>
    </div>
  );
}
