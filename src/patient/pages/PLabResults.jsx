import React, { useState } from 'react';
import { Microscope, Clock, Check, Search, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../utils/format.js';

export default function PLabResults({ data, card, sub, border, darkMode }) {
  const [expanded, setExpanded] = useState(null);

  const statusStyle = {
    normal:   { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
    high:     { badge: 'bg-red-100 text-red-600',         bar: 'bg-red-500' },
    low:      { badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500' },
    critical: { badge: 'bg-red-200 text-red-700 font-bold', bar: 'bg-red-600' },
  };
  const statusLabel = { normal: 'Normal', high: 'Élevé', low: 'Bas', critical: 'Critique' };

  const reportStatusColor = {
    completed:  'bg-emerald-100 text-emerald-700',
    pending:    'bg-amber-100 text-amber-700',
    cancelled:  'bg-slate-100 text-slate-500',
  };
  const reportStatusLabel = { completed: 'Terminé', pending: 'En attente', cancelled: 'Annulé' };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Résultats de laboratoire</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-24 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Résultats de laboratoire</h2>
          <p className={`text-sm ${sub}`}>{data.length} analyse{data.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <Microscope className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun résultat disponible</p>
          <p className={`text-xs ${sub} mt-1`}>Vos analyses biologiques apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((report) => {
            const isOpen = expanded === report.id;
            const hasAbnormal = report.items.some(i => i.status !== 'normal');
            return (
              <div key={report.id} className={`${card} border rounded-2xl overflow-hidden`}>
                <button onClick={() => setExpanded(isOpen ? null : report.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/5 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <Microscope className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{report.title}</p>
                      {hasAbnormal && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">⚠ Valeurs anormales</span>}
                    </div>
                    <p className={`text-xs ${sub} mt-0.5`}>{report.laboratoryName} • {formatDate(report.performedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${reportStatusColor[report.status] || 'bg-slate-100 text-slate-500'}`}>
                      {reportStatusLabel[report.status] || report.status}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${sub} transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className={`border-t ${border} p-4`}>
                    {report.doctorName && (
                      <p className={`text-xs ${sub} mb-3`}>Prescrit par <strong>{report.doctorName}</strong></p>
                    )}
                    <div className="space-y-2">
                      {report.items.map((item) => {
                        const st = statusStyle[item.status] || statusStyle.normal;
                        return (
                          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${st.badge}`}>
                                  {statusLabel[item.status] || item.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-base font-bold">{item.value}</span>
                                {item.unit && <span className={`text-xs ${sub}`}>{item.unit}</span>}
                                {item.referenceRange && (
                                  <span className={`text-xs ${sub} ml-auto`}>Réf : {item.referenceRange}</span>
                                )}
                              </div>
                              {item.status !== 'normal' && (
                                <div className={`mt-1.5 h-1.5 w-full rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                  <div className={`h-1.5 rounded-full ${st.bar}`} style={{ width: item.status === 'critical' ? '100%' : '65%' }}></div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

