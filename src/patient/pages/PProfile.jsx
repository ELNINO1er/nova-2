import React, { useState, useEffect } from 'react';
import { User, Calendar, Phone, Smartphone, Mail, MapPin, Heart, Edit3, Save, X, Siren, FileDown } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function PProfile({ data, onSaved, card, sub, border, darkMode }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState({
    firstName: '', lastName: '', birthDate: '', sex: '',
    cmu: '', phone: '', email: '',
    address: '', city: '',
    bloodType: '', weight: '', height: '',
    eName: '', eRel: '', ePhone: '',
  });

  useEffect(() => {
    if (!data) return;
    setD({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      birthDate: data.birthDate || '',
      sex: data.sex || '',
      cmu: data.cmuNumber || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      bloodType: data.bloodType || '',
      weight: data.weightKg ? String(data.weightKg) : '',
      height: data.heightCm ? String(data.heightCm) : '',
      eName: data.emergencyContact?.name || '',
      eRel: data.emergencyContact?.relationship || '',
      ePhone: data.emergencyContact?.phone || '',
    });
  }, [data]);

  const profileInitials = `${d.firstName?.[0] || ''}${d.lastName?.[0] || ''}`.toUpperCase() || '—';
  const profileAge = d.birthDate ? Math.floor((Date.now() - new Date(d.birthDate).getTime()) / 31557600000) : null;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const inputCls = `mt-1.5 w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} focus:outline-none focus:ring-2 focus:ring-red-500`;

  const saveProfile = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await patientApi.updateProfile({
        firstName:             d.firstName,
        lastName:              d.lastName,
        birthDate:             d.birthDate || undefined,
        sex:                   d.sex       || undefined,
        bloodType:             d.bloodType || undefined,
        phone:                 d.phone     || undefined,
        email:                 d.email     || undefined,
        address:               d.address   || undefined,
        city:                  d.city      || undefined,
        weightKg:              Number(d.weight) || undefined,
        heightCm:              Number(d.height) || undefined,
        emergencyName:         d.eName     || undefined,
        emergencyRelationship: d.eRel      || undefined,
        emergencyPhone:        d.ePhone    || undefined,
      });
      onSaved?.(updated);
      setEdit(false);
    } catch (error) {
      setSaveError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-red-100 rounded-2xl h-40"></div>
        {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-32 rounded-lg`}></div></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/20 rounded-full -translate-y-24 translate-x-24 blur-2xl"></div>
        <div className="relative w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold border-2 border-white/30">{profileInitials}</div>
        <div className="relative flex-1">
          <h2 className="text-2xl font-bold">{d.firstName} {d.lastName}</h2>
          <p className="text-red-100 text-sm font-mono">{d.cmu}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {d.bloodType && <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{d.bloodType}</span>}
            {profileAge !== null && <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{profileAge} ans</span>}
            {d.city && <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{d.city}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {saveError && <p className="text-xs text-red-200 bg-red-900/40 px-3 py-1 rounded-lg max-w-xs text-right">{saveError}</p>}
          <div className="flex gap-2">
            <a href={patientApi.exportPdfUrl()} target="_blank" rel="noreferrer"
              className="relative bg-white/20 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 shadow">
              <FileDown className="w-4 h-4" /> Exporter PDF
            </a>
            {edit && <button onClick={() => { setEdit(false); setSaveError(''); }} className="relative bg-white/20 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 shadow">
              <X className="w-4 h-4" /> Annuler
            </button>}
            <button onClick={() => edit ? saveProfile() : setEdit(true)} disabled={saving} className="relative bg-white text-red-700 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 shadow-lg disabled:opacity-50">
              {edit ? <><Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer'}</> : <><Edit3 className="w-4 h-4" /> Modifier</>}
            </button>
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-red-600" /> Informations personnelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Prénom</label>
            {edit ? <input value={d.firstName} onChange={(e) => setD({ ...d, firstName: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.firstName || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Nom</label>
            {edit ? <input value={d.lastName} onChange={(e) => setD({ ...d, lastName: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.lastName || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><Calendar className="w-3 h-3" /> Date de naissance</label>
            {edit ? <input type="date" value={d.birthDate} onChange={(e) => setD({ ...d, birthDate: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.birthDate || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Sexe</label>
            {edit ? <input value={d.sex} onChange={(e) => setD({ ...d, sex: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.sex || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>N° CMU</label>
            <p className="mt-1.5 text-sm font-semibold py-2">{d.cmu || '—'}</p>
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Phone className="w-4 h-4 text-red-600" /> Coordonnées</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><Smartphone className="w-3 h-3" /> Téléphone</label>
            {edit ? <input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.phone || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><Mail className="w-3 h-3" /> Email</label>
            {edit ? <input value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.email || '—'}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><MapPin className="w-3 h-3" /> Adresse</label>
            {edit ? <input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.address || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Ville</label>
            {edit ? <input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.city || '—'}</p>}
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-red-600" /> Données médicales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Groupe sanguin</label>
            {edit ? <input value={d.bloodType} onChange={(e) => setD({ ...d, bloodType: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.bloodType || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Poids (kg)</label>
            {edit ? <input value={d.weight} onChange={(e) => setD({ ...d, weight: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.weight || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Taille (cm)</label>
            {edit ? <input value={d.height} onChange={(e) => setD({ ...d, height: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.height || '—'}</p>}
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Siren className="w-4 h-4 text-red-600" /> Contact d'urgence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Nom</label>
            {edit ? <input value={d.eName} onChange={(e) => setD({ ...d, eName: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.eName || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Lien</label>
            {edit ? <input value={d.eRel} onChange={(e) => setD({ ...d, eRel: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.eRel || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Téléphone</label>
            {edit ? <input value={d.ePhone} onChange={(e) => setD({ ...d, ePhone: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.ePhone || '—'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
