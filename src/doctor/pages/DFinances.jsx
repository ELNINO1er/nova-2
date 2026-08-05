import React from 'react';
import { AlertCircle, BarChart3, FileDown, Star, TrendingUp } from 'lucide-react';

export default function DFinances({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-28 rounded-2xl`} />)}
      </div>
      <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />
    </div>
  );

  const { consultationFee, totalConsultations, monthConsultations, estimatedMonthRevenue, estimatedTotalRevenue, activePrescriptions, monthlyData = [] } = data;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);

  const kpis = [
    { l: 'Revenus estimés ce mois', v: `${fmt(estimatedMonthRevenue)} FCFA`, s: `${monthConsultations} consultations`, c: 'emerald', I: TrendingUp },
    { l: 'Revenus totaux estimés',  v: `${fmt(estimatedTotalRevenue)} FCFA`, s: `${totalConsultations} consult. total`, c: 'blue',    I: BarChart3 },
    { l: 'Tarif consultation',      v: `${fmt(consultationFee)} FCFA`,       s: 'Par consultation',           c: 'red',     I: Star },
    { l: 'Ordonnances actives',     v: activePrescriptions,                   s: 'En cours de validité',       c: 'purple',  I: FileDown },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Gestion financière</h2>
        <p className={`text-sm ${sub}`}>Estimations basées sur le tarif et les consultations enregistrées</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4`}>
            <div className={`w-9 h-9 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-2`}>
              <k.I className={`w-4 h-4 text-${k.c}-600`} />
            </div>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className="text-lg font-black mt-0.5 leading-tight">{k.v}</p>
            <p className={`text-xs mt-0.5 text-${k.c}-600 font-semibold`}>{k.s}</p>
          </div>
        ))}
      </div>

      {/* Graphique revenus mensuels */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Revenus estimés mensuels</h3>
        {monthlyData.length === 0 ? (
          <p className={`text-sm ${sub} text-center py-8`}>Pas encore de données</p>
        ) : (
          <div className="space-y-2">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <p className={`text-xs font-semibold w-16 flex-shrink-0 ${sub}`}>{m.month}</p>
                <div className={`flex-1 h-7 rounded-lg overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center px-2 transition-all"
                    style={{ width: `${(m.revenue / maxRev) * 100}%`, minWidth: m.revenue > 0 ? '2rem' : '0' }}>
                    {m.revenue > 0 && <span className="text-[10px] font-bold text-white truncate">{m.count} cons.</span>}
                  </div>
                </div>
                <p className={`text-xs font-bold w-28 text-right flex-shrink-0 ${m.revenue > 0 ? 'text-emerald-600' : sub}`}>
                  {fmt(m.revenue)} FCFA
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note estimation */}
      <div className={`${card} border rounded-2xl p-4 flex items-start gap-3`}>
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sub}`} />
        <p className={`text-xs ${sub}`}>
          Les montants affichés sont des <strong>estimations</strong> basées sur le tarif de consultation configuré ({fmt(consultationFee)} FCFA) multiplié par le nombre de consultations terminées. La gestion des paiements réels sera disponible en Phase 6.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RÉPUTATION & AVIS
   ════════════════════════════════════════════════════════════════ */
