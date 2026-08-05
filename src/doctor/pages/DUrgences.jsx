import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Bell, Check, CheckCircle2, ChevronRight, Clock, Phone, Plus, Save, Search, ShieldAlert, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials } from '../../utils/format.js';

export default function DUrgences({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm, setShowForm]   = useState(false);
  const [form,     setForm]       = useState({ patientId: '', type: 'urgent', level: 'critical', title: '', body: '' });
  const [saving,   setSaving]     = useState(false);
  const [resolving, setResolving] = useState(null);

  const alerts  = Array.isArray(data) ? data : [];
  const patients = Array.isArray(patientsData) ? patientsData : [];
  const open    = alerts.filter(a => a.status === 'open');
  const resolved = alerts.filter(a => a.status === 'resolved');

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    if (!form.title)     return notify('Titre requis', 'error');
    setSaving(true);
    try {
      await doctorApi.createAlert(form);
      notify('Alerte créée');
      setShowForm(false);
      setForm({ patientId: '', type: 'urgent', level: 'critical', title: '', body: '' });
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await doctorApi.resolveAlert(id);
      notify('Alerte résolue');
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setResolving(null); }
  };

  const levelCfg = {
    critical: { label: 'Critique',  cls: 'bg-red-100 text-red-700',     border: 'border-red-200' },
    warning:  { label: 'Attention', cls: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    info:     { label: 'Info',      cls: 'bg-blue-100 text-blue-700',   border: 'border-blue-200' },
  };

  const typeLabels = { urgent: 'Urgence', chronic: 'Suivi chronique', followup: 'Relance', lab: 'Résultat labo', other: 'Autre' };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Urgences & Alertes</h2>
          <p className={`text-sm ${sub}`}>{open.length} alerte{open.length > 1 ? 's' : ''} ouverte{open.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle alerte
        </button>
      </div>

      {/* Contacts urgence rapides */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-red-600" /> Contacts urgence rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[{ l: 'SAMU', n: '15', c: 'red' }, { l: 'Pompiers', n: '18', c: 'orange' }, { l: 'Police', n: '17', c: 'blue' }, { l: 'Urgences CHU', n: '05 20 33 34 00', c: 'emerald' }].map(({ l, n, c }) => (
            <a key={l} href={`tel:${n}`}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all bg-${c}-50 border-${c}-200 hover:bg-${c}-100`}>
              <Phone className={`w-4 h-4 text-${c}-600`} />
              <p className={`text-xs font-bold text-${c}-700`}>{l}</p>
              <p className={`text-sm font-black text-${c}-600`}>{n}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className={`${card} border-2 border-red-200 rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /> Créer une alerte patient</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
              <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
                <option value="">Sélectionner...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Niveau *</label>
              <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={inp}>
                <option value="critical">🔴 Critique</option>
                <option value="warning">🟡 Attention</option>
                <option value="info">🔵 Information</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                <option value="urgent">Urgence</option>
                <option value="chronic">Suivi chronique</option>
                <option value="followup">Relance</option>
                <option value="lab">Résultat labo</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Titre *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Résumé de l'alerte..." className={inp} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Détails</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3}
              placeholder="Informations supplémentaires, actions à prendre..."
              className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><AlertCircle className="w-4 h-4" />Créer l'alerte</>}
            </button>
          </div>
        </div>
      )}

      {/* Alertes ouvertes */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : open.length === 0 && !showForm ? (
        <div className={`${card} border rounded-2xl p-8 flex flex-col items-center gap-2`}>
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          <p className="font-semibold text-emerald-600">Aucune alerte ouverte</p>
          <p className={`text-xs ${sub}`}>Tous vos patients sont à jour</p>
        </div>
      ) : (
        <div className="space-y-2">
          {open.map(a => {
            const lc = levelCfg[a.level] || levelCfg.warning;
            return (
              <div key={a.id} className={`${card} border-l-4 ${lc.border} rounded-2xl p-4 flex items-start gap-4`}>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${a.level === 'critical' ? 'bg-red-500 animate-pulse' : a.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-0.5">
                    <p className="font-bold text-sm">{a.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lc.cls}`}>{lc.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{typeLabels[a.type]}</span>
                    </div>
                  </div>
                  <p className={`text-xs ${sub}`}>{a.patientName} • {a.cmuNumber}</p>
                  {a.body && <p className={`text-xs ${sub} mt-1`}>{a.body}</p>}
                  <p className={`text-[10px] ${sub} mt-1`}>{new Date(a.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
                <button onClick={() => handleResolve(a.id)} disabled={resolving === a.id}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Résoudre
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Alertes résolues (collapsible) */}
      {resolved.length > 0 && (
        <div className={`${card} border rounded-2xl p-4`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-3`}>Résolues ({resolved.length})</p>
          <div className="space-y-2">
            {resolved.slice(0, 5).map(a => (
              <div key={a.id} className={`flex items-center gap-3 p-2 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} opacity-60`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{a.title}</p>
                  <p className={`text-[10px] ${sub}`}>{a.patientName}</p>
                </div>
                <p className={`text-[10px] ${sub} flex-shrink-0`}>{new Date(a.resolvedAt).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ASSISTANT IA MÉDECIN
   ════════════════════════════════════════════════════════════════ */
