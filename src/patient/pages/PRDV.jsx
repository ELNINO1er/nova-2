import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Plus, X, Check, Trash2, Edit3, Search, CalendarClock, Brain, CheckCircle2 } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDate, formatDateFull, formatShortDayMonth } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';

export default function PRDV({ data, onReload, notify, card, sub, darkMode, setShowVid }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({
    startsAt: '2026-06-01T09:00',
    doctorName: 'Dr. Aïcha Touré',
    specialty: 'Médecine générale',
    location: 'CHU Treichville',
    mode: 'onsite',
  });
  const rs = data?.length ? data.map((r) => {
    const date = new Date(r.startsAt);
    const daysLeft = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
    return {
      d: formatShortDayMonth(r.startsAt),
      t: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      dr: r.doctorName,
      sp: r.specialty,
      l: r.location,
      dl: daysLeft,
      v: r.mode === 'video',
      id: r.id,
      startsAt: r.startsAt,
      status: r.status,
      mode: r.mode,
    };
  }) : [];
  const resetRdvForm = () => {
    setEditingId(null);
    setForm({ startsAt: '2026-06-01T09:00', doctorName: 'Dr. Aïcha Touré', specialty: 'Médecine générale', location: 'CHU Treichville', mode: 'onsite' });
  };
  const openEditRdv = (rdv) => {
    setEditingId(rdv.id);
    setForm({
      startsAt: rdv.startsAt ? rdv.startsAt.slice(0, 16) : '2026-06-01T09:00',
      doctorName: rdv.dr,
      specialty: rdv.sp,
      location: rdv.l,
      mode: rdv.mode || (rdv.v ? 'video' : 'onsite'),
    });
    setShowForm(true);
  };
  const saveRdv = async () => {
    const payload = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      status: 'requested',
    };
    try {
      if (editingId) await patientApi.updateAppointment(editingId, payload);
      else await patientApi.createAppointment(payload);
      onReload?.(await patientApi.appointments());
      notify?.(editingId ? 'Rendez-vous modifié' : 'Rendez-vous créé');
      setShowForm(false);
      resetRdvForm();
    } catch (error) {
      notify?.(error.message || 'Erreur rendez-vous', 'error');
    }
  };
  const deleteRdv = async (id) => {
    if (!id) return;
    try {
      await patientApi.deleteAppointment(id);
      onReload?.(await patientApi.appointments());
      notify?.('Rendez-vous supprimé');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mes Rendez-vous</h2>
        {[0,1,2].map(i => <div key={i} className={`${card} border rounded-2xl p-5`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-lg`}></div></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Mes Rendez-vous</h2>
        <button onClick={() => { resetRdvForm(); setShowForm(true); }} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Nouveau RDV
        </button>
      </div>
      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => { setShowForm(false); resetRdvForm(); }} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <h3 className="font-bold mb-4">{editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({...form, startsAt: e.target.value})} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <input value={form.doctorName} onChange={(e) => setForm({...form, doctorName: e.target.value})} placeholder="Médecin" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <select value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value})} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option value="onsite">Présentiel</option>
                <option value="video">Téléconsultation</option>
              </select>
              <input value={form.specialty} onChange={(e) => setForm({...form, specialty: e.target.value})} placeholder="Spécialité" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Lieu" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <div className="flex gap-2">
                <button onClick={saveRdv} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">{editingId ? 'Modifier' : 'Créer'}</button>
                <button onClick={() => { setShowForm(false); resetRdvForm(); }} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {rs.map((r, i) => (
            <div key={i} className={`${card} border rounded-2xl p-5`}>
              <div className="flex items-start gap-4">
                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl ${i === 0 ? 'bg-red-600 text-white' : darkMode ? 'bg-slate-800' : 'bg-white'} border ${i === 0 ? 'border-red-600' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className="text-xs font-medium">{r.d.split(' ')[1]}</span>
                  <span className="text-2xl font-bold">{r.d.split(' ')[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div><h4 className="font-bold">{r.dr}</h4><p className={`text-xs ${sub}`}>{r.sp}</p></div>
                    {i === 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">J-{r.dl}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                    <span className={`flex items-center gap-1 ${sub}`}><Clock className="w-3 h-3" /> {r.t}</span>
                    <span className={`flex items-center gap-1 ${sub}`}>{r.v ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {r.l}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {r.v ? (
                      <button onClick={() => setShowVid(true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-red-700">
                        <Video className="w-3 h-3" /> Rejoindre
                      </button>
                    ) : (
                      <button onClick={() => { if (r.l) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.l)}`, '_blank'); }} className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border text-xs font-semibold flex items-center gap-1`}><MapPin className="w-3 h-3" /> Itinéraire</button>
                    )}
                    {r.id && (
                      <>
                        <button onClick={() => openEditRdv(r)} className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border text-xs font-semibold flex items-center gap-1`}><Edit3 className="w-3 h-3" /> Modifier</button>
                        <button onClick={() => setPendingDelete(r.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1"><Trash2 className="w-3 h-3" /> Suppr.</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3"><Brain className="w-5 h-5 text-purple-600" /><h3 className="font-bold text-sm">Préparation IA</h3></div>
          <div className="space-y-2">
            {['Palpitations matinales','Tension élevée 18/04','Effets Amlodipine ?'].map((s, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer le rendez-vous"
          message="Cette action retirera le rendez-vous du planning patient."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteRdv(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

