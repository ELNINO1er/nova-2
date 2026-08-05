import React, { useState, useRef } from 'react';
import { Pill, Clock, Check, Printer, Search, ChevronRight, ChevronLeft, X, FileDown, AlertTriangle, AlertCircle, Download, FileText } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDate, initials } from '../../utils/format.js';

export default function POrdonnances({ data, card, sub, border, darkMode }) {
  const [filter, setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [qrLoading, setQrLoading] = useState('');

  const statusLabel = { active: 'Active', expired: 'Expirée', cancelled: 'Annulée' };
  const statusStyle = {
    active:    'bg-emerald-100 text-emerald-700',
    expired:   'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-600',
  };

  const prescriptions = data ?? [];
  const filtered = filter === 'all'
    ? prescriptions
    : prescriptions.filter((p) => p.status === filter);

  const daysLeft = (validUntil) => {
    if (!validUntil) return null;
    const diff = Math.ceil((new Date(validUntil) - Date.now()) / 86400000);
    return diff;
  };

  const handlePrint = (presc) => {
    setPrinting(presc);
    window.setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 300);
  };

  const showQr = async (presc) => {
    setQrLoading(presc.id);
    try {
      const data = await patientApi.prescriptionQR(presc.id);
      setQrModal(data);
    } finally {
      setQrLoading('');
    }
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Ordonnances</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className={`animate-pulse h-28 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Print overlay */}
      {printing && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[999]">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-red-700">NOVA — Carnet Santé Ivoirien</h1>
                <p className="text-slate-500 text-sm">Ordonnance médicale numérique</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Émise le {printing.issuedAt ? new Date(printing.issuedAt).toLocaleDateString('fr-FR') : '—'}</p>
                <p>Valable jusqu'au {printing.validUntil ? new Date(printing.validUntil).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="font-bold text-lg">{printing.doctorName}</p>
              <p className="text-slate-500">{printing.doctorSpecialty}</p>
            </div>
            <h3 className="font-bold mb-3 uppercase text-xs tracking-wider text-slate-400">Médicaments prescrits</h3>
            <div className="space-y-4">
              {printing.items.map((item, idx) => (
                <div key={item.id} className="p-4 border rounded-xl">
                  <p className="font-bold">{idx + 1}. {item.name} {item.dosage && `— ${item.dosage}`}</p>
                  {item.frequency && <p className="text-sm mt-1"><span className="font-semibold">Posologie :</span> {item.frequency}</p>}
                  {item.duration && <p className="text-sm"><span className="font-semibold">Durée :</span> {item.duration}</p>}
                  {item.instructions && <p className="text-sm text-slate-500 mt-1 italic">{item.instructions}</p>}
                </div>
              ))}
            </div>
            {printing.notes && <p className="mt-6 text-sm text-slate-500 border-t pt-4">{printing.notes}</p>}
          </div>
        </div>
      )}

      {qrModal && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/50 print:hidden" onClick={() => setQrModal(null)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-6 shadow-2xl text-center print:hidden`}>
            <p className="font-bold mb-1">QR ordonnance</p>
            <p className={`text-xs ${sub} mb-4`}>A presenter a la pharmacie</p>
            <img src={qrModal.qr} alt="QR ordonnance" className="mx-auto rounded-xl w-48 h-48" />
            <p className={`text-[10px] ${sub} mt-3 break-all`}>Token signe, sans donnees medicales visibles.</p>
            <textarea readOnly value={qrModal.token || ''} className={`mt-3 h-20 w-full resize-none rounded-lg border p-2 text-[10px] ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`} />
            <button onClick={() => setQrModal(null)} className="mt-4 w-full px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Fermer</button>
          </div>
        </>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Ordonnances</h2>
          <p className={`text-sm ${sub}`}>{prescriptions.filter(p => p.status === 'active').length} ordonnance{prescriptions.filter(p => p.status === 'active').length > 1 ? 's' : ''} active{prescriptions.filter(p => p.status === 'active').length > 1 ? 's' : ''}</p>
        </div>
        <div className={`flex rounded-xl overflow-hidden border ${border} text-sm font-semibold`}>
          {[['all','Toutes'], ['active','Actives'], ['expired','Expirées']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 transition-colors ${filter === v ? 'bg-red-600 text-white' : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50')}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center print:hidden`}>
          <FileText className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune ordonnance</p>
          <p className={`text-xs ${sub} mt-1`}>Vos ordonnances apparaîtront ici après vos consultations.</p>
        </div>
      ) : (
        <div className="space-y-3 print:hidden">
          {filtered.map((presc) => {
            const open = expanded === presc.id;
            const days = daysLeft(presc.validUntil);
            const expiringSoon = days !== null && days > 0 && days <= 14;
            return (
              <div key={presc.id} className={`${card} border rounded-2xl overflow-hidden transition-all
                ${presc.status === 'active' ? (darkMode ? 'border-emerald-800' : 'border-emerald-200') : ''}`}>
                {/* Header card */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                        ${presc.status === 'active' ? 'bg-emerald-100 text-emerald-700' : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">{presc.doctorName}</p>
                        {presc.doctorSpecialty && <p className={`text-xs ${sub}`}>{presc.doctorSpecialty}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[presc.status] || statusStyle.expired}`}>
                            {statusLabel[presc.status] || presc.status}
                          </span>
                          <span className={`text-[11px] ${sub}`}>
                            Émise le {new Date(presc.issuedAt).toLocaleDateString('fr-FR')}
                          </span>
                          {presc.validUntil && (
                            <span className={`text-[11px] font-semibold ${
                              expiringSoon ? 'text-amber-600' :
                              (days !== null && days <= 0) ? 'text-red-500' : sub
                            }`}>
                              {days !== null && days > 0
                                ? `Valable encore ${days} jour${days > 1 ? 's' : ''}`
                                : days !== null && days <= 0
                                ? 'Expirée'
                                : `Jusqu'au ${new Date(presc.validUntil).toLocaleDateString('fr-FR')}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => handlePrint(presc)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                          ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Download className="w-3.5 h-3.5" /> Imprimer
                      </button>
                      <button onClick={() => showQr(presc)} disabled={qrLoading === presc.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50
                          ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <FileDown className="w-3.5 h-3.5" /> QR
                      </button>
                      <button onClick={() => setExpanded(open ? null : presc.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                          ${open ? 'bg-red-600 text-white' : (darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}>
                        {open ? 'Réduire' : `Voir ${presc.items.length} méd.`}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Résumé médicaments (toujours visible) */}
                  {!open && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {presc.items.map((item) => (
                        <span key={item.id} className={`text-[11px] px-2 py-0.5 rounded-full font-medium
                          ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {item.name} {item.dosage && `${item.dosage}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Détail médicaments (expandable) */}
                {open && (
                  <div className={`border-t ${border} px-5 pb-5 pt-4`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${sub} mb-3`}>Médicaments prescrits</p>
                    <div className="space-y-3">
                      {presc.items.map((item, idx) => (
                        <div key={item.id} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                            ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{item.name}
                              {item.dosage && <span className={`ml-2 text-xs font-normal ${sub}`}>{item.dosage}</span>}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1.5">
                              {item.frequency && (
                                <p className={`text-xs ${sub}`}><span className="font-semibold">Posologie :</span> {item.frequency}</p>
                              )}
                              {item.duration && (
                                <p className={`text-xs ${sub}`}><span className="font-semibold">Durée :</span> {item.duration}</p>
                              )}
                            </div>
                            {item.instructions && (
                              <p className={`text-xs mt-1.5 italic ${darkMode ? 'text-amber-400' : 'text-amber-700'} flex gap-1`}>
                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                {item.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {presc.notes && (
                      <div className={`mt-3 p-3 rounded-xl text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-blue-800'} flex gap-2`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{presc.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ GRAPHIQUES CONSTANTES ============ */
