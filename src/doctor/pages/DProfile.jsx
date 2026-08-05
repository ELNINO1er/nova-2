import React from 'react';
import { User, Phone, MapPin, Star, Stethoscope, Award, Calendar } from 'lucide-react';
import { initials } from '../../utils/format.js';

export default function DProfile({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) {
    return <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />;
  }
  const colorMap = { red: 'from-red-600 to-red-800', emerald: 'from-emerald-600 to-emerald-800', blue: 'from-blue-600 to-blue-800', indigo: 'from-indigo-600 to-indigo-800' };
  const grad = colorMap[data.avatarColor] || colorMap.red;

  const fields = [
    { l: 'Spécialité',     v: data.specialty + (data.subSpecialty ? ` — ${data.subSpecialty}` : '') },
    { l: 'Établissement',  v: data.address || '—' },
    { l: 'Ville',          v: data.city || '—' },
    { l: 'Téléphone',      v: data.phone || '—' },
    { l: 'Email',          v: data.email || '—' },
    { l: 'Expérience',     v: `${data.experienceYears} ans` },
    { l: 'Langues',        v: data.languages || 'Français' },
    { l: 'Tarif consultation', v: data.consultationFee ? `${(data.consultationFee / 1000).toFixed(0)} 000 FCFA` : '—' },
    { l: 'CMU',            v: data.acceptsCmu ? 'Acceptée' : 'Non acceptée' },
  ];

  return (
    <div className="space-y-4">
      <div className={`bg-gradient-to-br ${grad} rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black border-2 border-white/30 flex-shrink-0">
          {data.avatarInitials}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Dr. {data.firstName} {data.lastName}</h2>
          <p className="text-white/80 text-sm mt-0.5">{data.specialty} • {data.city}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(data.rating) ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />)}
            </div>
            <span className="text-sm font-bold">{data.rating} ({data.reviewsCount} avis)</span>
          </div>
        </div>
      </div>

      {data.bio && (
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-2">Bio</h3>
          <p className={`text-sm ${sub}`}>{data.bio}</p>
        </div>
      )}

      <div className={`${card} border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
        {fields.map((f, i) => (
          <div key={i}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>{f.l}</p>
            <p className="text-sm font-semibold mt-1">{f.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ORDONNANCES MÉDECIN
   ════════════════════════════════════════════════════════════════ */
