import React, { useState, useEffect } from 'react';
import { ClipboardList, Edit3, Plus, Save, Stethoscope, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials } from '../../utils/format.js';

export default function DCons({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', motif: '', diagnosisMain: '', diagnosisSecondary: '', notes: '', recommendations: '' });
  const [saving, setSaving] = useState(false);
  const [editCons, setEditCons] = useState(null); // {id, motif, diagnosisMain, diagnosisSecondary, notes, recommendations, status}
  const [editSaving, setEditSaving] = useState(false);

  const consultations = Array.isArray(data) ? data : [];
  const patients = Array.isArray(patientsData) ? patientsData : [];

  const handleShowForm = () => {
    setShowForm(true);
    if (!patientsData) loadPatients();
  };

  const openEdit = (c) => setEditCons({
    id: c.id, motif: c.motif || '', diagnosisMain: c.diagnosisMain || '',
    diagnosisSecondary: c.diagnosisSecondary || '', notes: c.notes || '',
    recommendations: c.recommendations || '', status: c.status,
  });

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      await doctorApi.updateConsultation(editCons.id, editCons);
      notify('Consultation mise à jour');
      setEditCons(null);
      onReload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    setSaving(true);
    try {
      await doctorApi.createConsultation(form);
      notify('Consultation enregistrée');
      setShowForm(false);
      setForm({ patientId: '', motif: '', diagnosisMain: '', diagnosisSecondary: '', notes: '', recommendations: '' });
      onReload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const fld = (label, key, type = 'input', placeholder = '') => (
    <div>
      <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} placeholder={placeholder}
          className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
      ) : (
        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
          className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Consultations</h2><p className={`text-sm ${sub}`}>{consultations.length} enregistrées</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle consultation
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-red-600" /> Nouvelle consultation</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
              className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.cmuNumber}</option>)}
            </select>
          </div>
          {fld('Motif de consultation', 'motif', 'textarea', 'Symptômes, raison de la visite...')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fld('Diagnostic principal', 'diagnosisMain', 'input', 'Ex: Hypertension artérielle stade 1')}
            {fld('Diagnostic secondaire', 'diagnosisSecondary', 'input', 'Optionnel')}
          </div>
          {fld('Observations médicales', 'notes', 'textarea', 'Notes cliniques, examens...')}
          {fld('Recommandations', 'recommendations', 'textarea', 'Traitement, suivi, conseils...')}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement...</> : <><Save className="w-4 h-4" />Enregistrer</>}
            </button>
          </div>
        </div>
      )}

      {/* Modale d'édition consultation */}
      {editCons && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
            <div className={`p-5 border-b ${border} flex items-center justify-between`}>
              <h3 className="font-bold flex items-center gap-2"><Edit3 className="w-4 h-4 text-red-600" /> Modifier la consultation</h3>
              <button onClick={() => setEditCons(null)}><X className={`w-5 h-5 ${sub}`} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {[
                { l: 'Motif', k: 'motif', type: 'textarea' },
                { l: 'Diagnostic principal', k: 'diagnosisMain' },
                { l: 'Diagnostic secondaire', k: 'diagnosisSecondary' },
                { l: 'Observations', k: 'notes', type: 'textarea' },
                { l: 'Recommandations', k: 'recommendations', type: 'textarea' },
              ].map(({ l, k, type }) => (
                <div key={k}>
                  <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>{l}</label>
                  {type === 'textarea' ? (
                    <textarea value={editCons[k]} onChange={e => setEditCons(c => ({ ...c, [k]: e.target.value }))} rows={3}
                      className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
                  ) : (
                    <input value={editCons[k]} onChange={e => setEditCons(c => ({ ...c, [k]: e.target.value }))}
                      className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
                  )}
                </div>
              ))}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Statut</label>
                <select value={editCons.status} onChange={e => setEditCons(c => ({ ...c, status: e.target.value }))}
                  className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <option value="draft">Brouillon</option>
                  <option value="completed">Terminée</option>
                </select>
              </div>
            </div>
            <div className={`p-5 border-t ${border} flex gap-3`}>
              <button onClick={() => setEditCons(null)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
                Annuler
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {editSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Save className="w-4 h-4" />Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-24 rounded-2xl`} />)}</div>
      ) : consultations.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <ClipboardList className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune consultation</p>
        </div>
      ) : consultations.map(c => (
        <div key={c.id} className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-full min-h-[3rem] rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <div>
                  <p className="font-bold">{c.patientName}</p>
                  <p className={`text-xs ${sub}`}>{new Date(c.startedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {c.status === 'draft' ? 'Brouillon' : 'Terminée'}
                  </span>
                  <button onClick={() => openEdit(c)}
                    className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}>
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {c.motif && <p className={`text-xs ${sub} mt-1`}><strong>Motif :</strong> {c.motif}</p>}
              {c.diagnosisMain && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  <Stethoscope className="w-3 h-3" />{c.diagnosisMain}
                </div>
              )}
              {c.notes && <p className={`text-xs ${sub} mt-2 line-clamp-2`}>{c.notes}</p>}
              {c.recommendations && <p className="text-xs text-blue-600 font-medium mt-1">→ {c.recommendations}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   STATISTIQUES
   ════════════════════════════════════════════════════════════════ */
