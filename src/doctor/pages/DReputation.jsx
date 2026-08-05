import React from 'react';
import { Award, Star, TrendingUp, Users } from 'lucide-react';

export default function DReputation({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0,1].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />)}
    </div>
  );

  const { avgRating, total, distribution, ratings = [] } = data;
  const maxDist = Math.max(...distribution.map(d => d.count), 1);
  const recommend = total > 0
    ? Math.round((distribution.filter(d => d.star >= 4).reduce((s, d) => s + d.count, 0) / total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Réputation & Avis patients</h2>
        <p className={`text-sm ${sub}`}>{total} avis reçus</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score global */}
        <div className={`${card} border rounded-2xl p-6 flex flex-col items-center justify-center gap-3`}>
          <div className="text-6xl font-black text-amber-500">{avgRating}</div>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : sub}`} />
            ))}
          </div>
          <p className={`text-sm ${sub}`}>{total} avis • {recommend}% recommandent</p>
          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            {[{ l: 'Avis 5★', v: distribution[0]?.count || 0, c: 'emerald' },
              { l: 'Avis 4★', v: distribution[1]?.count || 0, c: 'blue' },
              { l: '< 3★',   v: distribution.slice(2).reduce((s, d) => s + d.count, 0), c: 'amber' }].map((k, i) => (
              <div key={i} className={`${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-black text-${k.c}-600`}>{k.v}</p>
                <p className={`text-[10px] ${sub}`}>{k.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution étoiles */}
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Distribution des notes</h3>
          <div className="space-y-3">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-0.5 w-20 flex-shrink-0">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= star ? 'fill-amber-400 text-amber-400' : sub}`} />
                  ))}
                </div>
                <div className={`flex-1 h-5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                    style={{ width: `${(count / maxDist) * 100}%` }} />
                </div>
                <p className={`text-xs font-bold w-8 text-right flex-shrink-0 ${sub}`}>{count}</p>
              </div>
            ))}
          </div>
          {total === 0 && <p className={`text-xs ${sub} text-center py-4`}>Aucun avis reçu pour l'instant</p>}
        </div>
      </div>

      {/* Liste des avis */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold text-sm mb-4">Tous les avis ({ratings.length})</h3>
        {ratings.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <Award className={`w-10 h-10 ${sub}`} />
            <p className={`text-sm ${sub}`}>Aucun avis patient pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ratings.map((r, i) => (
              <div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold">
                      {r.patientName[0]}
                    </div>
                    <p className="font-semibold text-sm">{r.patientName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : sub}`} />
                      ))}
                    </div>
                    <p className={`text-xs ${sub}`}>{new Date(r.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                </div>
                {r.comment
                  ? <p className={`text-sm ${sub} italic`}>"{r.comment}"</p>
                  : <p className={`text-xs ${sub}`}>Aucun commentaire</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SIGNATURE ÉLECTRONIQUE
   ════════════════════════════════════════════════════════════════ */
