import React, { useState } from 'react';
import { Phone, Heart, HeartPulse, AlertTriangle, Shield, Siren, MapPin, Droplet, Users, ShieldCheck, Stethoscope, Download, PhoneCall, Pill, QrCode, ShieldAlert } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';


export default function PUrgence({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  const [qrData, setQrData]   = useState(null);
  const [loadQR, setLoadQR]   = useState(false);

  const urgenceNumbers = [
    { label: 'SAMU',     number: '15', color: 'red',    icon: PhoneCall },
    { label: 'Police',   number: '17', color: 'blue',   icon: Shield },
    { label: 'Pompiers', number: '18', color: 'orange', icon: Siren },
    { label: 'CHU Abidjan', number: '+225 27 21 27 03 33', color: 'purple', icon: Stethoscope },
  ];

  const colorMap = {
    red:    'bg-red-600 hover:bg-red-700',
    blue:   'bg-blue-600 hover:bg-blue-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };

  const fetchQR = async () => {
    setLoadQR(true);
    try {
      const d = await patientApi.emergencyCardQr();
      setQrData(d);
      setShowQR(true);
    } catch (e) {
      alert('Erreur QR : ' + e.message);
    } finally {
      setLoadQR(false);
    }
  };

  const handlePrint = () => window.print();

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">SOS Urgence</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-xl`} />
      </div>
    </div>
  );

  const age = data.birthDate
    ? Math.floor((Date.now() - new Date(data.birthDate)) / (365.25 * 86400000))
    : null;

  return (
    <div className="space-y-4">
      {/* QR modal */}
      {showQR && qrData && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setShowQR(false)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-6 shadow-2xl text-center`}>
            <p className="font-bold mb-1">QR Code — Fiche Urgence</p>
            <p className={`text-xs ${sub} mb-4`}>Scannez en cas d'urgence pour accéder aux infos vitales</p>
            <img src={qrData.qr} alt="QR Urgence" className="mx-auto rounded-xl w-48 h-48" />
            <p className={`text-[10px] ${sub} mt-3`}>{data.firstName} {data.lastName} · {data.bloodType || '?'} · {data.phone}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={handlePrint} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                <Download className="w-4 h-4" /> Imprimer
              </button>
              <button onClick={() => setShowQR(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Fermer</button>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">SOS Urgence</h2>
          <p className={`text-sm ${sub}`}>Fiche médicale d'urgence · Accès immédiat</p>
        </div>
        <button onClick={fetchQR} disabled={loadQR}
          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
          {loadQR ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          QR Code
        </button>
      </div>

      {/* Identity card */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span className="text-xs font-bold tracking-wider uppercase">Fiche Urgence · NOVA</span>
            </div>
            <span className="text-xs font-mono opacity-70">{data.cmuNumber}</span>
          </div>
          <p className="text-2xl font-black">{data.firstName} {data.lastName}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            {age && <span>{age} ans · {data.sex === 'M' ? 'Homme' : data.sex === 'F' ? 'Femme' : data.sex}</span>}
            <span className="font-bold text-lg">{data.bloodType || 'Groupe ?'}</span>
          </div>
        </div>
      </div>

      {/* Numéros urgence */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {urgenceNumbers.map(({ label, number, color, icon: Icon }) => (
          <a key={label} href={`tel:${number}`}
            className={`${colorMap[color]} text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-transform hover:scale-105 active:scale-95`}>
            <Icon className="w-6 h-6" />
            <span className="text-2xl font-black">{number.length <= 3 ? number : label}</span>
            <span className="text-xs font-semibold opacity-90">{label}</span>
          </a>
        ))}
      </div>

      {/* Critical info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allergies */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-sm">Allergies</h3>
          </div>
          {data.allergies?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.allergies.map((a, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{a}</span>
              ))}
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucune allergie connue</p>}
        </div>

        {/* Maladies chroniques */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-sm">Maladies chroniques</h3>
          </div>
          {data.chronicDiseases?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.chronicDiseases.map((d, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{d}</span>
              ))}
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucune maladie chronique</p>}
        </div>

        {/* Médicaments actuels */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm">Médicaments actuels</h3>
          </div>
          {data.currentMedications?.length ? (
            <div className="space-y-1.5">
              {data.currentMedications.map((m, i) => (
                <div key={i} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="font-semibold">{m.name}</span>
                  <span className={sub}>{m.dosage}</span>
                </div>
              ))}
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucun traitement en cours</p>}
        </div>

        {/* Contact urgence */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm">Contact d'urgence</h3>
          </div>
          {data.emergencyContact?.name ? (
            <div className="space-y-1">
              <p className="font-bold">{data.emergencyContact.name}</p>
              <p className={`text-xs ${sub}`}>{data.emergencyContact.relationship}</p>
              <a href={`tel:${data.emergencyContact.phone}`} className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 mt-1">
                <PhoneCall className="w-3.5 h-3.5" /> {data.emergencyContact.phone}
              </a>
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucun contact renseigné</p>}
        </div>
      </div>
    </div>
  );
}

// Lucide doesn't have QrCode in all versions — safe fallback
