import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  HeartPulse,
  KeyRound,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import { authApi } from '../api/authApi.js';

export default function Login({ auth, setAuth, onLogin }) {
  const [mode, setMode] = useState('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [doctorOtpId, setDoctorOtpId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [devCode, setDevCode] = useState('');
  const [err, setErr] = useState('');
  const [load, setLoad] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const cleaned = phone.replace(/\s/g, '');
  const fmt = (v) => v.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();

  const submit = async () => {
    setErr('');
    if (mode === 'phone' && cleaned.length !== 10) return setErr('Numero invalide.');
    if (mode === 'doctor' && (!email || password.length < 4)) return setErr('Email ou mot de passe invalide.');

    setLoad(true);
    try {
      const result = mode === 'doctor'
        ? await authApi.startDoctorPasswordLogin(email, password)
        : await authApi.sendOtp(cleaned);
      setDevCode(result.devCode || '');
      setDoctorOtpId(result.otpId || '');
      setMaskedPhone(result.maskedPhone || '');
      setAuth('otp');
    } catch (error) {
      setErr(error.message || 'Identifiants non reconnus.');
    } finally {
      setLoad(false);
    }
  };

  const verify = async (code) => {
    setLoad(true);
    setErr('');
    try {
      const data = mode === 'doctor'
        ? await authApi.verifyDoctorOtp(doctorOtpId, code)
        : await authApi.verifyOtp(cleaned, code);
      onLogin(data.user);
    } catch (error) {
      setErr(error.message || 'Code incorrect.');
      setLoad(false);
    }
  };

  const onOtp = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 3) refs[i + 1].current?.focus();
    if (next.every(Boolean)) verify(next.join(''));
  };

  const resetOtp = () => {
    setAuth('login');
    setOtp(['', '', '', '']);
    setErr('');
    setLoad(false);
  };

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white p-12">
        <div className="flex flex-col justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-xl">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">NOVA</h1>
              <p className="text-xs text-red-100">Carnet Sante Ivoirien</p>
            </div>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">Plateforme Sante securisee</span>
            <h2 className="text-5xl font-bold leading-tight mt-5">Votre sante,<br /><span className="text-amber-300">en toute serenite.</span></h2>
            <p className="text-red-100 mt-4 text-lg max-w-md">Acces patient, medecin, pharmacie et administration avec OTP.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-100">
            <ShieldCheck className="w-4 h-4" /> RBAC, audit et sessions securisees
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">NOVA</h1>
              <p className="text-xs text-slate-500">Carnet Sante Ivoirien</p>
            </div>
          </div>

          {auth === 'login' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-slate-900">Bienvenue</h3>
                <p className="text-slate-500 mt-2">Choisissez votre mode de connexion.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => { setMode('phone'); setErr(''); }}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'phone' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
                >
                  <User className="w-4 h-4" /> Patient
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('doctor'); setErr(''); }}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'doctor' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
                >
                  <Stethoscope className="w-4 h-4" /> Medecin
                </button>
              </div>

              {mode === 'phone' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase">Numero de telephone</label>
                  <div className={`mt-2 flex items-center gap-2 p-3 rounded-xl border-2 ${err ? 'border-red-300' : 'border-slate-200'} focus-within:border-red-500`}>
                    <span className="text-sm font-semibold text-slate-900">+225</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(fmt(e.target.value)); setErr(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && submit()}
                      placeholder="07 89 45 23 11"
                      className="flex-1 outline-none text-slate-900 font-mono"
                      autoFocus
                    />
                    <Smartphone className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase">Email medecin</label>
                    <div className={`mt-2 flex items-center gap-2 p-3 rounded-xl border-2 ${err ? 'border-red-300' : 'border-slate-200'} focus-within:border-red-500`}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErr(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="aicha.toure@nova.ci"
                        className="flex-1 outline-none text-slate-900"
                      />
                      <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase">Mot de passe</label>
                    <div className={`mt-2 flex items-center gap-2 p-3 rounded-xl border-2 ${err ? 'border-red-300' : 'border-slate-200'} focus-within:border-red-500`}>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErr(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="Mot de passe"
                        className="flex-1 outline-none text-slate-900"
                      />
                      <KeyRound className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {err && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {err}</p>}
              <button
                onClick={submit}
                disabled={load || (mode === 'phone' ? cleaned.length !== 10 : !email || password.length < 4)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {load ? 'Envoi...' : <>Recevoir le code <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-[11px] text-slate-500 text-center">Un code a 4 chiffres sera envoye par SMS.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <button onClick={resetOtp} className="flex items-center gap-1 text-sm text-slate-600 hover:text-red-600">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                  <KeyRound className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Verification</h3>
                <p className="text-slate-500 mt-2">
                  Code envoye au <span className="font-semibold text-slate-900">{mode === 'doctor' ? maskedPhone : `+225 ${phone}`}</span>
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={refs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => onOtp(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs[i - 1].current?.focus(); }}
                    autoFocus={i === 0}
                    className={`w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 ${err ? 'border-red-300' : 'border-slate-200'} focus:border-red-500 outline-none text-slate-900`}
                  />
                ))}
              </div>

              {err && <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4" /> {err}</p>}
              {load && <div className="text-center text-sm text-slate-600">Verification...</div>}
              {devCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900"><strong>Mode dev :</strong> code <strong className="font-mono">{devCode}</strong></p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
