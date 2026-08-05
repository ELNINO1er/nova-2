import React from 'react';
import { Pill, Clock, AlertTriangle, ChevronRight, CheckCircle2, HeartPulse, Calendar, CalendarClock } from 'lucide-react';
import { formatDate, capitalize } from '../../utils/format.js';

export default function PTreatments({ data, card, sub, darkMode }) {
  const colorMap = { red: { bar: 'bg-red-500', barGrad: 'bg-red-500', badge: 'bg-red-100 text-red-700' }, blue: { bar: 'bg-blue-500', barGrad: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' }, emerald: { bar: 'bg-emerald-500', barGrad: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' }, amber: { bar: 'bg-amber-500', barGrad: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' } };
  const colorKeys = ['red', 'blue', 'emerald', 'amber'];
  const ts = data?.length ? data.map((t, index) => {
    const c = colorKeys[index % colorKeys.length];
    return {
      n: t.diagnosis,
      s: t.stage || capitalize(t.status),
      pr: t.progress || 0,
      du: t.startedAt ? `Depuis ${formatDate(t.startedAt)}` : 'En cours',
      dr: t.doctorName || 'Médecin référent',
      m: t.medications?.map((m) => `${m.name} ${m.dosage || ''}`.trim()) || [],
      nc: t.nextCheckupAt ? formatDate(t.nextCheckupAt) : 'À planifier',
      c,
    };
  }) : [];

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mes Traitements</h2>
        {[0,1].map(i => <div key={i} className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-40 rounded-lg`}></div></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Mes Traitements</h2><p className={`text-sm ${sub}`}>Suivi de pathologies en cours</p></div>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{ts.length} actif{ts.length > 1 ? 's' : ''}</span>
      </div>
      {ts.length === 0 && (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center justify-center text-center`}>
          <HeartPulse className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun traitement en cours</p>
          <p className={`text-xs ${sub} mt-1`}>Vos traitements apparaîtront ici une fois prescrits.</p>
        </div>
      )}
      {ts.map((t, i) => {
        const colors = colorMap[t.c] || colorMap.red;
        return (
        <div key={i} className={`${card} border rounded-2xl p-6 relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${colors.bar}`}></div>
          <div className="space-y-4 pl-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{t.n}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>{t.s}</span>
              </div>
              <p className={`text-xs ${sub}`}>{t.du} • {t.dr}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-semibold">Progression</span><span className="text-xs font-bold">{t.pr}%</span></div>
              <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                <div className={`h-full ${colors.barGrad}`} style={{ width: `${t.pr}%` }}></div>
              </div>
            </div>
            {t.m.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase mb-2">Médicaments</h4>
                <div className="flex flex-wrap gap-2">
                  {t.m.map((m, mi) => (
                    <span key={mi} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center gap-1.5`}>
                      <Pill className="w-3 h-3 text-red-600" /> {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center gap-3`}>
              <CalendarClock className="w-5 h-5 text-red-600" />
              <div className="flex-1"><p className="text-xs font-bold">Prochain contrôle</p><p className={`text-xs ${sub}`}>{t.nc}</p></div>
            </div>
          </div>
        </div>
      );})}
    </div>
  );
}

