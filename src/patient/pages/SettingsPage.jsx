import React, { useState, useEffect } from 'react';
import { Settings, Bell, Lock, Eye, Moon, Smartphone, HelpCircle, ChevronRight, HeartPulse, AlertCircle, BookOpen, Database, FileDown, HardDrive, Mail, MessageCircle, Palette, Phone, Shield, Wifi } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function SettingsPage({ data, card, sub, border, darkMode, api: apiOverride }) {
  const api = apiOverride || patientApi;
  const [as, setAs] = useState('notif');
  const [s, setS] = useState({
    notif: { pill: true, rdv: true, msg: true, eme: true, news: true, promo: false },
    priv: { dr: true, fam: false, res: true, qr: true },
    sec: { bio: true, ds: true, lock: '5min' },
    app: { fs: 'normal', lg: 'FR', anim: false, hc: false },
    h: { w: 'kg', t: 'C', bp: 'mmHg', g: 'g/L' }
  });
  const secs = [
    { id: 'notif', l: 'Notifications', I: Bell, c: 'red' },
    { id: 'priv', l: 'Confidentialité', I: Lock, c: 'blue' },
    { id: 'sec', l: 'Sécurité', I: Shield, c: 'emerald' },
    { id: 'app', l: 'Apparence', I: Palette, c: 'purple' },
    { id: 'h', l: 'Santé', I: HeartPulse, c: 'pink' },
    { id: 'data', l: 'Données', I: Database, c: 'amber' },
    { id: 'help', l: 'Aide', I: HelpCircle, c: 'cyan' }
  ];
  const T = ({ ch, on }) => (
    <button onClick={on} className={`relative w-11 h-6 rounded-full ${ch ? 'bg-red-600' : darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ch ? 'translate-x-5' : ''}`}></span>
    </button>
  );
  const R = ({ l, d, children }) => (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
      <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{l}</p>{d && <p className={`text-xs ${sub} mt-0.5`}>{d}</p>}</div>
      {children}
    </div>
  );
  useEffect(() => {
    if (!data) return;
    setS((current) => ({
      ...current,
      notif: {
        ...current.notif,
        rdv: data.notifications?.appointments ?? current.notif.rdv,
        pill: data.notifications?.medications ?? current.notif.pill,
        msg: data.notifications?.messages ?? current.notif.msg,
      },
      priv: {
        ...current.priv,
        dr: data.privacy?.shareWithDoctors ?? current.priv.dr,
        qr: data.privacy?.emergencyQr ?? current.priv.qr,
      },
      app: {
        ...current.app,
        lg: data.display?.language?.toUpperCase?.() || current.app.lg,
      },
    }));
  }, [data]);
  const upd = async (cat, k, v) => {
    const next = { ...s, [cat]: { ...s[cat], [k]: v !== undefined ? v : !s[cat][k] } };
    setS(next);
    await api.updateSettings({
      notifications: {
        appointments: next.notif.rdv,
        medications: next.notif.pill,
        messages: next.notif.msg,
      },
      privacy: {
        emergencyQr: next.priv.qr,
        shareWithDoctors: next.priv.dr,
      },
      display: {
        language: String(next.app.lg || 'FR').toLowerCase(),
        density: 'comfortable',
      },
    });
  };

  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-bold">Paramètres</h2><p className={`text-sm ${sub}`}>Personnalisez NOVA</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={`${card} border rounded-2xl p-2`}>
          {secs.map(sc => (
            <button key={sc.id} onClick={() => setAs(sc.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${as === sc.id ? `bg-${sc.c}-100 text-${sc.c}-700` : darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <sc.I className="w-4 h-4" /><span className="flex-1 text-left">{sc.l}</span>
              {as === sc.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </div>
        <div className={`lg:col-span-3 ${card} border rounded-2xl p-6`}>
          {as === 'notif' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-red-600" /> Notifications</h3>
              <R l="Rappels médicaments" d="Horaires de prise"><T ch={s.notif.pill} on={() => upd('notif', 'pill')} /></R>
              <R l="Rappels rendez-vous" d="24h et 1h avant"><T ch={s.notif.rdv} on={() => upd('notif', 'rdv')} /></R>
              <R l="Messages" d="Nouveaux messages médecins"><T ch={s.notif.msg} on={() => upd('notif', 'msg')} /></R>
              <R l="Alertes urgence" d="Recommandé"><T ch={s.notif.eme} on={() => upd('notif', 'eme')} /></R>
              <R l="Newsletter" d="Conseils hebdomadaires"><T ch={s.notif.news} on={() => upd('notif', 'news')} /></R>
              <R l="Promotions" d="Offres pharmacies"><T ch={s.notif.promo} on={() => upd('notif', 'promo')} /></R>
            </div>
          )}
          {as === 'priv' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-blue-600" /> Confidentialité</h3>
              <R l="Partage avec mes médecins" d="Médecins liés à votre dossier"><T ch={s.priv.dr} on={() => upd('priv', 'dr')} /></R>
              <R l="Partage familial" d="Membres autorisés"><T ch={s.priv.fam} on={() => upd('priv', 'fam')} /></R>
              <R l="Recherche anonyme" d="Améliorer santé publique"><T ch={s.priv.res} on={() => upd('priv', 'res')} /></R>
              <R l="QR Code d'urgence" d="Accès rapide aux infos médicales"><T ch={s.priv.qr} on={() => upd('priv', 'qr')} /></R>
              <button className={`w-full mt-3 p-3 rounded-xl text-sm font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center gap-2`}>
                <Eye className="w-4 h-4" /> Qui a consulté mon dossier ?
              </button>
            </div>
          )}
          {as === 'sec' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /> Sécurité</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">Ces paramètres sont enregistrés localement. Ils seront synchronisés avec le serveur dans une prochaine version.</p>
              </div>
              <R l="Authentification biométrique" d="Empreinte ou face ID"><T ch={s.sec.bio} on={() => upd('sec', 'bio')} /></R>
              <R l="Double authentification" d="Code SMS supplémentaire"><T ch={s.sec.ds} on={() => upd('sec', 'ds')} /></R>
              <R l="Verrouillage automatique" d="Délai déconnexion">
                <select value={s.sec.lock} onChange={(e) => upd('sec', 'lock', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option>Jamais</option><option>1min</option><option>5min</option><option>15min</option>
                </select>
              </R>
            </div>
          )}
          {as === 'app' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-purple-600" /> Apparence</h3>
              <R l="Taille du texte">
                <select value={s.app.fs} onChange={(e) => upd('app', 'fs', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option value="small">Petit</option><option value="normal">Normal</option><option value="large">Grand</option>
                </select>
              </R>
              <R l="Langue">
                <select value={s.app.lg} onChange={(e) => upd('app', 'lg', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option>FR</option><option>EN</option><option>Dioula</option><option>Baoulé</option>
                </select>
              </R>
              <R l="Réduire animations"><T ch={s.app.anim} on={() => upd('app', 'anim')} /></R>
              <R l="Contraste élevé"><T ch={s.app.hc} on={() => upd('app', 'hc')} /></R>
            </div>
          )}
          {as === 'h' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><HeartPulse className="w-5 h-5 text-pink-600" /> Préférences santé</h3>
              {[{k:'w',l:'Poids',o:['kg','lbs']},{k:'t',l:'Température',o:['C','F']},{k:'bp',l:'Tension',o:['mmHg','kPa']},{k:'g',l:'Glycémie',o:['g/L','mmol/L']}].map((u, i) => (
                <R key={i} l={u.l}>
                  <div className="flex gap-1 p-1 rounded-lg bg-slate-200">
                    {u.o.map(o => (
                      <button key={o} onClick={() => upd('h', u.k, o)} className={`px-3 py-1 rounded-md text-xs font-bold ${s.h[u.k] === o ? 'bg-white shadow' : ''}`}>{o}</button>
                    ))}
                  </div>
                </R>
              ))}
            </div>
          )}
          {as === 'data' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Database className="w-5 h-5 text-amber-600" /> Données</h3>
              {[
                { I: FileDown, l: 'Exporter mes données', d: 'PDF + JSON', c: 'blue' },
                { I: HardDrive, l: 'Espace utilisé', d: '2,3 Mo • 124 docs', c: 'purple' },
                { I: Wifi, l: 'Synchronisation', d: 'Il y a 2 min', c: 'emerald' }
              ].map((b, i) => (
                <button key={i} className={`w-full p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3 text-left`}>
                  <b.I className={`w-5 h-5 text-${b.c}-600`} />
                  <div className="flex-1"><p className="font-semibold text-sm">{b.l}</p><p className={`text-xs ${sub}`}>{b.d}</p></div>
                </button>
              ))}
              <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50">
                <p className="font-bold text-sm text-red-900">Zone dangereuse</p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-red-300 text-red-700 text-xs font-bold">Réinitialiser</button>
                  <button className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Supprimer compte</button>
                </div>
              </div>
            </div>
          )}
          {as === 'help' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><HelpCircle className="w-5 h-5 text-cyan-600" /> Aide & Support</h3>
              {[
                { I: BookOpen, l: 'Guide d\'utilisation', d: 'Découvrez NOVA' },
                { I: MessageCircle, l: 'Chat support', d: '24h/24, 7j/7' },
                { I: Phone, l: 'Hotline urgence', d: '+225 27 21 25 25 25' },
                { I: Mail, l: 'Nous écrire', d: 'support@nova-sante.ci' }
              ].map((h, i) => (
                <button key={i} className={`w-full p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3 text-left`}>
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center"><h.I className="w-5 h-5 text-cyan-600" /></div>
                  <div className="flex-1"><p className="font-semibold text-sm">{h.l}</p><p className={`text-xs ${sub}`}>{h.d}</p></div>
                </button>
              ))}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                <p className="text-xs font-bold">NOVA v2.4.0</p>
                <p className={`text-[10px] ${sub} mt-1`}>© 2026 NOVA Health • Côte d'Ivoire 🇨🇮</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
