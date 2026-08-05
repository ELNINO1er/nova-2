import React, { useState, useEffect } from 'react';
import { Bot, Brain, Send, Activity, Heart, AlertTriangle, Sparkles, Target, Zap } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';

export default function DAssistantIA({ chronicData, consultData, statsData, loadChronic, loadConsult, loadStats, notify, card, sub, border, darkMode }) {
  const [query,    setQuery]    = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Bonjour Docteur 👋 Je suis votre assistant médical Nova. Je peux vous aider à analyser vos dossiers patients, suggérer des suivis prioritaires et alerter sur des cas à risque. Comment puis-je vous aider ?' }
  ]);

  useEffect(() => {
    if (!chronicData) loadChronic();
    if (!consultData) loadConsult();
    if (!statsData)   loadStats();
  }, []);

  const chronic  = chronicData || [];
  const consults = consultData || [];
  const stats    = statsData || {};

  // Alertes prédictives générées côté client
  const aiAlerts = [
    ...chronic.filter(p => p.risk === 'high').map(p => ({
      level: 'critical', icon: '🚨',
      text: `${p.firstName} ${p.lastName} — ${p.chronicDiseases[0] || 'Maladie chronique'} — Pas de visite depuis ${p.daysSince ?? '?'} jours`,
    })),
    ...chronic.filter(p => p.risk === 'medium').slice(0, 3).map(p => ({
      level: 'warning', icon: '⚠️',
      text: `${p.firstName} ${p.lastName} — Suivi ${p.chronicDiseases[0] || ''} recommandé (${p.daysSince}j)`,
    })),
    ...(stats.diagnoses || []).slice(0, 2).map(d => ({
      level: 'info', icon: '📊',
      text: `Pathologie fréquente : ${d.name} (${d.count} cas). Envisagez un protocole de suivi systématique.`,
    })),
  ].slice(0, 6);

  // Réponse IA simulée
  const handleSend = () => {
    if (!query.trim()) return;
    const q = query.trim();
    setMessages(m => [...m, { role: 'user', text: q }]);
    setQuery('');
    setTimeout(() => {
      let reply = '';
      const ql = q.toLowerCase();
      if (ql.includes('hypertension') || ql.includes('tension'))
        reply = '📋 Pour l\'hypertension artérielle : contrôlez la tension à chaque visite, prescrivez un bilan rénal annuel (créatinine, protéinurie), surveillez les facteurs de risque cardiovasculaires. Recommandez une réduction du sel < 5g/j et 30min d\'activité physique quotidienne.';
      else if (ql.includes('diabète') || ql.includes('glucose') || ql.includes('glycémie'))
        reply = '🩸 Pour le diabète de type 2 : HbA1c toutes les 3 mois jusqu\'à équilibre puis tous les 6 mois. Bilan lipidique annuel. Fond d\'œil + bilan rénal annuel. Surveillance des pieds à chaque consultation. Éducation thérapeutique systématique.';
      else if (ql.includes('patient') && ql.includes('risque'))
        reply = `⚠️ J\'ai identifié ${chronic.filter(p => p.risk === 'high').length} patient(s) à risque critique parmi vos patients chroniques. Je vous recommande de les contacter en priorité pour un bilan de suivi.`;
      else if (ql.includes('consultat') || ql.includes('stats'))
        reply = `📈 Ce mois, vous avez réalisé ${stats.monthConsultations || '—'} consultations. Vos 3 pathologies les plus fréquentes : ${(stats.diagnoses || []).slice(0, 3).map(d => d.name).join(', ') || '—'}.`;
      else if (ql.includes('ordonnance') || ql.includes('prescription'))
        reply = '💊 Rappel légal : toute ordonnance doit comporter votre nom, n° RPPS, la date, le nom du patient et les médicaments avec posologie complète. La durée de validité est limitée selon les classes de médicaments (3 mois pour les stupéfiants).';
      else
        reply = `Je n\'ai pas de réponse précise pour "${q}" dans ma base de connaissances actuelle. Je vous suggère de consulter les recommandations HAS ou de créer une alerte de suivi pour ce patient.`;
      setMessages(m => [...m, { role: 'ai', text: reply }]);
    }, 800);
  };

  const levelCls = { critical: 'border-red-200 bg-red-50', warning: 'border-amber-200 bg-amber-50', info: 'border-blue-200 bg-blue-50' };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-purple-600" /> Assistant IA Nova</h2>
        <p className={`text-sm ${sub}`}>Analyse clinique intelligente • Alertes prédictives</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chat IA */}
        <div className={`${card} border rounded-2xl flex flex-col`} style={{ height: '520px' }}>
          <div className={`p-4 border-b ${border} flex items-center gap-2`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Nova Medical AI</p>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className={`text-[10px] ${sub}`}>En ligne</span></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : (darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800') + ' rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className={`p-3 border-t ${border} flex gap-2`}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Posez votre question médicale..."
              className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
            <button onClick={handleSend} disabled={!query.trim()}
              className="px-3 py-2 rounded-xl bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alertes prédictives */}
        <div className="space-y-3">
          <div className={`${card} border rounded-2xl p-4`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Alertes prédictives
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${aiAlerts.filter(a => a.level === 'critical').length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {aiAlerts.filter(a => a.level === 'critical').length} critique{aiAlerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''}
              </span>
            </h3>
            {aiAlerts.length === 0 ? (
              <p className={`text-xs ${sub} text-center py-4`}>Chargement des données...</p>
            ) : (
              <div className="space-y-2">
                {aiAlerts.map((a, i) => (
                  <div key={i} className={`border rounded-xl p-3 text-xs ${levelCls[a.level] || levelCls.info}`}>
                    <span className="mr-2">{a.icon}</span>{a.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggestions rapides */}
          <div className={`${card} border rounded-2xl p-4`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> Questions fréquentes
            </h3>
            <div className="space-y-2">
              {['Patients à risque critique ?', 'Protocole hypertension', 'Suivi diabète type 2', 'Stats du mois'].map(q => (
                <button key={q} onClick={() => { setQuery(q); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all
                    ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {q} →
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FINANCES
   ════════════════════════════════════════════════════════════════ */
