import React from 'react';
import { AlertCircle, Brain, Calendar, ClipboardList, Heart, Star, ChevronRight, Users } from 'lucide-react';
import { initials } from '../../utils/format.js';

export default function DDash({ data, loading, setPage, card, sub, border, darkMode }) {
  if (loading || !data) return <DashSkeleton card={darkMode} />;

  const { todayAppointments = [], totalPatients = 0, monthConsultations = 0, avgRating = '—', recentConsultations = [] } = data;
  const waiting = todayAppointments.filter(a => a.status === 'confirmed').length;

  const kpis = [
    { l: 'Patients aujourd\'hui', v: todayAppointments.length, s: `${waiting} en attente`, c: 'red',     I: Users },
    { l: 'Consultations ce mois', v: monthConsultations,       s: 'Ce mois',               c: 'blue',    I: ClipboardList },
    { l: 'Patients suivis',       v: totalPatients,             s: 'Total',                 c: 'emerald', I: Heart },
    { l: 'Satisfaction',          v: avgRating,                 s: '/ 5 étoiles',           c: 'amber',   I: Star },
  ];

  const iaAlerts = [
    ...(todayAppointments.some(a => a.bloodType === 'O-') ? [{ t: 'Groupe rare O−', p: todayAppointments.find(a => a.bloodType === 'O-')?.patientName }] : []),
    { t: 'Tension critique possible', p: 'Kouamé Bamba' },
    { t: 'Suivi diabète requis', p: 'Kouamé Bamba' },
  ].slice(0, 3);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4`}>
            <div className={`w-9 h-9 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-2`}>
              <k.I className={`w-4 h-4 text-${k.c}-600`} />
            </div>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className="text-2xl font-bold mt-0.5">{k.v}</p>
            <p className={`text-xs mt-0.5 text-${k.c}-600 font-semibold`}>{k.s}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File d'attente */}
        <div className={`lg:col-span-2 ${card} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">File d'attente — Aujourd'hui</h3>
              <p className={`text-xs ${sub}`}>{todayAppointments.length} rendez-vous</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600">Live</span>
              <button onClick={() => setPage('agenda')} className={`ml-2 text-xs font-semibold text-red-600 flex items-center gap-1`}>
                Voir tout <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          {todayAppointments.length === 0 ? (
            <div className={`py-8 flex flex-col items-center gap-2 ${sub}`}>
              <Calendar className="w-8 h-8" />
              <p className="text-sm">Aucun rendez-vous aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((a, i) => (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {a.patientName.split(' ').map(x => x[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.patientName}</p>
                    <p className={`text-xs ${sub}`}>{a.cmuNumber} • {a.age} ans{a.mode === 'video' ? ' • Vidéo' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{new Date(a.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                      ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.status === 'confirmed' ? 'Confirmé' : a.status === 'cancelled' ? 'Annulé' : 'Demandé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IA + consultations récentes */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4" /><h3 className="font-bold text-sm">Alertes IA</h3></div>
            <div className="space-y-2">
              {iaAlerts.map((a, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-2 text-xs flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <div><p className="font-semibold">{a.t}</p>{a.p && <p className="text-purple-200">{a.p}</p>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} border rounded-2xl p-4`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-red-600" /> Consultations récentes
            </h3>
            <div className="space-y-2">
              {recentConsultations.slice(0, 4).map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="w-1.5 h-8 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.patientName}</p>
                    <p className={`text-[10px] ${sub} truncate`}>{c.diagnosisMain || 'Bilan'}</p>
                  </div>
                  <p className={`text-[10px] ${sub}`}>{new Date(c.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                </div>
              ))}
              {recentConsultations.length === 0 && <p className={`text-xs ${sub} text-center py-2`}>Aucune consultation</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashSkeleton({ card: isDark }) {
  const cls = `animate-pulse ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-2xl`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0,1,2,3].map(i => <div key={i} className={`${cls} h-28`} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${cls} h-64`} />
        <div className={`${cls} h-64`} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PATIENTS
   ════════════════════════════════════════════════════════════════ */
