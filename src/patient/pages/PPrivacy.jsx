import React, { useState, useEffect } from 'react';
import { Shield, Eye, Lock, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

const STATUS_MAP = {
  granted: { label: 'Accorde', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-900/30 text-emerald-300' },
  pending: { label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700', dark: 'bg-amber-900/30 text-amber-300' },
  revoked: { label: 'Revoque', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 text-red-700', dark: 'bg-red-900/30 text-red-300' },
};

export default function PPrivacy({ data, onReload, notify, card, sub, darkMode }) {
  const [tab, setTab] = useState('consents');
  const [consents, setConsents] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!data) return;
    setConsents(Array.isArray(data.consents) ? data.consents : []);
    setLogs(Array.isArray(data.accessLogs) ? data.accessLogs : []);
  }, [data]);

  const grant = async (id) => {
    try {
      await patientApi.grantConsent(id);
      onReload?.({ consents: await patientApi.consents(), accessLogs: await patientApi.accessLogs() });
      notify?.('Consentement accorde');
    } catch (error) {
      notify?.(error.message || 'Erreur', 'error');
    }
  };

  const revoke = async (id) => {
    try {
      await patientApi.revokeConsent(id);
      onReload?.({ consents: await patientApi.consents(), accessLogs: await patientApi.accessLogs() });
      notify?.('Consentement revoque');
    } catch (error) {
      notify?.(error.message || 'Erreur', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Confidentialite</h2>
        {[0, 1, 2].map(i => (
          <div key={i} className={`${card} border rounded-2xl p-5`}>
            <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-lg`}></div>
          </div>
        ))}
      </div>
    );
  }

  const tabs = [
    { key: 'consents', label: 'Consentements', icon: Shield },
    { key: 'logs', label: "Journal d'acces", icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Confidentialite</h2>
          <p className={`text-sm ${sub}`}>Gerez vos consentements et consultez les acces a votre dossier</p>
        </div>
        <div className={`p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex gap-1`}>
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${tab === t.key ? 'bg-red-600 text-white' : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'consents' && (
        <div className="space-y-3">
          {consents.length === 0 ? (
            <div className={`${card} border rounded-2xl p-8 flex flex-col items-center justify-center text-center`}>
              <Shield className={`w-16 h-16 ${sub} mb-4`} />
              <p className="font-semibold mb-1">Aucun consentement</p>
              <p className={`text-sm ${sub}`}>Aucune demande de consentement pour le moment.</p>
            </div>
          ) : (
            consents.map((c) => {
              const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
              const StIcon = st.icon;
              return (
                <div key={c.id} className={`${card} border rounded-2xl p-5`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border`}>
                      <Lock className={`w-5 h-5 ${st.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-bold">{c.doctorName || 'Medecin'}</h4>
                          <p className={`text-xs ${sub} mt-0.5`}>{c.scope || 'Acces au dossier medical'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${darkMode ? st.dark : st.bg}`}>
                          <StIcon className="w-3 h-3" /> {st.label}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {c.status !== 'granted' && (
                          <button onClick={() => grant(c.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Accorder
                          </button>
                        )}
                        {c.status !== 'revoked' && (
                          <button onClick={() => revoke(c.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Revoquer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className={`${card} border rounded-2xl overflow-hidden`}>
          {logs.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <Eye className={`w-16 h-16 ${sub} mb-4`} />
              <p className="font-semibold mb-1">Aucun acces enregistre</p>
              <p className={`text-sm ${sub}`}>Le journal des acces a votre dossier apparaitra ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${darkMode ? 'bg-slate-800' : 'bg-slate-50'} border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Utilisateur</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Donnees</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={l.id || i} className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className={`w-4 h-4 ${sub}`} />
                          <span className="font-medium">{l.userName || l.user || 'Inconnu'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${sub}`}>{l.action || 'Consultation'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${sub}`}>{l.dataAccessed || l.resource || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${sub}`}>
                          {l.accessedAt || l.createdAt ? new Date(l.accessedAt || l.createdAt).toLocaleString('fr-FR') : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
