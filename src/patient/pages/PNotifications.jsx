import React from 'react';
import { Bell, Check, Calendar, Pill, Microscope, MessageCircle, AlertTriangle, Syringe } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatRelativeDate } from '../../utils/format.js';

export default function PNotifications({ data, onReload, notify, setPage, card, sub, border, darkMode }) {
  const notifs = Array.isArray(data) ? data : (data?.data || []);
  const unread = notifs.filter(n => !n.isRead).length;

  const typeIcon = {
    appointment: { icon: Calendar,    color: 'text-blue-600',    bg: darkMode ? 'bg-blue-900/30' : 'bg-blue-50' },
    medication:  { icon: Pill,        color: 'text-red-600',     bg: darkMode ? 'bg-red-900/30'  : 'bg-red-50'  },
    vaccine:     { icon: Syringe,     color: 'text-emerald-600', bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50' },
    message:     { icon: MessageCircle, color: 'text-purple-600',bg: darkMode ? 'bg-purple-900/30' : 'bg-purple-50' },
    result:      { icon: Microscope,  color: 'text-orange-600',  bg: darkMode ? 'bg-orange-900/30' : 'bg-orange-50' },
    system:      { icon: Bell,        color: 'text-slate-600',   bg: darkMode ? 'bg-slate-800'     : 'bg-slate-50'  },
  };

  const markRead = async (id) => {
    try {
      await patientApi.markNotificationRead(id);
      onReload?.(await patientApi.notifications());
    } catch {}
  };

  const markAll = async () => {
    try {
      await patientApi.markAllNotificationsRead();
      onReload?.(await patientApi.notifications());
      notify?.('Toutes les notifications sont lues');
    } catch {}
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Notifications</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-16 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className={`text-sm ${sub}`}>{unread} non lue{unread > 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className={`text-xs font-semibold ${sub} hover:text-red-600`}>Tout marquer comme lu</button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <Bell className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune notification</p>
          <p className={`text-xs ${sub} mt-1`}>Vous êtes à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const t = typeIcon[n.type] || typeIcon.system;
            const Icon = t.icon;
            return (
              <div key={n.id} onClick={() => { markRead(n.id); if (n.linkPage) setPage?.(n.linkPage); }}
                className={`${card} border rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-all ${!n.isRead ? (darkMode ? 'ring-1 ring-slate-600' : 'ring-1 ring-red-200 shadow-sm') : 'opacity-70'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.bg}`}>
                  <Icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${!n.isRead ? '' : sub}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  {n.body && <p className={`text-xs ${sub} mt-0.5 line-clamp-2`}>{n.body}</p>}
                  <p className={`text-[10px] ${sub} mt-1`}>{formatRelativeDate(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ SOS URGENCE ============ */
