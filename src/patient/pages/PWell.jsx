import React, { useState } from 'react';
import { Target, Plus, Check, Trash2, Activity, Droplet, Moon as MoonIcon, Brain, Heart, HeartPulse, Zap, CheckCircle2, Sparkles, Sun } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function PWell({ data, profile, onReload, notify, card, sub, border, darkMode }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', unit: '', color: 'emerald' });
  const [saving, setSaving]   = useState(false);

  const goals = data ?? [];

  // IMC
  const weight = profile?.weightKg;
  const height = profile?.heightCm;
  const bmi    = weight && height ? (weight / ((height / 100) ** 2)).toFixed(1) : null;
  const bmiCategory = !bmi ? null
    : bmi < 18.5 ? { label: 'Insuffisance pondérale', color: 'blue' }
    : bmi < 25   ? { label: 'Poids normal',           color: 'emerald' }
    : bmi < 30   ? { label: 'Surpoids',               color: 'amber' }
    : bmi < 35   ? { label: 'Obésité modérée',        color: 'orange' }
    : { label: 'Obésité sévère', color: 'red' };

  const healthTips = [
    { icon: Droplet,     title: 'Hydratation',         tip: 'Buvez au moins 2L d\'eau par jour, davantage si activité physique.',         color: 'cyan' },
    { icon: Moon,        title: 'Sommeil',              tip: 'Dormez 7 à 9 heures par nuit pour une récupération optimale.',              color: 'indigo' },
    { icon: Activity,    title: 'Activité physique',    tip: '30 minutes de marche rapide par jour réduisent le risque cardiaque de 35%.', color: 'blue' },
    { icon: Sun,         title: 'Exposition solaire',   tip: '15 min de soleil/jour favorisent la synthèse de vitamine D.',              color: 'amber' },
    { icon: HeartPulse,  title: 'Stress',               tip: 'Pratiquez la respiration profonde 5 minutes par jour pour réduire le stress.', color: 'rose' },
    { icon: Sparkles,    title: 'Alimentation',         tip: 'Consommez 5 fruits et légumes par jour. Limitez sel, sucre, graisses saturées.', color: 'emerald' },
  ];

  const colorProg = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', cyan: 'bg-cyan-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500', red: 'bg-red-500', orange: 'bg-orange-500', rose: 'bg-rose-500', purple: 'bg-purple-500' };
  const colorBadge = { emerald: 'bg-emerald-100 text-emerald-700', blue: 'bg-blue-100 text-blue-700', cyan: 'bg-cyan-100 text-cyan-700', indigo: 'bg-indigo-100 text-indigo-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-600', orange: 'bg-orange-100 text-orange-700' };

  const addGoal = async () => {
    if (!newGoal.title || !newGoal.target) return;
    setSaving(true);
    try {
      await patientApi.createWellnessGoal({ type: 'custom', title: newGoal.title, target: Number(newGoal.target), unit: newGoal.unit, color: newGoal.color });
      onReload?.(await patientApi.wellnessGoals());
      notify?.('Objectif ajouté');
      setShowAdd(false);
      setNewGoal({ title: '', target: '', unit: '', color: 'emerald' });
    } catch (e) { notify?.(e.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const updateProgress = async (goal, delta) => {
    const next = Math.max(0, Math.min(goal.target, goal.currentValue + delta));
    const completed = next >= goal.target;
    try {
      await patientApi.updateWellnessGoal(goal.id, { currentValue: next, completed });
      onReload?.(await patientApi.wellnessGoals());
    } catch {}
  };

  const deleteGoal = async (id) => {
    try {
      await patientApi.deleteWellnessGoal(id);
      onReload?.(await patientApi.wellnessGoals());
      notify?.('Objectif supprimé');
    } catch {}
  };

  const completed = goals.filter(g => g.completed).length;

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Bien-être & Prévention</h2>
      <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-xl`} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Bien-être & Prévention</h2>
          <p className={`text-sm ${sub}`}>{completed}/{goals.length} objectifs atteints</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Objectif
        </button>
      </div>

      {showAdd && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setShowAdd(false)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <h3 className="font-bold mb-4">Nouvel objectif</h3>
            <div className="space-y-3">
              <input value={newGoal.title} onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))} placeholder="Ex: Boire 2L d'eau"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <div className="flex gap-2">
                <input type="number" value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: e.target.value }))} placeholder="Cible (ex: 2000)"
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input value={newGoal.unit} onChange={e => setNewGoal(g => ({ ...g, unit: e.target.value }))} placeholder="mL, pas…"
                  className={`w-24 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={addGoal} disabled={saving || !newGoal.title || !newGoal.target}
                  className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Créer'}
                </button>
                <button onClick={() => setShowAdd(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* IMC */}
      {bmi && bmiCategory && (
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Indice de Masse Corporelle (IMC)</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colorBadge[bmiCategory.color] || 'bg-slate-100 text-slate-600'}`}>{bmiCategory.label}</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black">{bmi}</span>
            <div className={`text-sm ${sub} mb-1`}>
              <p>{weight} kg · {height} cm</p>
            </div>
          </div>
          <div className={`mt-3 h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className={`h-3 rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 via-amber-400 to-red-500`} style={{ width: '100%' }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            {['<18.5', '18.5-25', '25-30', '30-35', '>35'].map(l => <span key={l} className={sub}>{l}</span>)}
          </div>
          <div className="relative h-2 mt-0">
            <div className="absolute w-3 h-3 rounded-full border-2 border-white bg-slate-800 -translate-y-4 -translate-x-1.5 shadow-md"
              style={{ left: `${Math.min(98, Math.max(2, ((Number(bmi) - 15) / 25) * 100))}%` }} />
          </div>
        </div>
      )}

      {/* Objectifs */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold text-sm mb-3">Mes objectifs du jour</h3>
        {goals.length === 0 ? (
          <p className={`text-sm ${sub} text-center py-4`}>Aucun objectif — cliquez sur "Objectif" pour en créer un.</p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const prog = goal.progress;
              const barColor = colorProg[goal.color] || colorProg.emerald;
              return (
                <div key={goal.id} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {goal.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      <span className={`text-sm font-semibold ${goal.completed ? 'line-through opacity-60' : ''}`}>{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateProgress(goal, -Math.max(1, goal.target * 0.05))} className={`w-6 h-6 rounded-full ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-100'} flex items-center justify-center text-xs font-bold`}>−</button>
                      <span className={`text-xs font-bold min-w-12 text-center`}>{goal.currentValue}/{goal.target} {goal.unit}</span>
                      <button onClick={() => updateProgress(goal, Math.max(1, goal.target * 0.05))} className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold hover:bg-emerald-700">+</button>
                      <button onClick={() => deleteGoal(goal.id)} className={`ml-1 ${sub} hover:text-red-500`}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${prog}%` }} />
                  </div>
                  <p className={`text-[10px] ${sub} mt-1`}>{prog}% accompli</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips santé */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold text-sm mb-3">Conseils prévention</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {healthTips.map(({ icon: Icon, title, tip, color }) => (
            <div key={title} className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs font-bold">{title}</p>
                <p className={`text-xs ${sub} mt-0.5 leading-relaxed`}>{tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

