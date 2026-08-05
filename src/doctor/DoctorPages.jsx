import React, { useState, useEffect } from 'react';
import { UserPlus, Plus } from 'lucide-react';
import { doctorApi } from '../api/doctorApi.js';

import DDash from './pages/DDash.jsx';
import DPatients from './pages/DPatients.jsx';
import DAgenda from './pages/DAgenda.jsx';
import DCons from './pages/DCons.jsx';
import DStats from './pages/DStats.jsx';
import DProfile from './pages/DProfile.jsx';
import DPrescriptions from './pages/DPrescriptions.jsx';
import DLabRequests from './pages/DLabRequests.jsx';
import DSuiviChroniques from './pages/DSuiviChroniques.jsx';
import DUrgences from './pages/DUrgences.jsx';
import DAssistantIA from './pages/DAssistantIA.jsx';
import DFinances from './pages/DFinances.jsx';
import DReputation from './pages/DReputation.jsx';
import DSignature from './pages/DSignature.jsx';
import PMsg from '../patient/pages/PMsg.jsx';
import PDocs from '../patient/pages/PDocs.jsx';
import SettingsPage from '../patient/pages/SettingsPage.jsx';

export default function DoctorPages({ page, setPage, onRx, onCP, patientCreatedTick, setShowVid, card, sub, border, darkMode }) {
  const [apiData,    setApiData]    = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [notice,     setNotice]     = useState(null);

  const notify = (message, type = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadPage = (pageKey, force = false) => {
    const loaders = {
      dashboard:      doctorApi.dashboard,
      patients:       doctorApi.patients,
      agenda:         doctorApi.appointments,
      consultations:  doctorApi.consultations,
      stats:          doctorApi.stats,
      profile:        doctorApi.profile,
      prescriptions:      doctorApi.prescriptions,
      'lab-requests':     doctorApi.labRequests,
      'chronic-patients': doctorApi.chronicPatients,
      alerts:             doctorApi.alerts,
      finances:           doctorApi.finances,
      reputation:         doctorApi.reputation,
      signature:          doctorApi.signature,
      messages:           doctorApi.conversations,
      documents:          doctorApi.documents,
      settings:           doctorApi.settings,
      notifications:      doctorApi.notifications,
    };
    const load = loaders[pageKey];
    if (!load || (!force && apiData[pageKey])) return;
    setApiLoading(c => ({ ...c, [pageKey]: true }));
    load()
      .then(data => setApiData(c => ({ ...c, [pageKey]: data })))
      .catch(err  => notify(err.message, 'error'))
      .finally(() => setApiLoading(c => ({ ...c, [pageKey]: false })));
  };

  useEffect(() => { loadPage(page); }, [page]);

  useEffect(() => {
    if (!patientCreatedTick) return;
    loadPage('patients', true);
    loadPage('dashboard', true);
    if (page === 'chronic-patients') loadPage('chronic-patients', true);
  }, [patientCreatedTick]);

  const p = { card, sub, border, darkMode, notify, setPage, setShowVid };

  const doctorName = apiData.dashboard?.doctor
    ? `Dr. ${apiData.dashboard.doctor.firstName} ${apiData.dashboard.doctor.lastName}`
    : 'Dr. Aïcha Touré';
  const doctorSpec = apiData.dashboard?.doctor?.specialty || 'Cardiologie';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Cockpit Clinique</h2>
          <p className={`text-sm ${sub}`}>{doctorName} • {doctorSpec}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onCP}
            className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2`}>
            <UserPlus className="w-4 h-4" /> Nouveau patient
          </button>
          <button onClick={() => setPage('consultations')}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-700 shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" /> Nouvelle consultation
          </button>
        </div>
      </div>

      {/* Toast */}
      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl transition-all
          ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.message}
        </div>
      )}

      {page === 'dashboard'     && <DDash     data={apiData.dashboard}     loading={apiLoading.dashboard}     {...p} />}
      {page === 'patients'      && <DPatients data={apiData.patients}      loading={apiLoading.patients}      onReload={() => loadPage('patients', true)} {...p} />}
      {page === 'agenda'        && <DAgenda   data={apiData.agenda}        loading={apiLoading.agenda}        onReload={() => loadPage('agenda', true)}   {...p} />}
      {page === 'consultations' && <DCons     data={apiData.consultations} loading={apiLoading.consultations} onReload={() => loadPage('consultations', true)} patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'stats'         && <DStats    data={apiData.stats}         loading={apiLoading.stats}         {...p} />}
      {page === 'messages'      && <PMsg data={apiData.messages} onConversationsChange={(v) => setApiData(c => ({...c, messages: v}))} setShowVid={setShowVid} api={doctorApi} {...p} />}
      {page === 'documents'     && <PDocs data={apiData.documents} onReload={() => loadPage('documents', true)} notify={notify} api={doctorApi} {...p} />}
      {page === 'profile'       && <DProfile      data={apiData.profile}           loading={apiLoading.profile}           {...p} />}
      {page === 'prescriptions' && <DPrescriptions data={apiData.prescriptions}    loading={apiLoading.prescriptions}    onReload={() => loadPage('prescriptions', true)} patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'lab-requests'       && <DLabRequests     data={apiData['lab-requests']}       loading={apiLoading['lab-requests']}      onReload={() => loadPage('lab-requests', true)}      patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'chronic-patients'   && <DSuiviChroniques data={apiData['chronic-patients']}    loading={apiLoading['chronic-patients']}  onReload={() => loadPage('chronic-patients', true)} {...p} />}
      {page === 'urgences'           && <DUrgences        data={apiData.alerts}                 loading={apiLoading.alerts}               onReload={() => loadPage('alerts', true)}           patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'assistant-ia'       && <DAssistantIA     chronicData={apiData['chronic-patients']} consultData={apiData.consultations} statsData={apiData.stats} loadChronic={() => loadPage('chronic-patients')} loadConsult={() => loadPage('consultations')} loadStats={() => loadPage('stats')} {...p} />}
      {page === 'finances'    && <DFinances   data={apiData.finances}   loading={apiLoading.finances}   {...p} />}
      {page === 'reputation'  && <DReputation data={apiData.reputation} loading={apiLoading.reputation} {...p} />}
      {page === 'signature'   && <DSignature  data={apiData.signature}  loading={apiLoading.signature}  onSave={() => loadPage('signature', true)} {...p} />}
      {page === 'settings'    && <SettingsPage data={apiData.settings} api={doctorApi} {...p} />}
    </div>
  );
}
