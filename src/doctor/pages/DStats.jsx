import React from 'react';
import { Star, Stethoscope } from 'lucide-react';

export default function DStats({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0,1].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />)}
      </div>
    );
  }

  const { totalPatients = 0, totalConsultations = 0, avgRating = '—', ratingCount = 0, diagnoses = [], ratings = [] } = data;
  const maxDiag = Math.max(...diagnoses.map(d => d.count), 1);

  const kpiColors = ['red','blue','emerald','amber'];
  const kpis = [
    { l: 'Patients suivis',       v: totalPatients,       c: 'red' },
    { l: 'Consultations totales', v: totalConsultations,  c: 'blue' },
    { l: 'Satisfaction moyenne',  v: `${avgRating} / 5`,  c: 'emerald' },
    { l: 'Avis reçus',            v: ratingCount,         c: 'amber' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4`}>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className={`text-2xl font-bold mt-1 text-${k.c}-600`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-red-600" /> Pathologies traitées</h3>
          {diagnoses.length === 0 ? (
            <p className={`text-sm ${sub} text-center py-4`}>Pas de données</p>
          ) : (
            <div className="space-y-3">
              {diagnoses.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold truncate pr-2">{d.name}</span>
                    <span className={sub}>{d.count}</span>
                  </div>
                  <div className={`h-2.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                      style={{ width: `${(d.count / maxDiag) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Avis patients</h3>
          {ratings.length === 0 ? (
            <p className={`text-sm ${sub} text-center py-4`}>Aucun avis reçu</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r, i) => (
                <div key={i} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-500 fill-amber-500' : sub}`} />
                    ))}
                    <span className={`text-xs ${sub} ml-auto`}>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {r.comment && <p className={`text-xs ${sub}`}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PROFIL MÉDECIN
   ════════════════════════════════════════════════════════════════ */
