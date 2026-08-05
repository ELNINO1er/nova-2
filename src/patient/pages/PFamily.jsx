import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, X, Heart, UserPlus } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';

const REL_OPTIONS = ['Conjoint(e)', 'Pere', 'Mere', 'Fils', 'Fille', 'Frere', 'Soeur', 'Autre'];
const REL_COLORS = {
  'Conjoint(e)': { bg: 'bg-pink-100 text-pink-700', dark: 'bg-pink-900/30 text-pink-300' },
  'Pere': { bg: 'bg-blue-100 text-blue-700', dark: 'bg-blue-900/30 text-blue-300' },
  'Mere': { bg: 'bg-purple-100 text-purple-700', dark: 'bg-purple-900/30 text-purple-300' },
  'Fils': { bg: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-900/30 text-emerald-300' },
  'Fille': { bg: 'bg-amber-100 text-amber-700', dark: 'bg-amber-900/30 text-amber-300' },
  'Frere': { bg: 'bg-cyan-100 text-cyan-700', dark: 'bg-cyan-900/30 text-cyan-300' },
  'Soeur': { bg: 'bg-rose-100 text-rose-700', dark: 'bg-rose-900/30 text-rose-300' },
  'Autre': { bg: 'bg-slate-100 text-slate-700', dark: 'bg-slate-700 text-slate-300' },
};

const emptyForm = { firstName: '', lastName: '', relationship: 'Conjoint(e)', birthDate: '', notes: '' };

export default function PFamily({ data, onReload, notify, card, sub, darkMode }) {
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    if (!data) return;
    setMembers(Array.isArray(data) ? data : []);
  }, [data]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      relationship: m.relationship || 'Autre',
      birthDate: m.birthDate ? m.birthDate.slice(0, 10) : '',
      notes: m.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      notify?.('Veuillez remplir le nom et le prenom', 'error');
      return;
    }
    try {
      if (editingId) {
        await patientApi.updateFamilyMember(editingId, form);
      } else {
        await patientApi.createFamilyMember(form);
      }
      onReload?.(await patientApi.familyMembers());
      notify?.(editingId ? 'Membre modifie' : 'Membre ajoute');
      setShowForm(false);
      resetForm();
    } catch (error) {
      notify?.(error.message || 'Erreur', 'error');
    }
  };

  const del = async (id) => {
    try {
      await patientApi.deleteFamilyMember(id);
      onReload?.(await patientApi.familyMembers());
      notify?.('Membre supprime');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  const relBadge = (rel) => {
    const c = REL_COLORS[rel] || REL_COLORS['Autre'];
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? c.dark : c.bg}`}>
        {rel}
      </span>
    );
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Famille</h2>
        {[0, 1, 2].map(i => (
          <div key={i} className={`${card} border rounded-2xl p-5`}>
            <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-lg`}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Famille</h2>
          <p className={`text-sm ${sub}`}>{members.length} membre{members.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Ajouter un membre
        </button>
      </div>

      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => { setShowForm(false); resetForm(); }} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-600" />
                {editingId ? 'Modifier le membre' : 'Nouveau membre'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Prenom" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Nom" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                {REL_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optionnel)" rows={2} className={`md:col-span-2 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} resize-none`} />
              <div className="md:col-span-2 flex gap-2">
                <button onClick={save} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">{editingId ? 'Modifier' : 'Ajouter'}</button>
                <button onClick={() => { setShowForm(false); resetForm(); }} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}

      {members.length === 0 ? (
        <div className={`${card} border rounded-2xl p-8 flex flex-col items-center justify-center text-center`}>
          <Users className={`w-16 h-16 ${sub} mb-4`} />
          <p className="font-semibold mb-1">Aucun membre familial</p>
          <p className={`text-sm ${sub}`}>Ajoutez des membres de votre famille pour un meilleur suivi medical.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => (
            <div key={m.id} className={`${card} border rounded-2xl p-5`}>
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-100'} border`}>
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold">{m.firstName} {m.lastName}</h4>
                      <div className="mt-1">{relBadge(m.relationship)}</div>
                    </div>
                  </div>
                  {m.birthDate && (
                    <p className={`text-xs ${sub} mt-2`}>
                      Ne(e) le {new Date(m.birthDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {m.notes && (
                    <p className={`text-xs ${sub} mt-1 line-clamp-2`}>{m.notes}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(m)} className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border text-xs font-semibold flex items-center gap-1`}>
                      <Edit3 className="w-3 h-3" /> Modifier
                    </button>
                    <button onClick={() => setPendingDelete(m.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Suppr.
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer le membre"
          message="Cette action retirera definitivement ce membre de votre liste familiale."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => del(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
