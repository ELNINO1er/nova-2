import React from 'react';
import { Heart, Activity, Droplet, Thermometer, Calendar, Video, Bell, MessageCircle, FileText, HeartPulse, Siren } from 'lucide-react';
import { capitalize, formatRelativeDate, dashboardStatusText, dashboardStatusClass } from '../../utils/format.js';
import { DashSkeleton } from '../../components/PatientModal.jsx';

export default function PDash({ data, loading, onRefresh, setPage, setShowQR, setShowVid, card, sub, darkMode }) {
  if (!data && loading !== false) return <DashSkeleton card={card} sub={sub} darkMode={darkMode} />;

  const vitalMeta = {
    blood_pressure: { label: 'Tension', Icon: Heart, color: 'red' },
    blood_glucose: { label: 'Glycémie', Icon: Droplet, color: 'blue' },
    heart_rate: { label: 'Fréquence', Icon: Activity, color: 'pink' },
    temperature: { label: 'Température', Icon: Thermometer, color: 'orange' },
  };
  const cm = { red: '#dc2626', blue: '#2563eb', pink: '#db2777', orange: '#ea580c' };

  const displayVitals = (data?.latestVitals || []).map((vital) => {
    const meta = vitalMeta[vital.type] || { label: vital.label, Icon: Activity, color: 'blue' };
    return {
      type: vital.type,
      label: meta.label,
      value: String(vital.value),
      unit: vital.unit || '',
      Icon: meta.Icon,
      color: meta.color,
      history: vital.history?.map((p) => p.value).filter(Number.isFinite) || [],
      status: vital.status,
      measuredAt: vital.measuredAt,
    };
  });

  const profile = data?.profile;
  const patientName = profile ? `${profile.firstName} ${profile.lastName}` : '—';
  const patientInitials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
    : '—';
  const patientLocation = profile ? `CMU: ${profile.cmuNumber} — ${profile.city}` : '';

  const healthScore = data?.healthScore ?? 0;
  const healthStatus = healthScore >= 80 ? 'normal' : healthScore >= 60 ? 'watch' : 'critical';
  const healthScoreLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'À surveiller' : 'Critique';
  const scoreDash = `${Math.round((healthScore / 100) * 264)} 264`;

  const remainingMedications = data?.todayMedications
    ? data.todayMedications.filter((m) => m.intake?.status !== 'taken').length
    : 0;
  const unreadMessages = data?.unreadMessages ?? 0;
  const documentsCount = data?.documentsCount ?? 0;

  const nextRdv = data?.nextAppointment;
  const hasVideoRdv = nextRdv?.mode === 'video';

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/20 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold border border-white/30">
              {patientInitials}
            </div>
            <div>
              <p className="text-red-100 text-sm">Bonjour</p>
              <h2 className="text-2xl md:text-3xl font-bold">{patientName}</h2>
              {patientLocation && <p className="text-red-100 text-sm mt-1">{patientLocation}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button onClick={onRefresh} className="bg-white/20 backdrop-blur text-white px-3 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-white/30 transition-colors" title="Rafraîchir">
                <Activity className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowQR(true)} className="bg-white text-red-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
              <Siren className="w-4 h-4" /> Pass Santé d'urgence
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-1 ${card} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs ${sub}`}>Score de Santé</p>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke={darkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#hg)" strokeWidth="8" strokeDasharray={scoreDash} strokeLinecap="round" />
                <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{healthScore}</span>
                <span className={`text-xs ${sub}`}>/ 100</span>
                <span className={`text-xs font-semibold mt-1 ${dashboardStatusClass(healthStatus)}`}>{healthScoreLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayVitals.length > 0 ? displayVitals.map((vital) => {
            const hasHistory = vital.history.length >= 2;
            const pts = hasHistory
              ? (() => { const mx = Math.max(...vital.history), mn = Math.min(...vital.history), r = mx - mn || 1; return vital.history.map((v, idx) => `${(idx/(vital.history.length-1))*100},${100 - ((v-mn)/r)*80 - 10}`).join(' '); })()
              : '';
            return (
              <button key={vital.type} onClick={() => setPage('treatments')} className={`${card} border rounded-2xl p-5 text-left hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs ${sub}`}>{vital.label}</p>
                  <vital.Icon className={`w-4 h-4 ${sub}`} />
                </div>
                <p className="text-2xl font-bold">{vital.value} <span className={`text-sm font-normal ${sub}`}>{vital.unit}</span></p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold ${dashboardStatusClass(vital.status)}`}>{dashboardStatusText(vital.status)}</span>
                  {vital.measuredAt && <span className={`text-[10px] ${sub}`}>{formatRelativeDate(vital.measuredAt)}</span>}
                </div>
                {hasHistory && (
                  <div className="mt-3 h-12">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                      <polyline points={pts} fill="none" stroke={cm[vital.color]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          }) : (
            <div className={`sm:col-span-2 ${card} border rounded-2xl p-8 flex flex-col items-center justify-center text-center`}>
              <HeartPulse className={`w-10 h-10 ${sub} mb-3`} />
              <p className={`text-sm font-semibold ${sub}`}>Aucune constante enregistrée</p>
              <p className={`text-xs ${sub} mt-1`}>Vos données apparaîtront ici après votre première consultation.</p>
            </div>
          )}
        </div>
      </div>

      {nextRdv && (
        <div className={`${card} border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4`}>
          <div className={`w-14 h-14 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'} flex flex-col items-center justify-center flex-shrink-0`}>
            <span className="text-lg font-bold">{new Date(nextRdv.startsAt).getDate()}</span>
            <span className={`text-[10px] ${sub}`}>{capitalize(new Date(nextRdv.startsAt).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''))}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600 flex-shrink-0" />
              <h4 className="font-bold truncate">Prochain rendez-vous</h4>
            </div>
            <p className={`text-sm ${sub} mt-0.5`}>{nextRdv.doctorName} — {nextRdv.specialty}</p>
            <p className={`text-xs ${sub}`}>{new Date(nextRdv.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {nextRdv.location}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {nextRdv.mode === 'video' && (
              <button onClick={() => setShowVid(true)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-red-700">
                <Video className="w-3.5 h-3.5" /> Rejoindre
              </button>
            )}
            <button onClick={() => setPage('rdv')} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              Voir tout
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          hasVideoRdv
            ? {I:Video,l:'Téléconsultation',c:'from-blue-500 to-blue-600',on:() => setShowVid(true)}
            : {I:Video,l:'Téléconsultation',c:'from-slate-400 to-slate-500',on:() => setPage('rdv'),disabled:true},
          {I:Bell,l:`${remainingMedications} Rappel${remainingMedications > 1 ? 's' : ''}`,c:'from-orange-500 to-orange-600',on:() => setPage('pilulier')},
          {I:MessageCircle,l:`${unreadMessages} Message${unreadMessages > 1 ? 's' : ''}`,c:'from-purple-500 to-purple-600',on:() => setPage('messages')},
          {I:FileText,l:`${documentsCount} Document${documentsCount > 1 ? 's' : ''}`,c:'from-emerald-500 to-emerald-600',on:() => setPage('documents')}
        ].map((a, i) => (
          <button key={i} onClick={a.on} className={`${card} border rounded-xl p-4 min-h-[92px] flex flex-col items-start gap-3 text-left hover:scale-105 transition-transform ${a.disabled ? 'opacity-50' : ''}`}>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.c} flex items-center justify-center text-white shadow-md`}>
              <a.I className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold">{a.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
