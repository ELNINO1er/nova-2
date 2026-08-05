import React, { useState, useRef } from 'react';
import { FileText, Plus, Trash2, Download, Search, Upload, X, AlertTriangle, CheckCircle2, ClipboardList, FileDown, HardDrive, Microscope } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDate, formatBytes, mapDocumentCategory } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function PDocs({ data, onReload, notify, card, sub, border, darkMode, api: apiOverride }) {
  const api = apiOverride || patientApi;
  const [f, setF] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', category: 'prescription' });
  const [pickedFile, setPickedFile] = useState(null);
  const fileInputRef = useRef(null);

  const rows = Array.isArray(data) ? data : (data?.data || []);
  const apiDocs = rows.length ? rows.map((doc) => ({
    n: doc.title,
    t: doc.mimeType?.includes('pdf') ? 'PDF' : doc.mimeType?.includes('image') ? 'IMG' : 'DOC',
    cat: mapDocumentCategory(doc.category),
    d: formatDate(doc.createdAt),
    s: formatBytes(doc.sizeBytes),
    I: doc.category === 'lab' ? Microscope : doc.category === 'vaccine' ? ClipboardList : FileText,
    c: doc.category === 'lab' ? 'purple' : doc.category === 'vaccine' ? 'emerald' : 'red',
    id: doc.id,
    filePath: doc.filePath,
  })) : [];
  const filt = f === 'all' ? apiDocs : apiDocs.filter(d => d.cat === f);
  const cats = [
    { id: 'all', l: 'Tous' }, { id: 'ordonnance', l: 'Ordonnances' },
    { id: 'analyse', l: 'Analyses' }, { id: 'consultation', l: 'Consultations' },
    { id: 'certificat', l: 'Certificats' }
  ];

  const pickFile = (file) => {
    if (!file) return;
    setPickedFile(file);
    if (!docForm.title) setDocForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }));
  };

  const uploadDocument = async () => {
    if (!pickedFile && !docForm.title) { notify?.('Sélectionnez un fichier ou saisissez un titre', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      if (pickedFile) fd.append('file', pickedFile);
      fd.append('title', docForm.title || pickedFile?.name || 'Document');
      fd.append('category', docForm.category);
      await api.uploadDocument(fd);
      onReload?.(await api.documents());
      notify?.('Document ajouté');
      setShowForm(false);
      setDocForm({ title: '', category: 'prescription' });
      setPickedFile(null);
    } catch (error) {
      notify?.(error.message || 'Erreur upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!id) return;
    try {
      await api.deleteDocument(id);
      onReload?.(await api.documents());
      notify?.('Document supprimé');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mes Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-4`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-32 rounded-lg`}></div></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Mes Documents</h2><p className={`text-sm ${sub}`}>{apiDocs.length} document{apiDocs.length > 1 ? 's' : ''} • Stockage chiffré</p></div>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Importer
        </button>
      </div>

      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => { setShowForm(false); setPickedFile(null); }} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Importer un document</h3>
              <button onClick={() => { setShowForm(false); setPickedFile(null); }}><X className="w-4 h-4" /></button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center mb-3 transition-colors ${
                dragOver ? 'border-red-500 bg-red-50' :
                pickedFile ? 'border-emerald-500 bg-emerald-50' :
                (darkMode ? 'border-slate-600 hover:border-red-500' : 'border-slate-300 hover:border-red-400')
              }`}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => pickFile(e.target.files?.[0])} />
              {pickedFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold truncate max-w-xs">{pickedFile.name}</span>
                  <span className={`text-xs ${sub}`}>({formatBytes(pickedFile.size)})</span>
                </div>
              ) : (
                <>
                  <HardDrive className={`w-8 h-8 mx-auto mb-2 ${sub}`} />
                  <p className={`text-sm font-medium ${sub}`}>Glissez-déposez ou cliquez pour choisir</p>
                  <p className={`text-xs ${sub} mt-1`}>PDF, JPG, PNG, WEBP — max 10 Mo</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre du document"
                className={`col-span-2 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <select value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}
                className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option value="prescription">Ordonnance</option>
                <option value="lab">Analyse</option>
                <option value="consultation">Consultation</option>
                <option value="vaccine">Certificat</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={uploadDocument} disabled={uploading || (!pickedFile && !docForm.title)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileDown className="w-4 h-4" />}
                {uploading ? 'Import en cours…' : 'Importer'}
              </button>
              <button onClick={() => { setShowForm(false); setPickedFile(null); }}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}

      {pendingDelete && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setPendingDelete(null)} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="font-bold text-center mb-1">Supprimer ce document ?</p>
            <p className={`text-xs ${sub} text-center mb-4`}>{pendingDelete.n}</p>
            <div className="flex gap-2">
              <button onClick={() => deleteDocument(pendingDelete.id)} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Supprimer</button>
              <button onClick={() => setPendingDelete(null)} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
            </div>
          </div>
        </>
      )}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900' : 'bg-slate-100'} overflow-x-auto`}>
        {cats.map(c => {
          const cnt = c.id === 'all' ? apiDocs.length : apiDocs.filter(d => d.cat === c.id).length;
          return (
            <button key={c.id} onClick={() => setF(c.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${f === c.id ? 'bg-white text-slate-900 shadow-md' : sub}`}>
              {c.l}
              <span className={`px-1.5 rounded-full text-[10px] ${f === c.id ? 'bg-red-100 text-red-700' : darkMode ? 'bg-slate-800' : 'bg-white'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filt.map((d, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4 hover:shadow-lg hover:scale-[1.02] transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl bg-${d.c}-100 flex items-center justify-center`}><d.I className={`w-6 h-6 text-${d.c}-600`} /></div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{d.t}</span>
            </div>
            <p className="font-semibold text-sm truncate">{d.n}</p>
            <p className={`text-[10px] ${sub} truncate mt-0.5`}>{d.cat}</p>
            <div className={`flex items-center justify-between mt-3 pt-3 border-t border-dashed ${border}`}>
              <span className={`text-[10px] ${sub}`}>{d.d}</span><span className={`text-[10px] ${sub}`}>{d.s}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {d.filePath ? (
                <a href={`${API_BASE_URL}/patient/me/documents/${d.id}/download`}
                  target="_blank" rel="noreferrer"
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Download className="w-3 h-3" /> Ouvrir
                </a>
              ) : (
                <div className={`px-2 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                  <FileText className="w-3 h-3" /> Sans fichier
                </div>
              )}
              <button onClick={() => d.id ? setPendingDelete(d) : undefined} className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-600 text-white flex items-center justify-center gap-1 hover:bg-red-700"><Trash2 className="w-3 h-3" /> Suppr.</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
