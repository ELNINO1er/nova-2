import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Edit3, Trash2, Save, X, Palette, Pencil, Star } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatRelativeDate } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';

export default function PNotes({ data, onReload, notify, card, sub, border, darkMode }) {
  const [ns, setNs] = useState([]);
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  useEffect(() => {
    if (!data) return;
    const apiNotes = data.map((note) => ({
      id: note.id,
      t: note.title,
      c: note.content,
      col: note.color,
      u: formatRelativeDate(note.updatedAt),
      p: note.pinned,
    }));
    setNs(apiNotes);
    if (!sel || !apiNotes.find(n => n.id === sel.id)) setSel(apiNotes[0] || null);
  }, [data]);
  const cm = {
    amber: { bg: 'bg-amber-100', t: 'text-amber-900', b: 'border-amber-300', tab: 'bg-amber-400' },
    blue: { bg: 'bg-blue-100', t: 'text-blue-900', b: 'border-blue-300', tab: 'bg-blue-400' },
    emerald: { bg: 'bg-emerald-100', t: 'text-emerald-900', b: 'border-emerald-300', tab: 'bg-emerald-400' },
    red: { bg: 'bg-red-100', t: 'text-red-900', b: 'border-red-300', tab: 'bg-red-400' },
    purple: { bg: 'bg-purple-100', t: 'text-purple-900', b: 'border-purple-300', tab: 'bg-purple-400' }
  };

  const add = async () => {
    const created = await patientApi.createNote({ title: 'Nouvelle note', content: '', color: 'amber', pinned: false });
    const n = { id: created.id, t: created.title, c: created.content, col: created.color, u: 'À l\'instant', p: created.pinned };
    setNs([n, ...ns]); setSel(n); setEdit(true);
    onReload?.(await patientApi.notes());
  };
  const upd = async (ch) => {
    const u = { ...sel, ...ch, u: 'À l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
    await patientApi.updateNote(u.id, { title: u.t, content: u.c, color: u.col, pinned: u.p });
    onReload?.(await patientApi.notes());
  };
  const del = async (id) => {
    try {
      await patientApi.deleteNote(id);
      const f = ns.filter(n => n.id !== id);
      setNs(f); if (sel?.id === id) setSel(f[0] || null);
      onReload?.(await patientApi.notes());
      notify?.('Note supprimée');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };
  const updLocal = (ch) => {
    const u = { ...sel, ...ch, u: 'A l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
  };
  const saveNote = async () => {
    if (!sel) return;
    try {
      await patientApi.updateNote(sel.id, { title: sel.t, content: sel.c, color: sel.col, pinned: sel.p });
      onReload?.(await patientApi.notes());
      notify?.('Note enregistrée');
      setEdit(false);
    } catch (error) {
      notify?.(error.message || 'Erreur note', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Bloc-notes</h2>
        <div className={`${card} border rounded-2xl p-4 min-h-[600px]`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-96 rounded-lg`}></div></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Bloc-notes</h2><p className={`text-sm ${sub}`}>{ns.length} note{ns.length > 1 ? 's' : ''}</p></div>
        <button onClick={add} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Nouvelle note
        </button>
      </div>
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${card} border rounded-2xl p-4 min-h-[600px]`}>
        <div className={`lg:col-span-1 lg:border-r ${border} lg:pr-4 space-y-2 max-h-[500px] overflow-y-auto`}>
          {ns.sort((a, b) => (b.p ? 1 : 0) - (a.p ? 1 : 0)).map(n => {
            const c = cm[n.col];
            return (
              <button key={n.id} onClick={() => { setSel(n); setEdit(false); }} className={`w-full p-3 rounded-xl border-l-4 ${c.b} ${sel?.id === n.id ? c.bg : darkMode ? 'bg-slate-800' : 'bg-slate-50'} text-left`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`font-bold text-sm truncate ${sel?.id === n.id ? c.t : ''}`}>{n.t}</h4>
                  {n.p && <Star className="w-3 h-3 text-amber-500 flex-shrink-0 fill-amber-500" />}
                </div>
                <p className={`text-xs ${sel?.id === n.id ? c.t + ' opacity-80' : sub} line-clamp-2 whitespace-pre-line`}>{n.c || 'Vide...'}</p>
                <p className={`text-[10px] mt-1 ${sel?.id === n.id ? c.t + ' opacity-60' : sub}`}>{n.u}</p>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-2">
          {sel ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {edit ? (
                  <input type="text" value={sel.t} onChange={(e) => updLocal({ t: e.target.value })}
                    className={`flex-1 text-xl font-bold bg-transparent outline-none border-b-2 ${border} pb-1`} />
                ) : (
                  <h3 className="text-xl font-bold flex-1">{sel.t}</h3>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => upd({ p: !sel.p })} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <Star className={`w-4 h-4 ${sel.p ? 'text-amber-500 fill-amber-500' : sub}`} />
                  </button>
                  <button onClick={() => edit ? saveNote() : setEdit(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    {edit ? <Save className="w-4 h-4 text-emerald-600" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setPendingDelete(sel.id)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              {edit && (
                <div className="flex gap-2">
                  {Object.keys(cm).map(c => (
                    <button key={c} onClick={() => updLocal({ col: c })} className={`w-6 h-6 rounded-full ${cm[c].tab} ${sel.col === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}></button>
                  ))}
                </div>
              )}
              <p className={`text-xs ${sub}`}>Mis à jour : {sel.u}</p>
              {edit ? (
                <textarea value={sel.c} onChange={(e) => updLocal({ c: e.target.value })} placeholder="Écrivez..."
                  className={`w-full min-h-[400px] p-4 rounded-xl border text-sm leading-relaxed ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:ring-2 focus:ring-red-500 resize-none`} />
              ) : (
                <div className={`p-4 rounded-xl ${cm[sel.col].bg} ${cm[sel.col].t} min-h-[400px] whitespace-pre-line text-sm leading-relaxed`}>
                  {sel.c || <span className="opacity-50">Note vide.</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <StickyNote className={`w-16 h-16 ${sub} mb-4`} />
              <p className={`text-sm ${sub}`}>Sélectionnez ou créez une note</p>
            </div>
          )}
        </div>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer la note"
          message="Cette action retirera definitivement cette note."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => del(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ASSURANCE
   ════════════════════════════════════════════════════════════════ */
