import React, { useState } from 'react';
import { Heart, HeartPulse, Activity, Droplet, Thermometer, TrendingUp, Plus, Check } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDate, formatShortDate } from '../../utils/format.js';
import { PatientModal } from '../../components/PatientModal.jsx';

export default function PVitals({ data, onAddVital, notify, card, sub, border, darkMode }) {
  const [activeType, setActiveType] = useState('blood_pressure');
  const [range, setRange]           = useState(30);
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({ type: 'blood_pressure', value: '' });
  const [saving, setSaving]         = useState(false);

  const typeConfig = {
    blood_pressure: { label: 'Tension artérielle', unit: 'mmHg', color: '#ef4444', icon: HeartPulse,  normal: '12/8', ref: '< 14/9' },
    blood_glucose:  { label: 'Glycémie',           unit: 'g/L',  color: '#f97316', icon: Droplet,     normal: '0.70–1.10', ref: '0.70–1.10' },
    heart_rate:     { label: 'Fréquence cardiaque',unit: 'bpm',  color: '#8b5cf6', icon: Heart,       normal: '60–100', ref: '60–100' },
    temperature:    { label: 'Température',        unit: '°C',   color: '#06b6d4', icon: Thermometer, normal: '36.1–37.2', ref: '36.1–37.2' },
  };

  const allVitals = data ?? [];
  const typeVitals = allVitals
    .filter(v => v.type === activeType)
    .sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt))
    .slice(-range);

  const cfg = typeConfig[activeType];

  const toNum = (v) => {
    if (activeType === 'blood_pressure') return Number(String(v).split('/')[0]);
    return Number(v);
  };

  const nums = typeVitals.map(v => toNum(v.value)).filter(n => Number.isFinite(n));
  const minV = nums.length ? Math.min(...nums) : 0;
  const maxV = nums.length ? Math.max(...nums) : 1;
  const pad  = Math.max((maxV - minV) * 0.2, 1);
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const W = 600, H = 160;
  const points = typeVitals.map((v, i) => {
    const x = typeVitals.length < 2 ? W / 2 : (i / (typeVitals.length - 1)) * (W - 20) + 10;
    const n = toNum(v.value);
    const y = Number.isFinite(n) ? H - ((n - yMin) / (yMax - yMin)) * (H - 20) - 10 : H / 2;
    return { x, y, v, raw: v };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = points.length > 1
    ? `M${points[0].x},${H} ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L${points[points.length-1].x},${H} Z`
    : '';

  const latest = typeVitals.at(-1);
  const latestNum = latest ? toNum(latest.value) : null;
  const prev     = typeVitals.at(-2);
  const prevNum  = prev ? toNum(prev.value) : null;
  const trend    = latestNum && prevNum ? (latestNum > prevNum ? 'up' : latestNum < prevNum ? 'down' : 'flat') : 'flat';

  const saveVital = async () => {
    if (!addForm.value.trim()) return;
    setSaving(true);
    try {
      await patientApi.addVital({ type: addForm.type, value: addForm.value });
      const fresh = await patientApi.vitals();
      onAddVital?.(fresh);
      notify?.('Mesure enregistrée');
      setShowAdd(false);
      setAddForm({ type: 'blood_pressure', value: '' });
    } catch (e) {
      notify?.(e.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes constantes</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-xl`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Mes constantes</h2>
          <p className={`text-sm ${sub}`}>{typeVitals.length} mesures · {cfg.label}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Ajouter une mesure
        </button>
      </div>

      {showAdd && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setShowAdd(false)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Nouvelle mesure</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value, value: '' }))}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div>
                <input value={addForm.value} onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={typeConfig[addForm.type].normal} onKeyDown={e => e.key === 'Enter' && saveVital()}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                <p className={`text-xs ${sub} mt-1`}>Format attendu : {typeConfig[addForm.type].normal} ({typeConfig[addForm.type].unit})</p>
              </div>
              <div className="flex gap-2">
                <button onClick={saveVital} disabled={saving || !addForm.value.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button onClick={() => setShowAdd(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(typeConfig).map(([type, c]) => {
          const typeLatest = allVitals.filter(v => v.type === type).at(-1);
          const isAct = activeType === type;
          const Icon = c.icon;
          return (
            <button key={type} onClick={() => setActiveType(type)}
              className={`rounded-2xl p-3 text-left transition-all ${isAct ? 'ring-2 ring-offset-1' : ''} ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300'} ${isAct ? 'ring-red-500' : ''}`}
              style={isAct ? { borderColor: c.color } : {}}>
              <Icon className="w-4 h-4 mb-1" style={{ color: c.color }} />
              <p className={`text-[10px] font-semibold ${sub}`}>{c.label}</p>
              <p className="text-lg font-black mt-0.5">{typeLatest ? typeLatest.value : '—'}</p>
              <p className={`text-[10px] ${sub}`}>{c.unit}</p>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className={`${card} border rounded-2xl p-5`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div>
              <p className={`text-xs font-semibold ${sub}`}>{cfg.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black">{latest?.value ?? '—'}</span>
                <span className={`text-sm ${sub}`}>{cfg.unit}</span>
                {trend === 'up'   && <TrendingUp  className="w-4 h-4 text-red-500" />}
                {trend === 'down' && <TrendingUp  className="w-4 h-4 text-emerald-500 rotate-180" />}
              </div>
              {latest && <p className={`text-xs ${sub} mt-0.5`}>{formatDate(latest.measuredAt)}</p>}
            </div>
          </div>
          <div className={`flex gap-1 p-1 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
            {[7, 14, 30].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${range === r ? 'bg-white text-slate-900 shadow' : sub}`}>
                {r}j
              </button>
            ))}
          </div>
        </div>

        {typeVitals.length < 2 ? (
          <div className={`flex items-center justify-center h-32 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <p className={`text-sm ${sub}`}>Pas assez de données — ajoutez des mesures</p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: '120px' }}>
              <defs>
                <linearGradient id={`grad-${activeType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {area && <path d={area} fill={`url(#grad-${activeType})`} />}
              {points.length > 1 && <polyline points={polyline} fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={cfg.color} stroke={darkMode ? '#1e293b' : 'white'} strokeWidth="2" />
              ))}
              {/* X axis labels — only first and last */}
              {typeVitals.length > 1 && <>
                <text x={points[0].x} y={H - 2} textAnchor="middle" fontSize="9" fill={darkMode ? '#94a3b8' : '#64748b'}>{formatShortDate(typeVitals[0].measuredAt)}</text>
                <text x={points[points.length-1].x} y={H - 2} textAnchor="middle" fontSize="9" fill={darkMode ? '#94a3b8' : '#64748b'}>{formatShortDate(typeVitals.at(-1).measuredAt)}</text>
              </>}
            </svg>
          </div>
        )}

        <div className={`mt-3 pt-3 border-t ${border} flex items-center gap-4 text-xs ${sub} flex-wrap`}>
          <span>Normale : <strong>{cfg.ref} {cfg.unit}</strong></span>
          {nums.length > 0 && <>
            <span>Min : <strong>{Math.min(...nums)}</strong></span>
            <span>Max : <strong>{Math.max(...nums)}</strong></span>
            <span>Moy : <strong>{(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)}</strong></span>
          </>}
        </div>
      </div>

      {/* History table */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3">Historique ({typeVitals.length} mesures)</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {[...typeVitals].reverse().map((v, i) => (
            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <span className={`text-xs ${sub}`}>{formatDate(v.measuredAt)}</span>
              <span className="font-bold text-sm">{v.value} <span className={`text-xs font-normal ${sub}`}>{cfg.unit}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ RECHERCHE MÉDECINS ============ */
