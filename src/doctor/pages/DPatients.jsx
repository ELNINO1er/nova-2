import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, ClipboardList, FileDown, HeartPulse, Microscope, Phone, Search, ShieldAlert, Stethoscope, User, Users, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials } from '../../utils/format.js';

export default function DPatients({ data, loading, onReload, setPage, card, sub, border, darkMode, notify }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [patFile,  setPatFile]  = useState(null);
  const [patLoading, setPatLoading] = useState(false);
  const [fileTab,  setFileTab]  = useState('profil');

  const patients = Array.isArray(data) ? data : [];
  const filtered = patients.filter(p =>
    !search ||
    `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.cmuNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const openFile = async (pat) => {
    setSelected(pat);
    setPatFile(null);
    setPatLoading(true);
    try {
      const full = await doctorApi.patient(pat.id);
      setPatFile(full);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setPatLoading(false);
    }
  };

  const fileTabs = [
    { id: 'profil',  label: 'Profil',        icon: User },
    { id: 'constantes', label: 'Constantes', icon: Activity },
    { id: 'medical', label: 'Dossier médical', icon: HeartPulse },
    { id: 'consult', label: 'Consultations', icon: ClipboardList },
    { id: 'labo',    label: 'Labo / Rx',     icon: Microscope },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Colonne gauche : recherche + liste */}
      <div className="lg:col-span-1">
        <div className={`${card} border rounded-2xl p-4 space-y-3`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Search className={`w-4 h-4 ${sub} flex-shrink-0`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, téléphone, CMU..."
              className="flex-1 bg-transparent outline-none text-sm" />
            {search && <button onClick={() => setSearch('')}><X className={`w-3 h-3 ${sub}`} /></button>}
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-12 rounded-xl`} />)}</div>
          ) : filtered.length === 0 ? (
            <p className={`text-xs ${sub} text-center py-4`}>Aucun patient trouvé</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(p => (
                <button key={p.id} onClick={() => openFile(p)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center gap-2 transition-all
                    ${selected?.id === p.id ? 'bg-red-600 text-white' : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {(p.firstName || '?')[0]}{(p.lastName || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.firstName || 'Patient'} {p.lastName || ''}</p>
                    <p className={`text-[10px] ${selected?.id === p.id ? 'text-red-100' : sub} truncate`}>{p.cmuNumber} • {p.age} ans</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Colonne droite : fiche patient */}
      <div className="lg:col-span-3">
        {!selected ? (
          <div className={`${card} border rounded-2xl p-12 flex flex-col items-center gap-3 text-center`}>
            <User className={`w-12 h-12 ${sub}`} />
            <p className="font-semibold">Sélectionnez un patient</p>
            <p className={`text-sm ${sub}`}>La fiche complète s'affichera ici</p>
          </div>
        ) : patLoading ? (
          <div className={`${card} border rounded-2xl p-6 space-y-3`}>
            {[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-16 rounded-xl`} />)}
          </div>
        ) : patFile ? (
          <div className="space-y-4">
            {/* Header patient */}
            <PatientHeader pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} onCons={() => setFileTab('consult')} />

            {/* Onglets */}
            <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-x-auto`}>
              {fileTabs.map(t => (
                <button key={t.id} onClick={() => setFileTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${fileTab === t.id ? `bg-white shadow text-red-600 ${darkMode ? '!bg-slate-700' : ''}` : sub}`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>

            {fileTab === 'profil'    && <PatientTabProfil    pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'constantes'&& <PatientTabConstantes pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'medical'   && <PatientTabMedical   pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'consult'   && <PatientTabConsult   pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'labo'      && <PatientTabLabo      pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PatientHeader({ pat, card, sub, border, darkMode }) {
  const hasAllergy = pat.medicalProfile?.allergies?.length > 0;
  return (
    <div className="space-y-2">
      {hasAllergy && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-3 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">ALLERGIES</p>
            <p className="text-xs text-red-100">{pat.medicalProfile.allergies.join(' • ')}</p>
          </div>
        </div>
      )}
      <div className={`${card} border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          {(pat.firstName || '?')[0]}{(pat.lastName || '?')[0]}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{pat.firstName || 'Patient'} {pat.lastName || ''}</h3>
          <p className={`text-xs ${sub}`}>{pat.cmuNumber}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
            <span><strong>{pat.age} ans</strong> • {pat.sex === 'M' ? 'Homme' : 'Femme'}</span>
            <span>Groupe : <strong className="text-red-600">{pat.bloodType || '—'}</strong></span>
            {pat.weightKg && <span>{pat.weightKg} kg • {pat.heightCm} cm</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pat.phone && (
            <a href={`tel:${pat.phone}`} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">
              <Phone className="w-3 h-3" /> Appeler
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientTabProfil({ pat, card, sub, border, darkMode }) {
  const fields = [
    { l: 'Date de naissance', v: pat.birthDate ? new Date(pat.birthDate).toLocaleDateString('fr-FR') : '—' },
    { l: 'Sexe',              v: pat.sex === 'M' ? 'Masculin' : 'Féminin' },
    { l: 'Groupe sanguin',    v: pat.bloodType || '—' },
    { l: 'Téléphone',         v: pat.phone || '—' },
    { l: 'Email',             v: pat.email || '—' },
    { l: 'Adresse',           v: pat.address ? `${pat.address}, ${pat.city}` : '—' },
    { l: 'Poids',             v: pat.weightKg ? `${pat.weightKg} kg` : '—' },
    { l: 'Taille',            v: pat.heightCm ? `${pat.heightCm} cm` : '—' },
    { l: 'Contact urgence',   v: pat.emergencyName ? `${pat.emergencyName} — ${pat.emergencyPhone}` : '—' },
  ];
  return (
    <div className={`${card} border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
      {fields.map((f, i) => (
        <div key={i}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>{f.l}</p>
          <p className="text-sm font-semibold mt-1">{f.v}</p>
        </div>
      ))}
    </div>
  );
}

function PatientTabConstantes({ pat, card, sub, border, darkMode }) {
  const types = ['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature'];
  const labels = { blood_pressure: 'Tension', blood_glucose: 'Glycémie', heart_rate: 'Fréq. cardiaque', temperature: 'Température' };
  const colors = { blood_pressure: '#dc2626', blood_glucose: '#2563eb', heart_rate: '#16a34a', temperature: '#d97706' };
  const units  = { blood_pressure: 'mmHg', blood_glucose: 'g/L', heart_rate: 'bpm', temperature: '°C' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {types.map(type => {
        const data = (pat.vitals || []).filter(v => v.type === type).slice(0, 12).reverse();
        const last = data[data.length - 1];
        const vals = data.map(v => Number(String(v.value).split('/')[0])).filter(Boolean);
        const mx = Math.max(...vals, 1), mn = Math.min(...vals);
        const pts = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * 96 + 2},${96 - ((v - mn) / (mx - mn || 1)) * 70 - 10}`).join(' ');
        return (
          <div key={type} className={`${card} border rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm">{labels[type]}</p>
              <span className={`text-xs ${sub}`}>{data.length} mesures</span>
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: colors[type] }}>
              {last?.value || '—'} <span className={`text-xs font-normal ${sub}`}>{units[type]}</span>
            </p>
            {vals.length > 1 && (
              <div className="h-24">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <polyline points={pts} fill="none" stroke={colors[type]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            {vals.length <= 1 && <p className={`text-xs ${sub} text-center py-4`}>Pas assez de données</p>}
          </div>
        );
      })}
    </div>
  );
}

function PatientTabMedical({ pat, card, sub, border, darkMode }) {
  const mp = pat.medicalProfile || {};
  const sections = [
    { key: 'allergies',       label: 'Allergies',                icon: AlertTriangle, color: 'red' },
    { key: 'chronicDiseases', label: 'Maladies chroniques',      icon: HeartPulse,    color: 'orange' },
    { key: 'familyHistory',   label: 'Antécédents familiaux',    icon: Users,         color: 'purple' },
    { key: 'surgicalHistory', label: 'Historique chirurgical',   icon: Stethoscope,   color: 'blue' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map(s => {
        const items = mp[s.key] || [];
        const Icon = s.icon;
        return (
          <div key={s.key} className={`${card} border rounded-2xl p-4`}>
            <div className={`flex items-center gap-2 mb-3`}>
              <div className={`w-8 h-8 rounded-lg bg-${s.color}-100 flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <p className="font-bold text-sm">{s.label}</p>
              <span className={`ml-auto text-xs ${sub}`}>{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className={`text-xs ${sub}`}>Aucun(e)</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <span key={i} className={`px-2 py-1 rounded-lg text-xs font-semibold bg-${s.color}-50 text-${s.color}-700 border border-${s.color}-100`}>{item}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PatientTabConsult({ pat, card, sub, border, darkMode }) {
  const consultations = pat.consultations || [];
  return (
    <div className="space-y-3">
      {consultations.length === 0 ? (
        <div className={`${card} border rounded-2xl p-8 flex flex-col items-center gap-2`}>
          <ClipboardList className={`w-8 h-8 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune consultation enregistrée</p>
        </div>
      ) : consultations.map(c => (
        <div key={c.id} className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-8 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{c.diagnosisMain || 'Consultation'}</p>
                <p className={`text-xs ${sub}`}>{new Date(c.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Terminée</span>
          </div>
          {c.motif && <p className={`text-xs ${sub} mt-2`}><strong>Motif :</strong> {c.motif}</p>}
          {c.notes && <p className={`text-xs ${sub} mt-1`}>{c.notes}</p>}
          {c.recommendations && <p className={`text-xs mt-1 text-blue-600 font-medium`}>→ {c.recommendations}</p>}
        </div>
      ))}
    </div>
  );
}

function PatientTabLabo({ pat, card, sub, border, darkMode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className={`${card} border rounded-2xl p-4`}>
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Microscope className="w-4 h-4 text-blue-600" /> Résultats labo</h4>
        {(pat.labResults || []).length === 0 ? (
          <p className={`text-xs ${sub}`}>Aucun résultat</p>
        ) : (pat.labResults || []).map(r => (
          <div key={r.id} className={`flex items-center justify-between py-2 border-b ${border} last:border-0`}>
            <p className="text-xs font-semibold">{r.title}</p>
            <p className={`text-[10px] ${sub}`}>{new Date(r.performedAt).toLocaleDateString('fr-FR')}</p>
          </div>
        ))}
      </div>
      <div className={`${card} border rounded-2xl p-4`}>
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><FileDown className="w-4 h-4 text-purple-600" /> Ordonnances</h4>
        {(pat.prescriptions || []).length === 0 ? (
          <p className={`text-xs ${sub}`}>Aucune ordonnance</p>
        ) : (pat.prescriptions || []).map(r => (
          <div key={r.id} className={`flex items-center justify-between py-2 border-b ${border} last:border-0`}>
            <p className="text-xs font-semibold">{new Date(r.prescribedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.status === 'active' ? 'Active' : 'Expirée'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AGENDA
   ════════════════════════════════════════════════════════════════ */
