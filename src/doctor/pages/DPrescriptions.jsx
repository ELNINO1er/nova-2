import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Pill, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials } from '../../utils/format.js';

export default function DPrescriptions({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState({ patientId: '', notes: '', validDays: 30 });
  const [items,       setItems]       = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [saving,      setSaving]      = useState(false);
  const [detail,      setDetail]      = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const prescriptions = Array.isArray(data) ? data : [];
  const patients      = Array.isArray(patientsData) ? patientsData : [];

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };
  const addItem    = () => setItems(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    if (!items[0]?.name) return notify('Au moins un médicament requis', 'error');
    setSaving(true);
    try {
      await doctorApi.createPrescription({ ...form, items: items.filter(i => i.name), validDays: Number(form.validDays) });
      notify('Ordonnance émise');
      setShowForm(false);
      setForm({ patientId: '', notes: '', validDays: 30 });
      setItems([{ name: '', dosage: '', frequency: '', duration: '' }]);
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const openDetail = async (rx) => {
    setDetailLoading(true);
    try { setDetail(await doctorApi.prescription(rx.id)); }
    catch (e) { notify(e.message, 'error'); }
    finally { setDetailLoading(false); }
  };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Ordonnances</h2><p className={`text-sm ${sub}`}>{prescriptions.length} émises</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle ordonnance
        </button>
      </div>

      {detail && <PrescriptionDetail rx={detail} onClose={() => setDetail(null)} card={card} sub={sub} border={border} darkMode={darkMode} />}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`${card} border rounded-2xl p-8`}>
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><FileDown className="w-4 h-4 text-red-600" /> Nouvelle ordonnance</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.cmuNumber}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Médicaments *</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-red-600">Médicament {i + 1}</p>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="ml-auto text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[['Nom *', 'name', 'Ex: Paracétamol 500mg'], ['Posologie', 'dosage', 'Ex: 1 cp'], ['Fréquence', 'frequency', 'Ex: 3×/jour'], ['Durée', 'duration', 'Ex: 7 jours']].map(([lbl, fld, ph]) => (
                      <div key={fld}>
                        <label className={`text-[10px] font-bold uppercase ${sub}`}>{lbl}</label>
                        <input value={item[fld]} onChange={e => updateItem(i, fld, e.target.value)} placeholder={ph} className={inp} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Validité (jours)</label>
              <input type="number" value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: e.target.value }))} min="1" max="365" className={inp} />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Instructions..." className={inp} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Save className="w-4 h-4" />Émettre</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : prescriptions.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <FileDown className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune ordonnance émise</p>
        </div>
      ) : prescriptions.map(rx => (
        <div key={rx.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <FileDown className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{rx.patientName}</p>
            <p className={`text-xs ${sub}`}>{rx.cmuNumber}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rx.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {rx.status === 'active' ? 'Active' : 'Expirée'}
              </span>
              <p className={`text-xs ${sub}`}>{new Date(rx.issuedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
              <p className={`text-xs ${sub}`}>{rx.itemsCount} médicament{rx.itemsCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => openDetail(rx)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}>
            <Printer className="w-3 h-3" /> Voir / Imprimer
          </button>
        </div>
      ))}
    </div>
  );
}

function PrescriptionDetail({ rx, onClose, card, sub, border, darkMode }) {
  const rxItems = Array.isArray(rx.items) ? rx.items : [];

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Ordonnance — ${rx.patientName}</title>
<style>
  body{font-family:Arial,sans-serif;padding:40px;max-width:680px;margin:0 auto;color:#1e293b}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #dc2626;padding-bottom:16px;margin-bottom:24px}
  .doc-name{font-weight:bold;font-size:17px}.doc-spec{color:#64748b;font-size:13px;margin-top:2px}
  .rx-title{font-size:22px;font-weight:800;color:#dc2626;letter-spacing:1px}
  .date{color:#64748b;font-size:12px;margin-top:4px;text-align:right}
  .patient{background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th{text-align:left;font-size:10px;text-transform:uppercase;color:#94a3b8;padding:6px 8px;border-bottom:2px solid #e2e8f0;letter-spacing:.5px}
  td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px}
  tr:last-child td{border-bottom:none}
  .notes{margin-top:18px;padding:12px;background:#fefce8;border-radius:8px;font-size:12px;color:#713f12}
  .footer{margin-top:48px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
  .sig{text-align:right;width:160px;border-top:1px solid #334155;padding-top:4px;font-size:11px;color:#475569}
  @media print{button{display:none}}
</style></head><body>
<div class="hdr">
  <div><div class="doc-name">${rx.doctorName}</div><div class="doc-spec">${rx.doctorSpecialty || ''}</div></div>
  <div><div class="rx-title">ORDONNANCE</div><div class="date">${new Date(rx.issuedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
</div>
<div class="patient"><strong>${rx.patientName}</strong><span style="color:#64748b;margin-left:10px;font-size:12px">CMU: ${rx.cmuNumber}</span></div>
<table>
  <thead><tr><th>Médicament</th><th>Posologie</th><th>Fréquence</th><th>Durée</th></tr></thead>
  <tbody>${rxItems.map(i => `<tr><td><strong>${i.name}</strong>${i.instructions ? `<br><span style="font-size:11px;color:#64748b">${i.instructions}</span>` : ''}</td><td>${i.dosage || '—'}</td><td>${i.frequency || '—'}</td><td>${i.duration || '—'}</td></tr>`).join('')}</tbody>
</table>
${rx.notes ? `<div class="notes">📝 ${rx.notes}</div>` : ''}
${rx.validUntil ? `<p style="margin-top:14px;font-size:11px;color:#64748b">Valable jusqu'au : <strong>${new Date(rx.validUntil).toLocaleDateString('fr-FR')}</strong></p>` : ''}
<div class="footer"><span>NOVA — Carnet Santé Numérique</span><div class="sig">Signature et cachet</div></div>
<script>window.onload=()=>window.print()</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className={`p-5 border-b ${border} flex items-center justify-between`}>
          <div>
            <h3 className="font-bold text-lg">Ordonnance</h3>
            <p className={`text-xs ${sub}`}>{rx.patientName} • {new Date(rx.issuedAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
            <button onClick={onClose}><X className={`w-5 h-5 ${sub}`} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className={`rounded-xl p-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <p className={`text-[10px] font-bold uppercase ${sub}`}>Patient</p>
            <p className="font-bold">{rx.patientName}</p>
            <p className={`text-xs ${sub}`}>CMU: {rx.cmuNumber}</p>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-2`}>Médicaments ({rxItems.length})</p>
            <div className="space-y-2">
              {rxItems.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className="font-bold text-sm">{item.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {item.dosage    && <p className={`text-xs ${sub}`}>Dose: <strong>{item.dosage}</strong></p>}
                    {item.frequency && <p className={`text-xs ${sub}`}>Fréq: <strong>{item.frequency}</strong></p>}
                    {item.duration  && <p className={`text-xs ${sub}`}>Durée: <strong>{item.duration}</strong></p>}
                  </div>
                  {item.instructions && <p className="text-xs text-blue-600 mt-1">{item.instructions}</p>}
                </div>
              ))}
            </div>
          </div>
          {rx.notes && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-1`}>Notes</p>
              <p className={`text-sm ${sub}`}>{rx.notes}</p>
            </div>
          )}
          <div className={`flex items-center justify-between text-xs ${sub}`}>
            <span>Émise le {new Date(rx.issuedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</span>
            {rx.validUntil && <span>Valide jusqu'au {new Date(rx.validUntil).toLocaleDateString('fr-FR')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DEMANDES D'ANALYSES
   ════════════════════════════════════════════════════════════════ */
