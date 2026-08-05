import React, { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Heart, HeartPulse, Phone, Plus } from 'lucide-react';

export default function DSuiviChroniques({ data, loading, onReload, notify, setPage, card, sub, border, darkMode }) {
  const [filter, setFilter] = useState('all'); // high | medium | low | all
  const patients = Array.isArray(data) ? data : [];

  const filtered = filter === 'all' ? patients : patients.filter(p => p.risk === filter);

  const riskCfg = {
    high:   { label: 'Critique',     cls: 'bg-red-100 text-red-700',     dot: 'bg-red-500',     bar: 'bg-red-500' },
    medium: { label: 'À surveiller', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',   bar: 'bg-amber-500' },
    low:    { label: 'Stable',       cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  };

  const counts = { high: patients.filter(p => p.risk === 'high').length, medium: patients.filter(p => p.risk === 'medium').length, low: patients.filter(p => p.risk === 'low').length };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Suivi des maladies chroniques</h2>
          <p className={`text-sm ${sub}`}>{patients.length} patients suivis</p>
        </div>
        <button onClick={onReload} className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
          <Activity className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[{ k: 'high', l: 'Critique', I: AlertCircle }, { k: 'medium', l: 'À surveiller', I: Clock }, { k: 'low', l: 'Stable', I: CheckCircle2 }].map(({ k, l, I }) => (
          <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
            className={`${card} border rounded-2xl p-4 text-left transition-all ${filter === k ? 'ring-2 ring-red-500' : ''}`}>
            <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${k === 'high' ? 'bg-red-100' : k === 'medium' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              <I className={`w-4 h-4 ${k === 'high' ? 'text-red-600' : k === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <p className="text-2xl font-black">{counts[k]}</p>
            <p className={`text-xs ${sub}`}>{l}</p>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-24 rounded-2xl`} />)}</div>
      ) : filtered.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <HeartPulse className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucun patient dans cette catégorie</p>
        </div>
      ) : filtered.map(pat => {
        const rc = riskCfg[pat.risk] || riskCfg.low;
        return (
          <div key={pat.id} className={`${card} border rounded-2xl p-4`}>
            <div className="flex items-start gap-4">
              {/* Avatar + risque */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-white flex items-center justify-center font-bold text-sm">
                  {(pat.firstName || '?')[0]}{(pat.lastName || '?')[0]}
                </div>
                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${rc.dot}`} />
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <div>
                    <p className="font-bold">{pat.firstName || 'Patient'} {pat.lastName || ''}</p>
                    <p className={`text-xs ${sub}`}>{pat.cmuNumber} • {pat.age} ans</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rc.cls}`}>{rc.label}</span>
                </div>
                {/* Maladies chroniques */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {(Array.isArray(pat.chronicDiseases) ? pat.chronicDiseases : []).map((d, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{d}</span>
                  ))}
                </div>
                {/* Dernière consultation */}
                <div className={`flex items-center gap-4 text-xs ${sub}`}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pat.lastConsult
                      ? `Dernière visite il y a ${pat.daysSince} jour${pat.daysSince > 1 ? 's' : ''}`
                      : 'Jamais consulté'}
                  </span>
                  {pat.phone && <a href={`tel:${pat.phone}`} className="flex items-center gap-1 text-blue-600 font-semibold hover:underline"><Phone className="w-3 h-3" />{pat.phone}</a>}
                </div>
                {pat.lastDiagnosis && <p className={`text-xs mt-1 text-red-600 font-medium`}>→ {pat.lastDiagnosis}</p>}
              </div>
              {/* Action rapide */}
              <button onClick={() => setPage('consultations')}
                className="flex-shrink-0 p-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Barre de risque */}
            {pat.daysSince !== null && (
              <div className="mt-3">
                <div className={`h-1.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                  <div className={`h-full rounded-full ${rc.bar} transition-all`}
                    style={{ width: `${Math.min((pat.daysSince / 180) * 100, 100)}%` }} />
                </div>
                <p className={`text-[10px] ${sub} mt-0.5`}>Délai depuis dernière visite ({pat.daysSince}j / 180j recommandés)</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   URGENCES MÉDECIN
   ════════════════════════════════════════════════════════════════ */
