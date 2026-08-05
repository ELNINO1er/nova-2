import React, { useState } from 'react';
import { Brain, Plus, X, Save, AlertTriangle, Heart, HeartPulse, Users, Syringe, Stethoscope, Droplet, User } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function PDNA({ data, profile, onReload, notify, card, sub, border, darkMode }) {
  const bloodType = profile?.bloodType || '—';
  const [editing, setEditing]   = useState(null); // 'allergies' | 'chronicDiseases' | 'familyHistory' | 'surgicalHistory'
  const [input, setInput]       = useState('');
  const [saving, setSaving]     = useState(false);

  const mp = data || { allergies: [], chronicDiseases: [], familyHistory: [], surgicalHistory: [] };

  const sectionConfig = [
    { key: 'allergies',       label: 'Allergies',                icon: AlertTriangle,  color: 'red' },
    { key: 'chronicDiseases', label: 'Maladies chroniques',      icon: HeartPulse,     color: 'orange' },
    { key: 'familyHistory',   label: 'Antécédents familiaux',    icon: Users,          color: 'purple' },
    { key: 'surgicalHistory', label: 'Historique chirurgical',   icon: Stethoscope,    color: 'blue' },
  ];

  const colorMap = {
    red:    { bg: darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', btn: 'text-red-500 hover:text-red-700' },
    orange: { bg: darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', btn: 'text-orange-500 hover:text-orange-700' },
    purple: { bg: darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700', btn: 'text-purple-500 hover:text-purple-700' },
    blue:   { bg: darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', btn: 'text-blue-500 hover:text-blue-700' },
  };

  const saveSection = async (key, newList) => {
    setSaving(true);
    try {
      const updated = await patientApi.updateMedicalProfile({ [key]: newList });
      onReload?.(updated);
      notify?.('Profil médical mis à jour');
    } catch (e) {
      notify?.(e.message || 'Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
      setEditing(null);
      setInput('');
    }
  };

  const addItem = (key) => {
    const v = input.trim();
    if (!v) return;
    saveSection(key, [...(mp[key] || []), v]);
  };

  const removeItem = (key, idx) => {
    const list = (mp[key] || []).filter((_, i) => i !== idx);
    saveSection(key, list);
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ADN Médical</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-24 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ADN Médical</h2>

      {/* Blood type hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-6 relative overflow-hidden sm:col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
          <Droplet className="w-6 h-6 mb-2" />
          <p className="text-xs text-red-100">Groupe Sanguin</p>
          <p className="text-5xl font-black mt-1">{bloodType}</p>
        </div>
        <div className={`${card} border rounded-2xl p-5 sm:col-span-2 flex flex-col justify-center`}>
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Résumé du profil médical</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {sectionConfig.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-${s.color}-500 flex-shrink-0`}></span>
                <span className={sub}>{(mp[s.key] || []).length} {s.label.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sectionConfig.map(({ key, label, icon: Icon, color }) => {
          const items = mp[key] || [];
          const c = colorMap[color];
          const isEditing = editing === key;
          return (
            <div key={key} className={`${card} border rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                  <h3 className="font-bold text-sm">{label}</h3>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${c.badge}`}>{items.length}</span>
                </div>
                <button onClick={() => { setEditing(isEditing ? null : key); setInput(''); }}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  {isEditing ? 'Fermer' : '+ Ajouter'}
                </button>
              </div>

              {isEditing && (
                <div className="flex gap-2 mb-3">
                  <input
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addItem(key)}
                    placeholder={`Ajouter ${label.toLowerCase()}...`}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
                    autoFocus
                  />
                  <button onClick={() => addItem(key)} disabled={saving || !input.trim()}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">
                    OK
                  </button>
                </div>
              )}

              {items.length === 0 ? (
                <p className={`text-xs ${sub} italic py-2`}>Aucun élément renseigné.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
                      {item}
                      <button onClick={() => removeItem(key, idx)} className={`ml-0.5 ${c.btn}`} disabled={saving}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ RÉSULTATS LABO ============ */
