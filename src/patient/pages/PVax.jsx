import React, { useState } from 'react';
import { Syringe, Check, Clock, AlertTriangle, ChevronRight, Search, QrCode, Shield, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import { patientApi } from '../../api/patientApi.js';

export default function PVax({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  const [qrData, setQrData]   = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const openQR = async () => {
    setShowQR(true);
    if (qrData) return;
    setQrLoading(true);
    try {
      const res = await patientApi.emergencyCardQr();
      setQrData(res);
    } catch {
      setQrData(null);
    } finally {
      setQrLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Carnet Vaccinal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-28 rounded-2xl`}></div>)}
        </div>
        <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-40 rounded-lg`}></div></div>
      </div>
    );
  }
  const vs = data.length ? data.map((v) => ({
    n: v.name,
    d: v.injectedAt ? formatDate(v.injectedAt) : 'Non renseigné',
    s: v.status === 'due_soon' ? 'Rappel prévu' : 'À jour',
    c: v.status === 'due_soon' ? 'amber' : 'emerald',
    x: v.nextDueAt ? formatDate(v.nextDueAt) : 'Aucun rappel',
  })) : [];
  const upToDateCount = vs.filter((v) => v.c === 'emerald').length;
  const dueSoonCount = vs.filter((v) => v.c === 'amber').length;
  const coverage = vs.length ? Math.round((upToDateCount / vs.length) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Carnet Vaccinal</h2><p className={`text-sm ${sub}`}>Historique et rappels</p></div>
        <button onClick={openQR} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow hover:opacity-90">
          <QrCode className="w-4 h-4" /> Passeport vaccinal QR
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5">
          <ShieldCheck className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">{upToDateCount}</p><p className="text-xs">Vaccins à jour</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5">
          <Clock className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">{dueSoonCount}</p><p className="text-xs">Rappel à venir</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-5">
          <Syringe className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">{coverage}%</p><p className="text-xs">Couverture</p>
        </div>
      </div>
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4">Historique complet</h3>
        {vs.length === 0 ? (
          <div className="py-8 flex flex-col items-center text-center">
            <Syringe className={`w-10 h-10 ${sub} mb-3`} />
            <p className={`text-sm ${sub}`}>Aucun vaccin enregistré</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vs.map((v, i) => {
            const isAmber = v.c === 'amber';
            return (
            <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${isAmber ? 'bg-amber-100' : 'bg-emerald-100'} flex items-center justify-center`}><Syringe className={`w-5 h-5 ${isAmber ? 'text-amber-600' : 'text-emerald-600'}`} /></div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAmber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{v.s}</span>
              </div>
              <p className="font-bold">{v.n}</p>
              <p className={`text-xs ${sub} mt-1`}>{v.d}</p>
              <p className={`text-xs ${sub} mt-2`}>Prochain : <strong>{v.x}</strong></p>
            </div>
          );})}
        </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
          <div className={`${card} border rounded-2xl p-6 w-full max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Passeport Vaccinal</h3>
                <p className={`text-xs ${sub}`}>Scannez pour vérifier les vaccinations</p>
              </div>
              <button onClick={() => setShowQR(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className={`w-52 h-52 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center animate-pulse`}>
                  <QrCode className={`w-10 h-10 ${sub}`} />
                </div>
              ) : qrData?.qr ? (
                <img src={qrData.qr} alt="QR Code vaccinal" className="w-52 h-52 rounded-xl border-4 border-emerald-500" />
              ) : (
                <div className={`w-52 h-52 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex flex-col items-center justify-center gap-2`}>
                  <QrCode className={`w-10 h-10 ${sub}`} />
                  <p className={`text-xs ${sub}`}>Génération impossible</p>
                </div>
              )}
              <div className="w-full">
                <p className={`text-xs font-bold ${sub} mb-2`}>Vaccinations ({vs.length})</p>
                <div className="space-y-1.5">
                  {vs.map((v, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <span className="font-medium">{v.n}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${v.c === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

