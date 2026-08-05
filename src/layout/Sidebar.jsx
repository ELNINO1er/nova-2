import React, { useState, useRef } from 'react';
import {
  Heart, Activity, Pill, Calendar, FileText, User, Stethoscope,
  Shield, Search, AlertTriangle, Plus, Check, Clock, Download, X,
  TrendingUp, Bell, MessageCircle, Video, Brain, Mic, Phone,
  Star, Users, BarChart3, Lock, Eye, AlertCircle, CheckCircle2,
  Settings, ChevronRight, MapPin, Droplet, Zap, Sparkles, Send,
  Bot, Award, Target, Sun, Moon, Menu, Home, Edit3, Trash2, Save,
  FileDown, ShieldAlert, ShieldCheck, ServerCog, Database, Siren,
  ClipboardList, Microscope, Syringe, ChevronLeft, CalendarClock,
  HeartPulse, Thermometer, StickyNote, Palette, KeyRound, Smartphone,
  Mail, UserPlus, PhoneCall, Paperclip, MoreVertical, ArrowRight,
  HelpCircle, BookOpen, Pencil, HardDrive, Wifi
} from 'lucide-react';

/* ============== SIDEBAR ============== */
export default function Sidebar({ role, page, setPage, sbOpen, onCP, onCD, badges = {}, darkMode, sub, border }) {
  const sec = role === 'patient' ? [
    { t: 'PRINCIPAL', i: [{id:'dashboard',l:'Accueil',I:Home},{id:'profile',l:'Mon profil',I:User}]},
    { t: 'SUIVI MÉDICAL', i: [
      {id:'vitals',l:'Mes constantes',I:Activity},{id:'pilulier',l:'Pilulier',I:Pill},
      {id:'treatments',l:'Traitements',I:HeartPulse},
      {id:'rdv',l:'Rendez-vous',I:Calendar},{id:'vaccinations',l:'Vaccinations',I:Syringe},
      {id:'dna',l:'ADN Médical',I:Droplet},{id:'labresults',l:'Résultats labo',I:Microscope},
      {id:'history',l:'Historique',I:ClipboardList}
    ]},
    { t: 'COMMUNICATION', i: [
      {id:'notifications',l:'Notifications',I:Bell,b:badges.notifications},
      {id:'messages',l:'Messages',I:MessageCircle,b:badges.messages},
      {id:'prescriptions',l:'Ordonnances',I:FileDown},
      {id:'documents',l:'Documents',I:FileText},
      {id:'notes',l:'Bloc-notes',I:StickyNote}
    ]},
    { t: 'SOINS', i: [
      {id:'doctors',  l:'Trouver un médecin', I:Stethoscope},
      {id:'pharmacy', l:'Pharmacie',          I:Pill},
      {id:'urgence',  l:'SOS Urgence',        I:Siren},
      {id:'assistant',l:'Assistant Nova IA',  I:Bot},
    ]},
    { t: 'BIEN-ÊTRE & ASSURANCE', i: [
      {id:'wellness',  l:'Bien-être',   I:Target},
      {id:'insurance', l:'Assurance',   I:ShieldCheck},
    ]},
    { t: 'FAMILLE & VIE PRIVÉE', i: [
      {id:'family',  l:'Ma famille',    I:Users},
      {id:'privacy', l:'Vie privée',    I:Lock},
    ]},
    { t: 'COMPTE', i: [{id:'settings',l:'Paramètres',I:Settings}]}
  ] : role === 'doctor' ? [
    { t: 'PRINCIPAL', i: [{id:'dashboard',l:'Tableau de bord',I:BarChart3},{id:'patients',l:'Mes patients',I:Users}],
      a: { l: 'Nouveau patient', I: UserPlus, on: onCP }},
    { t: 'ACTIVITÉ', i: [{id:'agenda',l:'Agenda RDV',I:CalendarClock},{id:'consultations',l:'Consultations',I:ClipboardList},{id:'prescriptions',l:'Ordonnances',I:FileDown},{id:'lab-requests',l:'Demandes labo',I:Microscope},{id:'stats',l:'Statistiques',I:TrendingUp}]},
    { t: 'CLINIQUE', i: [{id:'chronic-patients',l:'Suivi chroniques',I:HeartPulse},{id:'urgences',l:'Urgences & Alertes',I:ShieldAlert},{id:'assistant-ia',l:'Assistant IA Nova',I:Brain}]},
    { t: 'GESTION', i: [{id:'finances',l:'Finances',I:TrendingUp},{id:'reputation',l:'Réputation & Avis',I:Award},{id:'signature',l:'Signature électronique',I:Edit3}]},
    { t: 'COMMUNICATION', i: [{id:'messages',l:'Messages',I:MessageCircle,b:badges.messages},{id:'documents',l:'Documents',I:FileText}]},
    { t: 'COMPTE', i: [{id:'profile',l:'Mon profil',I:User},{id:'settings',l:'Paramètres',I:Settings}]}
  ] : role === 'pharmacist' ? [
    { t: 'PRINCIPAL', i: [{id:'dashboard',l:'Tableau de bord',I:Home},{id:'scan',l:'Scanner ordonnance',I:Search}]},
    { t: 'ACTIVITÉ', i: [{id:'history',l:'Historique délivrances',I:ClipboardList}]},
    { t: 'COMPTE', i: [{id:'settings',l:'Paramètres',I:Settings}]}
  ] : [
    { t: 'GOUVERNANCE', i: [{id:'dashboard',l:'Tour de Contrôle',I:BarChart3},{id:'audit',l:"Journal d'audit",I:Lock}]},
    { t: 'GESTION', i: [{id:'users',l:'Utilisateurs',I:Users}],
      as: [{l:'Nouveau médecin',I:Stethoscope,on:onCD},{l:'Nouveau patient',I:UserPlus,on:onCP}]},
    { t: 'INFRASTRUCTURE', i: [{id:'system',l:'Système',I:ServerCog},{id:'settings',l:'Paramètres',I:Settings}]}
  ];

  const sbBg = darkMode ? 'bg-slate-950' : 'bg-white';
  const act = 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/20';
  const ina = darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100';

  return (
    <aside className={`${sbBg} border-r ${border} fixed lg:sticky lg:top-[57px] top-0 left-0 z-50 lg:z-30 w-64 h-screen lg:h-[calc(100vh-57px)] transition-transform duration-300 ${sbOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
      <nav className="flex-1 p-3 overflow-y-auto">
        {sec.map((s, si) => (
          <div key={si} className="mb-5">
            <p className={`text-[10px] font-bold ${sub} px-3 mb-2 tracking-wider`}>{s.t}</p>
            <div className="space-y-0.5">
              {s.i.map(it => {
                const isAct = page === it.id;
                return (
                  <button key={it.id} onClick={() => setPage(it.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isAct ? act : ina}`}>
                    <it.I className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{it.l}</span>
                    {Number(it.b) > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isAct ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>{it.b}</span>}
                  </button>
                );
              })}
              {s.a && (
                <button onClick={s.a.on} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-dashed mt-1 ${darkMode ? 'border-slate-700 text-slate-400 hover:border-red-600' : 'border-slate-300 text-slate-600 hover:border-red-600 hover:text-red-600'}`}>
                  <s.a.I className="w-4 h-4" />
                  <span className="flex-1 text-left">{s.a.l}</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              {s.as && s.as.map((a, ai) => (
                <button key={ai} onClick={a.on} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-dashed mt-1 ${darkMode ? 'border-slate-700 text-slate-400 hover:border-red-600' : 'border-slate-300 text-slate-600 hover:border-red-600 hover:text-red-600'}`}>
                  <a.I className="w-4 h-4" />
                  <span className="flex-1 text-left">{a.l}</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className={`p-3 border-t ${border}`}>
        <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/30 rounded-full -translate-y-10 translate-x-10 blur-2xl"></div>
          <div className="relative">
            <Sparkles className="w-4 h-4 mb-1" />
            <p className="text-xs font-bold">Aide & Support</p>
            <p className="text-[10px] text-red-100 mt-1">24h/24 • 7j/7</p>
            <button className="mt-2 w-full bg-white/20 backdrop-blur text-white text-[10px] font-bold py-1.5 rounded-lg">Contacter</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
