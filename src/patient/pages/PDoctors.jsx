import React, { useState, useEffect } from 'react';
import { Search, Star, MapPin, Clock, Calendar, Check, ChevronRight, ChevronLeft, Phone, Video, PhoneCall, User, Users, Zap } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDateFull, initials } from '../../utils/format.js';

export default function PDoctors({ data, onBooked, notify, card, sub, border, darkMode, setPage }) {
  const [q, setQ]             = useState('');
  const [specialty, setSpec]  = useState('');
  const [acceptsCmu, setCmu]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots]     = useState(null);
  const [loadingSlots, setLS] = useState(false);
  const [booking, setBooking] = useState(null);

  const specialties = [...new Set((data ?? []).map(d => d.specialty))].sort();

  const filtered = (data ?? []).filter(d => {
    if (specialty && d.specialty !== specialty) return false;
    if (acceptsCmu && !d.acceptsCmu) return false;
    if (q) {
      const lq = q.toLowerCase();
      return d.fullName.toLowerCase().includes(lq) || d.specialty.toLowerCase().includes(lq) || d.city.toLowerCase().includes(lq);
    }
    return true;
  });

  const openDoctor = async (doc) => {
    setSelected(doc);
    setSlots(null);
    setLS(true);
    try {
      const s = await patientApi.doctorSlots(doc.id);
      setSlots(s);
    } catch {
      setSlots([]);
    } finally {
      setLS(false);
    }
  };

  const handleBook = async (slot) => {
    setBooking(slot.id);
    try {
      await patientApi.bookSlot(selected.id, slot.id);
      notify?.(`RDV confirmé le ${slot.date} à ${slot.time} avec ${selected.fullName}`);
      setSelected(null);
      onBooked?.();
    } catch (e) {
      notify?.(e.message || 'Erreur réservation', 'error');
    } finally {
      setBooking(null);
    }
  };

  const avatarBg = {
    red: 'from-red-500 to-red-700', purple: 'from-purple-500 to-purple-700',
    blue: 'from-blue-500 to-blue-700', orange: 'from-orange-500 to-orange-700',
    emerald: 'from-emerald-500 to-emerald-700', indigo: 'from-indigo-500 to-indigo-700',
    pink: 'from-pink-500 to-pink-700', cyan: 'from-cyan-500 to-cyan-700',
  };

  // Group slots by date
  const slotsByDate = {};
  if (slots) {
    for (const s of slots) {
      if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
      slotsByDate[s.date].push(s);
    }
  }

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Trouver un médecin</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-5`}><div className={`animate-pulse h-28 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {selected && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setSelected(null)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl shadow-2xl`}>
            {/* Header */}
            <div className={`p-5 border-b ${border} flex items-center gap-4`}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarBg[selected.avatarColor] || avatarBg.red} text-white flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                {selected.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{selected.fullName}</p>
                <p className={`text-sm ${sub}`}>{selected.specialty}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold"><Star className="w-3 h-3" />{selected.rating} ({selected.reviewsCount} avis)</span>
                  <span className={`text-xs ${sub}`}>{selected.experienceYears} ans d'expérience</span>
                  {selected.acceptsCmu && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">CMU</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            {/* Bio */}
            {selected.bio && <div className={`px-5 py-3 border-b ${border}`}><p className={`text-sm ${sub}`}>{selected.bio}</p></div>}
            {/* Info */}
            <div className={`px-5 py-3 border-b ${border} grid grid-cols-2 gap-2 text-xs`}>
              <div className="flex items-center gap-2"><MapPin className={`w-3.5 h-3.5 ${sub}`} /><span className={sub}>{selected.address || selected.city}</span></div>
              <div className="flex items-center gap-2"><PhoneCall className={`w-3.5 h-3.5 ${sub}`} /><span className={sub}>{selected.phone}</span></div>
              <div className="flex items-center gap-2"><Zap className={`w-3.5 h-3.5 text-amber-500`} /><span className={sub}>Consultation : {(selected.consultationFee / 1000).toFixed(0)} 000 FCFA</span></div>
              <div className="flex items-center gap-2"><Users className={`w-3.5 h-3.5 ${sub}`} /><span className={sub}>Langues : {selected.languages}</span></div>
            </div>
            {/* Slots */}
            <div className="p-5">
              <p className="font-bold text-sm mb-3">Créneaux disponibles</p>
              {loadingSlots ? (
                <div className={`animate-pulse h-20 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
              ) : Object.keys(slotsByDate).length === 0 ? (
                <p className={`text-sm ${sub} text-center py-6`}>Aucun créneau disponible pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(slotsByDate).slice(0, 5).map(([date, daySlots]) => (
                    <div key={date}>
                      <p className={`text-xs font-bold ${sub} mb-1.5`}>{formatDateFull(date)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {daySlots.map(slot => (
                          <button key={slot.id} onClick={() => handleBook(slot)} disabled={booking === slot.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              booking === slot.id ? 'bg-red-600 text-white border-red-600 opacity-60' :
                              (darkMode ? 'border-slate-600 hover:border-red-500 hover:text-red-400' : 'border-slate-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600')
                            }`}>
                            {booking === slot.id ? '…' : slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-2xl font-bold">Trouver un médecin</h2>
        <p className={`text-sm ${sub}`}>{filtered.length} professionnel{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className={`${card} border rounded-2xl p-4 flex flex-col sm:flex-row gap-3`}>
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, spécialité, ville…"
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
        </div>
        <select value={specialty} onChange={e => setSpec(e.target.value)}
          className={`px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <option value="">Toutes spécialités</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className={`flex items-center gap-2 text-sm cursor-pointer ${sub}`}>
          <input type="checkbox" checked={acceptsCmu} onChange={e => setCmu(e.target.checked)} className="rounded" />
          CMU acceptée
        </label>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(doc => (
          <button key={doc.id} onClick={() => openDoctor(doc)}
            className={`${card} border rounded-2xl p-4 text-left hover:shadow-lg hover:scale-[1.01] transition-all`}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarBg[doc.avatarColor] || avatarBg.red} text-white flex items-center justify-center font-bold flex-shrink-0`}>
                {doc.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm">{doc.fullName}</p>
                    <p className={`text-xs ${sub}`}>{doc.specialty}</p>
                  </div>
                  {doc.isAvailable
                    ? <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" title="Disponible" />
                    : <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" title="Indisponible" />
                  }
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold"><Star className="w-3 h-3" />{doc.rating}</span>
                  <span className={`text-xs ${sub} flex items-center gap-1`}><MapPin className="w-3 h-3" />{doc.city.split(' - ')[1] || doc.city}</span>
                  {doc.acceptsCmu && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">CMU</span>}
                </div>
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t border-dashed ${border} flex items-center justify-between`}>
              <span className={`text-xs ${sub}`}>{doc.experienceYears} ans d'expérience</span>
              <span className="text-xs font-semibold text-red-600">{(doc.consultationFee / 1000).toFixed(0)} 000 FCFA</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ NOTIFICATIONS ============ */
