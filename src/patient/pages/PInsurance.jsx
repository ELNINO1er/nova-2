import React from 'react';
import { Shield, Check, Phone, MapPin, Calendar, FileText, CheckCircle2, Stethoscope } from 'lucide-react';
import { formatDate } from '../../utils/format.js';

export default function PInsurance({ data, card, sub, border, darkMode }) {
  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes Assurances</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0,1].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-40 rounded-2xl`} />)}
      </div>
    </div>
  );

  const colorMap = {
    blue:    { bg: 'from-blue-600 to-blue-800',    badge: 'bg-blue-100 text-blue-700' },
    emerald: { bg: 'from-emerald-600 to-teal-700', badge: 'bg-emerald-100 text-emerald-700' },
    red:     { bg: 'from-red-600 to-red-800',      badge: 'bg-red-100 text-red-700' },
    amber:   { bg: 'from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-700' },
  };

  const totalRate = data.length ? Math.round(data.reduce((s, i) => s + i.reimbursementRate, 0) / data.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Mes Assurances</h2>
          <p className={`text-sm ${sub}`}>Couvertures santé actives</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold">
          <Shield className="w-4 h-4" />
          Taux moyen : {totalRate}%
        </div>
      </div>

      {data.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center text-center gap-3`}>
          <Shield className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune assurance enregistrée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((ins) => {
            const c = colorMap[ins.logoColor] || colorMap.blue;
            const isActive = ins.status === 'active';
            const validTo = ins.validTo ? new Date(ins.validTo).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) : '—';
            const validFrom = ins.validFrom ? new Date(ins.validFrom).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—';
            return (
              <div key={ins.id} className={`rounded-2xl overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
                {/* Header carte */}
                <div className={`bg-gradient-to-r ${c.bg} text-white p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-lg">
                      {ins.provider.slice(0, 2)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
                      {isActive ? 'Actif' : 'Expiré'}
                    </span>
                  </div>
                  <p className="font-black text-xl tracking-wide">{ins.provider}</p>
                  <p className="text-xs text-white/70 mt-1 font-mono">{ins.policyNumber}</p>
                </div>
                {/* Corps */}
                <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${sub}`}>Titulaire</span>
                    <span className="text-sm font-semibold">{ins.holderName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${sub}`}>Couverture</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{ins.coverageType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${sub}`}>Validité</span>
                    <span className="text-xs font-semibold">{validFrom} → {validTo}</span>
                  </div>
                  <div className={`pt-2 border-t ${border}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${sub}`}>Taux de remboursement</span>
                      <span className="text-sm font-black text-emerald-600">{ins.reimbursementRate}%</span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${ins.reimbursementRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infos remboursement */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Processus de remboursement
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Consultation',   desc: 'Demandez une fiche de soins lors de votre visite',         icon: Stethoscope },
            { step: '2', title: 'Soumission',      desc: 'Envoyez les justificatifs à votre assureur',               icon: FileText },
            { step: '3', title: 'Remboursement',   desc: 'Sous 5 à 10 jours ouvrés selon votre contrat',            icon: CheckCircle2 },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{step}</div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className={`text-xs ${sub} mt-0.5`}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHARMACIE CONNECTÉE
   ════════════════════════════════════════════════════════════════ */
