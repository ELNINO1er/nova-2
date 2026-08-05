import React, { useState, useEffect } from 'react';
import { Pill, Check, Clock, X, AlertTriangle, Award, Bell, CheckCircle2, Moon, Sun } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function PPilulier({ data, onReload, notify, pills, setPills, card, sub, darkMode }) {
  const pillColorMap = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500', purple: 'bg-purple-500' };
  const meds = data?.length ? data.map((item) => ({
    id: item.id,
    n: item.name,
    d: item.dosage,
    t: item.time,
    p: item.period,
    c: pillColorMap[item.color] || 'bg-blue-500',
    i: item.interaction,
    status: item.intake?.status || 'pending',
  })) : [];
  useEffect(() => {
    if (!data?.length) return;
    const statuses = {};
    data.forEach((item) => { statuses[item.id] = item.intake?.status || 'pending'; });
    setPills(statuses);
  }, [data, setPills]);
  const cnt = Object.values(pills).filter((status) => status === 'taken' || status === true).length;
  const missed = Object.values(pills).filter((status) => status === 'missed').length;
  const obs = meds.length ? Math.round((cnt / meds.length) * 100) : 0;
  const obsLabel = obs >= 80 ? 'Excellent' : obs >= 50 ? 'À améliorer' : obs > 0 ? 'Insuffisant' : '—';
  const obsColor = obs >= 80 ? 'text-emerald-600' : obs >= 50 ? 'text-amber-600' : 'text-red-600';
  const obsBadge = obs >= 80 ? 'bg-emerald-100 text-emerald-700' : obs >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const nextDue = meds.find((med) => !['taken', 'skipped', 'missed'].includes(pills[med.id] || med.status));
  const interactionMeds = meds.filter((m) => m.i);
  const markMedicationStatus = async (id, status) => {
    setPills({ ...pills, [id]: status });
    try {
      await patientApi.markMedication(id, { status });
      onReload?.(await patientApi.todayMedications());
      notify?.('Pilulier mis à jour');
    } catch (error) {
      notify?.(error.message || 'Erreur pilulier', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Pilulier Numérique</h2>
        <div className={`${card} border rounded-2xl p-8`}>
          <div className="animate-pulse space-y-4">
            {[0,1,2].map(i => <div key={i} className={`h-16 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pilulier Numérique</h2>
      {meds.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center justify-center text-center`}>
          <Pill className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun médicament programmé</p>
          <p className={`text-xs ${sub} mt-1`}>Vos prises apparaîtront ici une fois prescrites par votre médecin.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${card} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="font-bold text-lg">Aujourd'hui</h3><p className={`text-xs ${sub}`}>{cnt} / {meds.length} pris{missed ? ` — ${missed} oublié${missed > 1 ? 's' : ''}` : ''}</p></div>
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><Bell className="w-3 h-3" /> Prochain {nextDue?.t || 'terminé'}</span>
          </div>
          <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} mb-6 overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${obs}%` }}></div>
          </div>
          <div className="space-y-4">
            {['Matin','Midi','Soir'].map(per => {
              const pm = meds.filter(m => m.p === per);
              if (!pm.length) return null;
              const pending = pm.filter(m => !['taken','missed','skipped'].includes(pills[m.id] || m.status));
              const done    = pm.filter(m =>  ['taken','missed','skipped'].includes(pills[m.id] || m.status));
              return (
                <div key={per}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                    {per === 'Soir' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    {per} • {pm[0].t}
                    {pending.length === 0 && <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Terminé</span>}
                  </h4>
                  <div className="space-y-2">
                    {pm.map(m => {
                      const status = pills[m.id] || m.status || 'pending';
                      const isTaken = status === 'taken' || status === true;
                      const skipped = status === 'skipped';
                      const isMissed = status === 'missed';
                      const isDone = isTaken || skipped || isMissed;
                      return (
                      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isTaken ? 'bg-emerald-50 border-emerald-200' : isMissed ? 'bg-red-50 border-red-200' : skipped ? (darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200') : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isDone ? 'opacity-60' : ''}`}>
                        <div className={`w-2 h-12 rounded-full ${m.c} ${isDone ? 'opacity-50' : ''}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isDone ? 'line-through text-slate-400' : ''}`}>{m.n}</p>
                            {m.i && !isDone && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Interaction</span>}
                          </div>
                          <p className={`text-xs ${sub}`}>{m.d} • {m.t}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => markMedicationStatus(m.id, 'taken')} className={`w-9 h-9 rounded-full flex items-center justify-center ${isTaken ? 'bg-emerald-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} title="Pris">
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => markMedicationStatus(m.id, 'missed')} className={`w-9 h-9 rounded-full flex items-center justify-center ${isMissed ? 'bg-red-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} title="Oublié">
                            <X className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => markMedicationStatus(m.id, 'skipped')} className={`w-9 h-9 rounded-full flex items-center justify-center ${skipped ? 'bg-slate-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} title="Ignoré">
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className={`${card} border rounded-2xl p-6 text-center`}>
            <Award className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className={`text-5xl font-bold ${obsColor}`}>{obs}<span className="text-2xl">%</span></p>
            <p className={`text-xs ${sub} mt-2`}>Observance du jour</p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${obsBadge}`}>{obsLabel}</span>
          </div>
          {interactionMeds.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-red-900">Interaction détectée</h4>
                  <p className="text-xs mt-1 text-red-800">{interactionMeds.map(m => m.n).join(', ')} — Consultez votre médecin</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

