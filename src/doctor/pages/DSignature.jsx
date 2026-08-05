import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Save, Shield, Trash2, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';

export default function DSignature({ data, loading, onSave, notify, card, sub, border, darkMode }) {
  const canvasRef = useRef(null);
  const [drawing,      setDrawing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  // Charger signature existante dans le canvas
  useEffect(() => {
    const sig = data?.signatureData;
    if (!sig) return;
    setSignatureData(sig);
    if (!canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = sig;
  }, [data]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setSaved(false);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = darkMode ? '#e2e8f0' : '#1e293b';
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
    setSaved(false);
  };

  const handleSave = async () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSaving(true);
    try {
      await doctorApi.saveSignature({ signatureData: dataUrl });
      setSignatureData(dataUrl);
      setSaved(true);
      notify('Signature enregistrée');
      onSave();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Edit3 className="w-6 h-6 text-indigo-600" /> Signature électronique</h2>
        <p className={`text-sm ${sub}`}>Votre signature sera apposée automatiquement sur les ordonnances imprimées</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pad de signature */}
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Dessiner votre signature</h3>
            <button onClick={clearCanvas}
              className={`text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg border ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
              <Trash2 className="w-3 h-3" /> Effacer
            </button>
          </div>
          <div className={`rounded-xl border-2 border-dashed overflow-hidden ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`}>
            <canvas
              ref={canvasRef}
              width={400} height={160}
              className="w-full touch-none cursor-crosshair block"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
          </div>
          <p className={`text-xs ${sub} text-center`}>Signez avec votre souris ou votre doigt (écran tactile)</p>
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all
              ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement...</>
              : saved
                ? <><CheckCircle2 className="w-4 h-4" />Signature enregistrée !</>
                : <><Save className="w-4 h-4" />Enregistrer la signature</>}
          </button>
        </div>

        {/* Prévisualisation */}
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <h3 className="font-bold text-sm">Prévisualisation sur ordonnance</h3>
          <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} text-sm`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">Dr. Aïcha Touré</p>
                <p className={`text-xs ${sub}`}>Cardiologie • Abidjan</p>
              </div>
              <div className="text-right">
                <p className="font-black text-red-600 tracking-widest text-base">ORDONNANCE</p>
                <p className={`text-xs ${sub}`}>{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <div className={`h-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`text-xs ${sub} space-y-0.5`}>
              <p><strong>Patient :</strong> Kouamé Bamba</p>
              <p className="mt-2 font-semibold">Prescriptions :</p>
              <p>1. Amlodipine 5mg — 1cp/j — 30 jours</p>
              <p>2. Ramipril 5mg — 1cp matin — 30 jours</p>
            </div>
            <div className="flex justify-end pt-2">
              <div className="w-36 text-right">
                {signatureData ? (
                  <img src={signatureData} alt="Signature" className="h-12 ml-auto mb-1"
                    style={{ filter: darkMode ? 'invert(1)' : 'none' }} />
                ) : (
                  <div className={`h-12 flex items-end justify-center ${sub}`}>
                    <p className="text-xs italic">Signature</p>
                  </div>
                )}
                <div className={`border-t ${border} pt-1`}>
                  <p className={`text-[10px] ${sub}`}>Signature & cachet</p>
                </div>
              </div>
            </div>
          </div>
          {!signatureData && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${darkMode ? 'bg-amber-900/20 border-amber-700/50 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Aucune signature enregistrée. Dessinez et sauvegardez pour l'afficher sur vos ordonnances.</span>
            </div>
          )}
        </div>
      </div>

      {/* Infos légales */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> Valeur légale & Sécurité</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🔒', t: 'Sécurisée', d: 'Stockée chiffrée côté serveur, liée à votre compte uniquement' },
            { icon: '📋', t: 'Ordonnances', d: 'Apposée automatiquement sur toutes les ordonnances imprimées' },
            { icon: '✅', t: 'Conforme ANAM', d: 'Conforme aux exigences de l\'Autorité Nationale d\'Accréditation et de Médecine' },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="font-bold text-sm">{item.t}</p>
              <p className={`text-xs ${sub} mt-0.5`}>{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
