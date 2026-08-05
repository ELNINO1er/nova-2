import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronRight,
  Clock, ClipboardList, FileText, Package, Pill, QrCode, Search,
  ShieldCheck, Stethoscope, User, X, Camera, Scan
} from 'lucide-react';
import { pharmacyApi } from '../api/pharmacyApi.js';

export default function PharmacyPages({ page, setPage, card, sub, border, darkMode }) {
  const [apiData, setApiData] = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [notice, setNotice] = useState(null);
  const p = { card, sub, border, darkMode };

  const notify = (msg, type = 'success') => {
    setNotice({ message: msg, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadPage = (key, force = false) => {
    const loaders = {
      dashboard: pharmacyApi.dashboard,
      history:   pharmacyApi.dispenses,
    };
    const load = loaders[key];
    if (!load || (!force && apiData[key])) return;
    setApiLoading(c => ({ ...c, [key]: true }));
    load()
      .then(data => setApiData(c => ({ ...c, [key]: data })))
      .catch(err => notify(err.message, 'error'))
      .finally(() => setApiLoading(c => ({ ...c, [key]: false })));
  };

  useEffect(() => { loadPage(page); }, [page]);

  return (
    <div className="space-y-5">
      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl
          ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.message}
        </div>
      )}

      {page === 'dashboard' && <PhDashboard data={apiData.dashboard} loading={apiLoading.dashboard} setPage={setPage} notify={notify} {...p} />}
      {page === 'scan'      && <PhScan notify={notify} setPage={setPage} {...p} />}
      {page === 'history'   && <PhHistory data={apiData.history} loading={apiLoading.history} {...p} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PHARMACIE
   ═══════════════════════════════════════════════════════════════ */
function PhDashboard({ data, loading, setPage, notify, card, sub, border, darkMode }) {
  if (loading || !data) return <PhSkeleton darkMode={darkMode} card={card} />;

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 blur-2xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-emerald-100 text-sm">Espace Pharmacie</p>
            <h2 className="text-2xl font-bold">{data.pharmacy?.name || 'Pharmacie'}</h2>
            <p className="text-emerald-100 text-sm mt-1">{data.pharmacy?.city} • {data.pharmacy?.phone}</p>
          </div>
          <button onClick={() => setPage('scan')}
            className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
            <Scan className="w-5 h-5" /> Scanner une ordonnance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <p className={`text-xs ${sub}`}>Aujourd'hui</p>
          <p className="text-3xl font-bold mt-1">{data.todayDispenses}</p>
          <p className="text-xs text-emerald-600 font-semibold">délivrances</p>
        </div>
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <p className={`text-xs ${sub}`}>Total</p>
          <p className="text-3xl font-bold mt-1">{data.totalDispenses}</p>
          <p className="text-xs text-blue-600 font-semibold">délivrances</p>
        </div>
        <div className={`${card} border rounded-2xl p-5 col-span-2 md:col-span-1`}>
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
            <Scan className="w-5 h-5 text-amber-600" />
          </div>
          <p className={`text-xs ${sub}`}>Action rapide</p>
          <button onClick={() => setPage('scan')} className="mt-2 text-sm font-bold text-emerald-600 flex items-center gap-1">
            Vérifier une ordonnance <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data.recentDispenses?.length > 0 && (
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" /> Délivrances récentes
          </h3>
          <div className="space-y-2">
            {data.recentDispenses.map(d => (
              <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                  ${d.status === 'full' ? 'bg-emerald-500' : d.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`}>
                  {d.status === 'full' ? <Check className="w-4 h-4" /> : d.status === 'partial' ? <Clock className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.patientName}</p>
                  <p className={`text-xs ${sub}`}>{d.status === 'full' ? 'Complète' : d.status === 'partial' ? 'Partielle' : 'Refusée'}</p>
                </div>
                <p className={`text-xs ${sub}`}>{new Date(d.dispensedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCAN & VÉRIFICATION ORDONNANCE
   ═══════════════════════════════════════════════════════════════ */
function PhScan({ notify, setPage, card, sub, border, darkMode }) {
  const [prescriptionId, setPrescriptionId] = useState('');
  const [verification, setVerification] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [dispenseItems, setDispenseItems] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const verify = async () => {
    if (!prescriptionId.trim()) return;
    setLoading(true);
    setVerification(null);
    setDetail(null);
    try {
      const v = await pharmacyApi.verifyPrescription(prescriptionId.trim());
      setVerification(v);
      if (v.verification.canDispense) {
        const d = await pharmacyApi.prescription(v.id);
        setDetail(d);
        setDispenseItems(d.items.map(i => ({ prescriptionItemId: i.id, quantityDispensed: 1, substituted: false, name: i.name })));
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const doDispense = async (status) => {
    setDispensing(true);
    try {
      await pharmacyApi.dispense({
        prescriptionId: verification?.id,
        status,
        items: dispenseItems.map(({ name, ...rest }) => rest),
      });
      notify(status === 'full' ? 'Ordonnance délivrée avec succès' : 'Délivrance partielle enregistrée');
      setVerification(null);
      setDetail(null);
      setPrescriptionId('');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setPage('dashboard')} className={`text-xs font-semibold ${sub} flex items-center gap-1`}>
          ← Retour
        </button>
      </div>

      {/* Saisie ID ordonnance */}
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Scan className="w-5 h-5 text-emerald-600" /> Vérifier une ordonnance
        </h3>
        <div className="flex gap-3">
          <input ref={inputRef} type="text" value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="Scanner ou coller le token QR ordonnance..."
            className={`flex-1 px-4 py-3 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
          />
          <button onClick={verify} disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Vérifier
          </button>
        </div>
      </div>

      {/* Résultat vérification */}
      {verification && (
        <div className={`${card} border rounded-2xl p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">{verification.patientName}</h3>
              <p className={`text-sm ${sub}`}>CMU : {verification.cmuNumber || 'masque'}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              verification.verification.canDispense ? 'bg-emerald-100 text-emerald-700'
              : verification.verification.expired ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
            }`}>
              {verification.verification.canDispense ? '✓ Valide — dispensable'
              : verification.verification.expired ? '✗ Expirée'
              : verification.verification.alreadyFull ? '✗ Déjà délivrée'
              : '✗ Non dispensable'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <InfoCell label="Prescripteur" value={verification.doctorName} sub={sub} />
            <InfoCell label="Spécialité" value={verification.doctorSpecialty} sub={sub} />
            <InfoCell label="Émise le" value={verification.issuedAt ? new Date(verification.issuedAt).toLocaleDateString('fr-FR') : '—'} sub={sub} />
            <InfoCell label="Valide jusqu'au" value={verification.validUntil ? new Date(verification.validUntil).toLocaleDateString('fr-FR') : 'Illimitée'} sub={sub} />
          </div>

          {verification.lastDispense && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Dernière délivrance : {verification.lastDispense.status === 'full' ? 'Complète' : 'Partielle'} le {new Date(verification.lastDispense.dispensedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          {/* Authentification */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatusBadge ok={verification.verification.authentic} label="Authenticité" darkMode={darkMode} />
            <StatusBadge ok={!verification.verification.expired} label="Non expirée" darkMode={darkMode} />
            <StatusBadge ok={!verification.verification.alreadyFull} label="Non délivrée" darkMode={darkMode} />
          </div>
        </div>
      )}

      {/* Détail médicaments + délivrance */}
      {detail && verification?.verification.canDispense && (
        <div className={`${card} border rounded-2xl p-6`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-600" /> Médicaments prescrits ({detail.items.length})
          </h3>

          <div className="space-y-3 mb-6">
            {detail.items.map((item, idx) => (
              <div key={item.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className={`text-xs ${sub} mt-0.5`}>
                      {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' • ')}
                    </p>
                    {item.instructions && <p className={`text-xs ${sub} mt-1 italic`}>{item.instructions}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className={`text-xs ${sub}`}>Qté</label>
                    <input type="number" min="0" value={dispenseItems[idx]?.quantityDispensed || 1}
                      onChange={e => {
                        const next = [...dispenseItems];
                        next[idx] = { ...next[idx], quantityDispensed: parseInt(e.target.value) || 0 };
                        setDispenseItems(next);
                      }}
                      className={`w-16 px-2 py-1 rounded-lg border text-sm text-center ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => doDispense('full')} disabled={dispensing}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" /> Délivrance complète
            </button>
            <button onClick={() => doDispense('partial')} disabled={dispensing}
              className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 ${darkMode ? 'border-slate-700' : 'border-slate-300'} disabled:opacity-50`}>
              <Clock className="w-4 h-4" /> Délivrance partielle
            </button>
            <button onClick={() => { setVerification(null); setDetail(null); setPrescriptionId(''); }}
              className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 border border-red-200 hover:bg-red-100">
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORIQUE DÉLIVRANCES
   ═══════════════════════════════════════════════════════════════ */
function PhHistory({ data, loading, card, sub, border, darkMode }) {
  if (loading && !data) return <PhSkeleton darkMode={darkMode} card={card} />;
  const items = data || [];

  return (
    <div className={`${card} border rounded-2xl p-5`}>
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-emerald-600" /> Historique des délivrances
      </h3>
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <Package className={`w-12 h-12 mx-auto ${sub} mb-3`} />
          <p className={`text-sm font-semibold ${sub}`}>Aucune délivrance enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(d => (
            <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                ${d.status === 'full' ? 'bg-emerald-500' : d.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`}>
                {d.status === 'full' ? <Check className="w-5 h-5" /> : d.status === 'partial' ? <Clock className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{d.patientName}</p>
                <p className={`text-xs ${sub}`}>{d.cmuNumber} • Dr. {d.doctorName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                  ${d.status === 'full' ? 'bg-emerald-100 text-emerald-700' : d.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {d.status === 'full' ? 'Complète' : d.status === 'partial' ? 'Partielle' : 'Refusée'}
                </span>
                <p className={`text-[10px] ${sub} mt-1`}>
                  {new Date(d.dispensedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

function InfoCell({ label, value, sub }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase ${sub}`}>{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value || '—'}</p>
    </div>
  );
}

function StatusBadge({ ok, label, darkMode }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${ok
      ? 'bg-emerald-50 border border-emerald-200'
      : 'bg-red-50 border border-red-200'}`}>
      {ok
        ? <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
      <span className={`text-xs font-bold ${ok ? 'text-emerald-700' : 'text-red-700'}`}>{label}</span>
    </div>
  );
}

function PhSkeleton({ darkMode, card }) {
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-4 animate-pulse">
      <div className={`h-32 rounded-2xl ${darkMode ? 'bg-emerald-900' : 'bg-emerald-100'}`}></div>
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className={`${card} border rounded-2xl p-5 h-28`}><div className={`${block} h-10 w-10 rounded-lg mb-3`}></div><div className={`${block} h-4 w-16`}></div></div>)}
      </div>
    </div>
  );
}
