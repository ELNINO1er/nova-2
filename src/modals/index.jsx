import React, { useState, useRef } from 'react';
import {
  Heart, Activity, Pill, Calendar, FileText, User, Stethoscope,
  Shield, Search, AlertTriangle, Plus, Check, Clock, Download, X,
  TrendingUp, Bell, MessageCircle, Video, Brain, Mic, Phone,
  Star, Users, BarChart3, Lock, Eye, AlertCircle, CheckCircle2,
  Settings, ChevronRight, MapPin, Droplet, Zap, Sparkles, Send,
  Bot, Award, Target, Sun, Moon, Menu, Home, Edit3, Trash2, Save,
  FileDown, ShieldAlert, ShieldCheck, ServerCog, Database, Siren,
  ClipboardList, Microscope, Syringe, ChevronLeft, CalendarClock,
  HeartPulse, Thermometer, StickyNote, Palette, KeyRound, Smartphone,
  Mail, UserPlus, PhoneCall, Paperclip, MoreVertical, ArrowRight,
  HelpCircle, BookOpen, Pencil, HardDrive, Wifi
} from 'lucide-react';
import { doctorApi } from '../api/doctorApi.js';

/* ============== MODALS ============== */
export function QRModal({ onClose }) {
  const cells = [];
  for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) {
    const isC = (i < 7 && j < 7) || (i < 7 && j > 17) || (i > 17 && j < 7);
    const cI = (i >= 1 && i <= 5 && j >= 1 && j <= 5) || (i >= 1 && i <= 5 && j >= 19 && j <= 23) || (i >= 19 && i <= 23 && j >= 1 && j <= 5);
    const cC = (i >= 2 && i <= 4 && j >= 2 && j <= 4) || (i >= 2 && i <= 4 && j >= 20 && j <= 22) || (i >= 20 && i <= 22 && j >= 2 && j <= 4);
    if ((isC && !cI) || cC || (!isC && Math.random() > 0.55)) cells.push(<rect key={`${i}-${j}`} x={i*4} y={j*4} width="4" height="4" fill="#000" />);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pass Santé d'Urgence">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Siren className="w-5 h-5 text-red-600" /><h3 className="font-bold text-slate-900">Pass Santé d'Urgence</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white">
          <p className="text-xs text-red-100">URGENCE MÉDICALE</p>
          <h4 className="text-2xl font-bold mt-1">Kouamé Bamba</h4>
          <p className="text-xs text-red-100">CI-2024-0847-3692</p>
          <div className="bg-white rounded-xl p-4 my-4 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-40 h-40">{cells}</svg>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3"><p className="text-[10px] text-red-100">GROUPE</p><p className="text-xl font-bold">O+</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3"><p className="text-[10px] text-red-100">ÂGE</p><p className="text-xl font-bold">52 ans</p></div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 mt-3">
            <p className="text-[10px] text-red-100 mb-1">⚠️ ALLERGIES</p>
            <p className="text-sm font-semibold">Pénicilline, Arachides</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AyaChat({ onClose }) {
  const [ms, setMs] = useState([{ f: 'a', t: "Bonjour ! Je suis Aya. Comment vous sentez-vous ?" }]);
  const [inp, setInp] = useState('');
  const send = () => {
    if (!inp.trim()) return;
    setMs([...ms, { f: 'u', t: inp }]);
    setInp('');
    setTimeout(() => {
      const r = ["Pouvez-vous décrire l'intensité sur 10 ?", "Symptômes notés. Consultez sous 24-48h.", "Avez-vous pris vos médicaments ?"];
      setMs(p => [...p, { f: 'a', t: r[Math.floor(Math.random() * r.length)] }]);
    }, 500);
  };
  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><Bot className="w-5 h-5" /></div>
          <div><h4 className="font-bold">Aya</h4><p className="text-[10px] text-red-100">Assistante IA Santé</p></div>
        </div>
        <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50">
        {ms.map((m, i) => (
          <div key={i} className={`flex ${m.f === 'u' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.f === 'u' ? 'bg-red-600 text-white' : 'bg-white text-slate-900 shadow-sm border border-slate-100'}`}>
              {m.t}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200 flex gap-2">
        <input type="text" value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Décrivez vos symptômes..." className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900" />
        <button onClick={send} className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function VideoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-4xl font-bold mx-auto mb-4 shadow-2xl">AT</div>
            <p className="text-white text-2xl font-bold">Dr. Aïcha Touré</p>
            <p className="text-slate-400 text-sm mt-2">Cardiologie • CHU Treichville</p>
            <div className="flex items-center gap-2 justify-center mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 text-xs font-bold">EN APPEL • 03:24</span>
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-4 w-32 h-44 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl border-2 border-white/20 flex items-center justify-center shadow-2xl">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm mx-auto mb-2">KB</div>
            <p className="text-white text-xs font-semibold">Vous</p>
          </div>
        </div>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> HD • Sécurisé
          </span>
        </div>
      </div>
      <div className="bg-slate-900 p-6 flex items-center justify-center gap-4">
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"><Mic className="w-6 h-6" /></button>
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"><Video className="w-6 h-6" /></button>
        <button onClick={onClose} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40">
          <Phone className="w-7 h-7 rotate-[135deg]" />
        </button>
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"><MessageCircle className="w-6 h-6" /></button>
      </div>
    </div>
  );
}

export function RxModal({ onClose, darkMode, sub, border }) {
  const [ms, setMs] = useState([{ id: 1, n: 'Amlodipine', d: '5mg', f: '1x/j', du: '30j' }]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nouvelle prescription">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><Pill className="w-5 h-5 text-red-600" /><h3 className="font-bold">Nouvelle prescription</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border-red-200 border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-700 font-semibold">Patient allergique à la pénicilline ⚠️</p>
          </div>
          <div className="space-y-2">
            {ms.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} grid grid-cols-1 md:grid-cols-4 gap-2`}>
                <input type="text" defaultValue={m.n} placeholder="Nom" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input type="text" defaultValue={m.d} placeholder="Dose" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input type="text" defaultValue={m.f} placeholder="Fréq" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input type="text" defaultValue={m.du} placeholder="Durée" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
              </div>
            ))}
          </div>
          <button onClick={() => setMs([...ms, { id: Date.now(), n: '', d: '', f: '', du: '' }])} className={`w-full py-2 rounded-lg border-2 border-dashed text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
            <Plus className="w-4 h-4 inline mr-1" /> Ajouter
          </button>
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Annuler</button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700">
            <FileDown className="w-4 h-4" /> Émettre
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsModal({ onClose, darkMode, sub, border }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Module de consultation">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-red-600" /><h3 className="font-bold">Module de consultation</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={`text-xs font-semibold ${sub}`}>Motif</label>
            <input type="text" placeholder="Suivi tensionnel" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
          </div>
          <div>
            <label className={`text-xs font-semibold ${sub}`}>Observations</label>
            <textarea rows={3} placeholder="Symptômes..." className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
          </div>
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Annuler</button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreatePatientModal({ onClose, onCreated, role, darkMode, sub, border }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState({ fn: '', ln: '', p: '', cmu: '', sex: 'M', bd: '', bt: 'O+', addr: '', city: 'Abidjan' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const payload = {
    firstName: d.fn.trim(),
    lastName: d.ln.trim(),
    phone: d.p.trim(),
    cmuNumber: d.cmu.trim() || undefined,
    sex: d.sex,
    birthDate: d.bd || undefined,
    bloodType: d.bt || undefined,
    address: d.addr.trim() || undefined,
    city: d.city.trim() || undefined,
  };

  const validateStep = () => {
    if (step === 1 && (!payload.firstName || !payload.lastName || !payload.birthDate)) return 'Renseignez le prénom, le nom et la date de naissance.';
    if (step === 2 && payload.phone.replace(/\D/g, '').length < 8) return 'Renseignez un numéro de téléphone valide.';
    return '';
  };

  const next = async () => {
    setError('');
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (role !== 'doctor') {
      setError('La création patient est disponible depuis un compte médecin.');
      return;
    }
    setSaving(true);
    try {
      const result = await doctorApi.createPatient(payload);
      setCreated(result);
      onCreated?.(result);
    } catch (e) {
      setError(e.message || 'Création du patient impossible.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nouveau patient">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div>
            <div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-red-600" /><h3 className="font-bold">Nouveau patient</h3></div>
            <p className={`text-xs ${sub} mt-1`}>Étape {step}/3</p>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pt-4">
          <div className={`h-1 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-700" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              {error}
            </div>
          )}
          {created && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <p className="font-bold">Patient créé : {created.name}</p>
              <p>CMU : {created.cmuNumber}</p>
              {created.devCode && <p>Code OTP dev : <strong>{created.devCode}</strong></p>}
            </div>
          )}
          {step === 1 && (
            <>
              <h4 className="font-bold">Identité</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`text-xs ${sub}`}>Prénom *</label><input type="text" value={d.fn} onChange={(e) => setD({...d, fn: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Nom *</label><input type="text" value={d.ln} onChange={(e) => setD({...d, ln: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Date naissance *</label><input type="date" value={d.bd} onChange={(e) => setD({...d, bd: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Sexe *</label><select value={d.sex} onChange={(e) => setD({...d, sex: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h4 className="font-bold">Contact</h4>
              <div>
                <label className={`text-xs ${sub}`}>Téléphone *</label>
                <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                  <span className="text-xs font-bold pr-2 border-r">🇨🇮 +225</span>
                  <input type="tel" value={d.p} onChange={(e) => setD({...d, p: e.target.value})} placeholder="07 89 45 23 11" className="flex-1 outline-none bg-transparent text-sm" />
                </div>
              </div>
              <div><label className={`text-xs ${sub}`}>Adresse</label><input type="text" value={d.addr} onChange={(e) => setD({...d, addr: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
              <div><label className={`text-xs ${sub}`}>Ville</label><input type="text" value={d.city} onChange={(e) => setD({...d, city: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            </>
          )}
          {step === 3 && (
            <>
              <h4 className="font-bold">Données médicales</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`text-xs ${sub}`}>N° CMU</label><input type="text" value={d.cmu} onChange={(e) => setD({...d, cmu: e.target.value})} placeholder="CI-2026-XXXX" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Groupe sanguin</label><select value={d.bt} onChange={(e) => setD({...d, bt: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>{['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(g => <option key={g}>{g}</option>)}</select></div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900">Le patient recevra un SMS pour activer son compte avec le numéro fourni.</p>
              </div>
            </>
          )}
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          {step > 1 && !created && <button onClick={() => setStep(step - 1)} disabled={saving} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm disabled:opacity-50`}>Précédent</button>}
          <button onClick={created ? onClose : next} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700 disabled:opacity-50">
            {created ? <>Fermer</> : saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Création...</> : step === 3 ? <><Save className="w-4 h-4" /> Créer</> : <>Suivant <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateDoctorModal({ onClose, darkMode, sub, border }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-emerald-600" /><h3 className="font-bold">Nouveau médecin</h3></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={`text-xs ${sub}`}>Prénom *</label><input type="text" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div><label className={`text-xs ${sub}`}>Nom *</label><input type="text" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div><label className={`text-xs ${sub}`}>N° Ordre *</label><input type="text" placeholder="CI-XXX-2024-0000" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div><label className={`text-xs ${sub}`}>Spécialité *</label>
              <select className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option>Médecine générale</option><option>Cardiologie</option><option>Endocrinologie</option><option>Pédiatrie</option><option>Gynécologie</option><option>ORL</option>
              </select>
            </div>
            <div className="col-span-2"><label className={`text-xs ${sub}`}>Établissement *</label><input type="text" placeholder="CHU Treichville" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div className="col-span-2">
              <label className={`text-xs ${sub}`}>Téléphone *</label>
              <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <span className="text-xs font-bold pr-2 border-r">🇨🇮 +225</span>
                <input type="tel" placeholder="01 02 03 04 05" className="flex-1 outline-none bg-transparent text-sm" />
              </div>
            </div>
            <div className="col-span-2"><label className={`text-xs ${sub}`}>Email *</label><input type="email" placeholder="medecin@chu.ci" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">Le N° d'Ordre sera vérifié auprès de l'Ordre des Médecins de Côte d'Ivoire.</p>
          </div>
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Annuler</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-emerald-700">
            <Save className="w-4 h-4" /> Créer le compte
          </button>
        </div>
      </div>
    </div>
  );
}
