import React, { Component, lazy, Suspense, useEffect, useState } from 'react';
import { Bell, Bot, HeartPulse, Menu, Moon, Pill, Shield, Stethoscope, Sun, User } from 'lucide-react';
import Login from './auth/Login.jsx';
import Sidebar from './layout/Sidebar.jsx';
import { authApi } from './api/authApi.js';
import { patientApi } from './api/patientApi.js';
import { AyaChat, ConsModal, CreateDoctorModal, CreatePatientModal, QRModal, RxModal, VideoModal } from './modals/index.jsx';

const PatientPages = lazy(() => import('./patient/PatientPages.jsx'));
const DoctorPages = lazy(() => import('./doctor/DoctorPages.jsx'));
const AdminPages = lazy(() => import('./admin/AdminPages.jsx'));
const PharmacyPages = lazy(() => import('./pharmacy/PharmacyPages.jsx'));

const ROLE_META = {
  patient:    { label: 'Espace patient',    Icon: User,        color: 'text-blue-700 bg-blue-50 border-blue-200' },
  doctor:     { label: 'Espace docteur',    Icon: Stethoscope, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pharmacist: { label: 'Espace pharmacie',  Icon: Pill,        color: 'text-teal-700 bg-teal-50 border-teal-200' },
  admin:      { label: 'Espace admin',      Icon: Shield,      color: 'text-purple-700 bg-purple-50 border-purple-200' },
};

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
            <HeartPulse className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold">Une erreur est survenue</h2>
          <p className="text-sm text-slate-500 max-w-sm">Rechargez la page pour continuer.</p>
          <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageFallback({ darkMode }) {
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-4 animate-pulse">
      <div className={`h-36 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-100'}`}></div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`h-32 rounded-xl ${block}`}></div>
        <div className={`h-32 rounded-xl ${block}`}></div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('nova_user');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [auth, setAuth] = useState(() => {
    try {
      return localStorage.getItem('nova_user') ? 'ok' : 'login';
    } catch {}
    return 'login';
  });
  const [page, setPage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nova_darkMode') === 'true');
  const [showQR, setShowQR] = useState(false);
  const [showAya, setShowAya] = useState(false);
  const [showRx, setShowRx] = useState(false);
  const [showCons, setShowCons] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [showCD, setShowCD] = useState(false);
  const [showVid, setShowVid] = useState(false);
  const [patientCreatedTick, setPatientCreatedTick] = useState(0);
  const [badges, setBadges] = useState({});
  const [pills, setPills] = useState({});
  const [sbOpen, setSbOpen] = useState(false);
  const role = user?.role || 'patient';

  // Auto-logout si le refresh token échoue
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setAuth('login');
    };
    window.addEventListener('nova:logout', handleLogout);
    return () => window.removeEventListener('nova:logout', handleLogout);
  }, []);

  const onLogin = (u) => {
    localStorage.setItem('nova_user', JSON.stringify(u));
    setUser(u);
    setBadges({});
    setPage('dashboard');
    setAuth('ok');
  };

  const onLogout = () => {
    authApi.logout().catch?.(() => {});
    localStorage.removeItem('nova_user');
    setUser(null);
    setBadges({});
    setAuth('login');
  };

  useEffect(() => {
    if (auth !== 'ok' || role !== 'patient') return;
    let cancelled = false;
    Promise.allSettled([patientApi.notifications(), patientApi.conversations()])
      .then(([notificationsResult, conversationsResult]) => {
        if (cancelled) return;
        const notifications = notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value)
          ? notificationsResult.value.filter((n) => !n.isRead).length
          : 0;
        const messages = conversationsResult.status === 'fulfilled' && Array.isArray(conversationsResult.value)
          ? conversationsResult.value.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
          : 0;
        setBadges({ notifications, messages });
      });
    return () => { cancelled = true; };
  }, [auth, role]);

  if (auth !== 'ok') return <Login auth={auth} setAuth={setAuth} onLogin={onLogin} />;

  const RoleIcon = ROLE_META[role]?.Icon || User;
  const roleLabel = ROLE_META[role]?.label || 'Espace utilisateur';
  const bg = darkMode ? 'bg-slate-950' : 'bg-white';
  const text = darkMode ? 'text-slate-100' : 'text-slate-900';
  const card = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';
  const sub = darkMode ? 'text-slate-400' : 'text-slate-600';
  const border = darkMode ? 'border-slate-800' : 'border-slate-200';
  const hover = darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100';
  const props = { card, sub, border, darkMode };

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col`}>
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-slate-950/90' : 'bg-white/90'} backdrop-blur-xl border-b ${border}`}>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSbOpen(true)} className={`lg:hidden p-2 rounded-lg ${hover}`} aria-label="Ouvrir le menu"><Menu className="w-5 h-5" /></button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20">
                <HeartPulse className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">NOVA</h1>
                <p className={`text-[10px] ${sub} -mt-1 hidden sm:block`}>Carnet Santé Ivoirien</p>
              </div>
            </div>
          </div>
          <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : ROLE_META[role]?.color}`}>
            <RoleIcon className="w-4 h-4" />
            <span>{roleLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem('nova_darkMode', next); }} className={`p-2 rounded-lg ${hover}`} aria-label={darkMode ? 'Mode clair' : 'Mode sombre'}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className={`relative p-2 rounded-lg ${hover}`} aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            </button>
            <button onClick={onLogout} className={`hidden sm:flex items-center gap-2 pl-3 border-l ${border}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold">{user?.avatar || 'U'}</div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-tight">{user?.name || 'Utilisateur'}</p>
                <p className={`text-[10px] ${sub}`}>Se déconnecter</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {sbOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSbOpen(false)}></div>}
        <Sidebar role={role} page={page} setPage={(p) => { setPage(p); setSbOpen(false); }} sbOpen={sbOpen}
          onCP={() => setShowCP(true)} onCD={() => setShowCD(true)} badges={badges} {...props} />

        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <ErrorBoundary resetKey={page}>
              <Suspense fallback={<PageFallback darkMode={darkMode} />}>
                {role === 'patient' && <PatientPages page={page} setPage={setPage} setShowQR={setShowQR} pills={pills} setPills={setPills} setShowVid={setShowVid}
                  onBadgesChange={(nextBadges) => setBadges((current) => ({ ...current, ...nextBadges }))}
                  onProfileSaved={(profile) => {
                    const updated = { ...user, name: `${profile.firstName} ${profile.lastName}`, avatar: `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() };
                    setUser(updated);
                    localStorage.setItem('nova_user', JSON.stringify(updated));
                  }} {...props} />}
                {role === 'doctor' && <DoctorPages page={page} setPage={setPage} onRx={() => setShowRx(true)} onCons={() => setShowCons(true)} onCP={() => setShowCP(true)} patientCreatedTick={patientCreatedTick} setShowVid={setShowVid} {...props} />}
                {role === 'pharmacist' && <PharmacyPages page={page} setPage={setPage} {...props} />}
                {role === 'admin' && <AdminPages page={page} onCP={() => setShowCP(true)} onCD={() => setShowCD(true)} {...props} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
      {showAya && <AyaChat onClose={() => setShowAya(false)} />}
      {showRx && <RxModal onClose={() => setShowRx(false)} {...props} />}
      {showCons && <ConsModal onClose={() => setShowCons(false)} {...props} />}
      {showCP && <CreatePatientModal onClose={() => setShowCP(false)} onCreated={() => setPatientCreatedTick(t => t + 1)} role={role} {...props} />}
      {showCD && <CreateDoctorModal onClose={() => setShowCD(false)} {...props} />}
      {showVid && <VideoModal onClose={() => setShowVid(false)} />}

      {role === 'patient' && !showAya && (
        <button onClick={() => setShowAya(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-2xl shadow-red-600/40 flex items-center justify-center text-white hover:scale-110 z-30">
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}
    </div>
  );
}
