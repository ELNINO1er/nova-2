import React, { useState, useEffect, useRef } from 'react';
import { Brain, Send, Bot, Activity, Pill, Calendar, Sparkles, Target, Heart, Zap, AlertTriangle, User } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function PAssistant({ patientData, card, sub, border, darkMode }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Bonjour ! Je suis Nova, votre assistant santé personnel. Comment puis-je vous aider aujourd'hui ?`, ts: new Date() }
  ]);
  const [input, setInput]   = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const suggestions = [
    "Quels médicaments je dois prendre ce soir ?",
    "Mon prochain rendez-vous c'est quand ?",
    "Que signifie une glycémie de 1.10 g/L ?",
    "Quels aliments éviter avec l'hypertension ?",
    "Comment améliorer mon score de santé ?",
    "Dois-je m'inquiéter pour mes résultats d'analyse ?",
  ];

  const simulateResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    if (msg.includes('médic') || msg.includes('comprimé') || msg.includes('soir') || msg.includes('matin'))
      return `D'après votre traitement actuel, veillez à prendre vos médicaments aux horaires prescrits. Consultez votre page **Pilulier** pour voir vos prises du jour. Si vous avez un doute, contactez votre médecin.\n\n⚠️ *Je ne suis pas médecin — consultez toujours un professionnel de santé.*`;
    if (msg.includes('rendez-vous') || msg.includes('rdv'))
      return `Votre prochain rendez-vous est visible dans la section **Rendez-vous** de l'application. Vous pouvez aussi prendre un nouveau RDV via **Trouver un médecin**.\n\n💡 *Pensez à activer les rappels dans vos paramètres.*`;
    if (msg.includes('glycémie') || msg.includes('glucose') || msg.includes('1.10'))
      return `Une glycémie de **1,10 g/L** à jeun est dans la zone haute de la normale (0,70–1,10 g/L). Ce n'est pas alarmant, mais il est conseillé de limiter les sucres rapides et de pratiquer une activité physique régulière.\n\n⚠️ *Consultez votre diabétologue pour un suivi personnalisé.*`;
    if (msg.includes('hypertension') || msg.includes('tension') || msg.includes('aliment'))
      return `Avec de l'hypertension, il est conseillé de :\n• **Réduire le sel** (max 5g/jour)\n• Éviter les charcuteries et plats transformés\n• Limiter l'alcool et la caféine\n• Favoriser les fruits, légumes et poissons gras\n\n💡 *Le régime DASH est particulièrement recommandé.*`;
    if (msg.includes('score') || msg.includes('améliorer') || msg.includes('santé'))
      return `Votre **score de santé** est calculé en tenant compte de vos constantes vitales, de la prise de vos médicaments, de vos vaccins et de vos RDV.\n\nPour l'améliorer :\n• ✅ Prenez vos médicaments régulièrement\n• 📅 Maintenez vos rendez-vous médicaux\n• 💉 Mettez à jour vos vaccins\n• 🏃 Pratiquez 30 min d'activité physique par jour`;
    if (msg.includes('résultat') || msg.includes('analyse') || msg.includes('labo'))
      return `Vos résultats d'analyses sont disponibles dans la section **Résultats labo**. Les valeurs marquées en rouge ou orange méritent attention.\n\n⚠️ *Seul votre médecin peut interpréter correctement vos résultats dans leur contexte clinique.*`;
    if (msg.includes('merci') || msg.includes('super') || msg.includes('ok'))
      return `Avec plaisir ! N'hésitez pas à revenir si vous avez d'autres questions. Prenez soin de vous 😊`;
    return `Je comprends votre question. Pour des informations précises sur **${userMsg.slice(0, 40)}**, je vous recommande de :\n\n1. Consulter les sections dédiées de l'application\n2. Contacter votre médecin via la **Messagerie**\n3. Prendre un RDV via **Trouver un médecin**\n\n⚠️ *NOVA Assistant fournit des informations générales uniquement — pas un avis médical.*`;
  };

  const sendMessage = async () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(m => [...m, { role: 'user', text: txt, ts: new Date() }]);
    setInput('');
    setTyping(true);
    try {
      const reply = await patientApi.assistant(txt);
      const prefix = reply.risk === 'emergency' ? 'Urgence potentielle : ' : reply.risk === 'warning' ? 'Attention : ' : '';
      setMessages(m => [...m, { role: 'assistant', text: `${prefix}${reply.answer}\n\n${reply.disclaimer}`, ts: new Date() }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `Service assistant indisponible. Contactez votre medecin pour toute question medicale.\n\n${err.message || ''}`, ts: new Date() }]);
    } finally {
      setTyping(false);
    }
  };

  const renderText = (txt) => txt.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < txt.split('\n').length - 1 && <br />}
      </span>
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Assistant Nova</h2>
          <p className={`text-xs ${sub}`}>IA Santé · Informations générales uniquement</p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
        </span>
      </div>

      {/* Disclaimer */}
      <div className={`flex items-start gap-2 p-3 rounded-xl border ${darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>Avertissement médical :</strong> NOVA Assistant fournit des informations générales. Il ne remplace pas un médecin. En cas d'urgence, composez le <strong>15 (SAMU)</strong>.
        </p>
      </div>

      {/* Chat */}
      <div className={`${card} border rounded-2xl flex flex-col`} style={{ height: '480px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-red-600 text-white rounded-tr-sm'
                    : (darkMode ? 'bg-slate-800 text-slate-100 rounded-tl-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm')
                }`}>
                  {renderText(msg.text)}
                  <p className={`text-[10px] mt-1 ${isUser ? 'text-red-100 text-right' : sub}`}>
                    {msg.ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="flex gap-1 items-center">
                  {[0,1,2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className={`px-3 pb-2 border-t ${border}`}>
            <p className={`text-[10px] font-semibold ${sub} mt-2 mb-1.5`}>Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border ${darkMode ? 'border-slate-700 hover:border-red-500 hover:text-red-400' : 'border-slate-300 hover:border-red-400 hover:text-red-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`p-3 border-t ${border}`}>
          <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Posez une question à Nova…"
              className={`flex-1 text-sm bg-transparent outline-none ${darkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'}`} />
            <button onClick={sendMessage} disabled={!input.trim() || typing}
              className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40 flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ BIEN-ÊTRE & PRÉVENTION ============ */
