import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Phone, Video, Search, ChevronLeft, Paperclip, MoreVertical, Clock } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatRelativeDate, initials } from '../../utils/format.js';

export default function PMsg({ data, onConversationsChange, card, sub, border, darkMode, setShowVid, api: apiOverride }) {
  const api = apiOverride || patientApi;
  const [convList, setConvList]     = useState(data || []);
  const [selId, setSelId]           = useState(null);
  const [convData, setConvData]     = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const [msgText, setMsgText]       = useState('');
  const [sending, setSending]       = useState(false);
  const [showList, setShowList]     = useState(true); // mobile toggle
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (data) setConvList(data); }, [data]);

  // auto-scroll when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convData?.messages?.length]);

  // auto-open first conversation on load
  useEffect(() => {
    if (convList.length > 0 && !selId) openConversation(convList[0].id);
  }, [convList]);

  const openConversation = async (id) => {
    if (id === selId && convData) return;
    setSelId(id);
    setConvData(null);
    setConvLoading(true);
    setShowList(false);
    try {
      const full = await api.conversation(id);
      setConvData(full);
      await api.markConversationRead(id);
      setConvList(prev => {
        const next = prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c);
        onConversationsChange?.(next);
        return next;
      });
    } catch { /* ignore */ }
    finally { setConvLoading(false); }
  };

  const sendMessage = async () => {
    const body = msgText.trim();
    if (!body || !selId || sending) return;
    setSending(true);
    setMsgText('');
    try {
      const msg = await api.sendMessage(selId, { body });
      setConvData(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }));
      setConvList(prev => {
        const next = prev.map(c =>
          c.id === selId ? { ...c, lastMessage: body, updatedAt: msg.createdAt } : c
        );
        onConversationsChange?.(next);
        return next;
      });
    } catch { setMsgText(body); }
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatMsgTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatMsgDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Messages</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-96 rounded-lg`}></div>
      </div>
    </div>
  );

  const activeConv = convList.find(c => c.id === selId);

  /* ── group messages by day ── */
  const groupedMessages = (() => {
    if (!convData?.messages?.length) return [];
    const groups = [];
    let lastDate = null;
    for (const msg of convData.messages) {
      const day = new Date(msg.createdAt).toDateString();
      if (day !== lastDate) { groups.push({ type: 'date', label: formatMsgDate(msg.createdAt) }); lastDate = day; }
      groups.push({ type: 'msg', msg });
    }
    return groups;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Messages</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} ${sub}`}>
          {convList.reduce((s, c) => s + c.unreadCount, 0)} non lu{convList.reduce((s, c) => s + c.unreadCount, 0) > 1 ? 's' : ''}
        </span>
      </div>

      {convList.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <MessageCircle className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune conversation</p>
          <p className={`text-xs ${sub} mt-1`}>Vos échanges avec les médecins apparaîtront ici.</p>
        </div>
      ) : (
        <div className={`${card} border rounded-2xl overflow-hidden flex`} style={{ height: '72vh', minHeight: 500 }}>

          {/* ── Liste conversations ── */}
          <div className={`${showList ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-72 shrink-0 border-r ${border}`}>
            <div className={`p-3 border-b ${border} flex items-center gap-2`}>
              <MessageCircle className="w-4 h-4 text-red-600" />
              <span className="font-bold text-sm">Conversations</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convList.map(c => {
                const unread = c.unreadCount > 0;
                const active = c.id === selId;
                return (
                  <button key={c.id} onClick={() => openConversation(c.id)}
                    className={`w-full p-3 border-b ${border} flex items-start gap-3 text-left transition-colors
                      ${active ? (darkMode ? 'bg-red-900/30 border-l-2 border-l-red-500' : 'bg-red-50 border-l-2 border-l-red-500')
                               : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`}>
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">
                        {initials(c.doctorName)}
                      </div>
                      {unread && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">{c.unreadCount}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{c.doctorName}</p>
                        <p className={`text-[10px] shrink-0 ${sub}`}>{formatRelativeDate(c.updatedAt)}</p>
                      </div>
                      {c.doctorSpecialty && <p className={`text-[11px] ${sub} mb-0.5`}>{c.doctorSpecialty}</p>}
                      <p className={`text-xs truncate ${unread ? (darkMode ? 'text-slate-200' : 'text-slate-700') : sub}`}>{c.lastMessage}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panneau chat ── */}
          <div className={`${showList ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0`}>
            {activeConv ? (
              <>
                {/* Header */}
                <div className={`p-3 border-b ${border} flex items-center gap-3`}>
                  <button className={`md:hidden p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                    onClick={() => setShowList(true)}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials(activeConv.doctorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{activeConv.doctorName}</p>
                    {activeConv.doctorSpecialty && <p className={`text-xs ${sub}`}>{activeConv.doctorSpecialty}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Appel audio">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button onClick={() => setShowVid?.(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Vidéo">
                      <Video className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-1 ${darkMode ? 'bg-slate-950' : 'bg-slate-50/60'}`}>
                  {convLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
                    </div>
                  ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className={`w-10 h-10 ${sub} mb-2`} />
                      <p className={`text-sm ${sub}`}>Démarrez la conversation</p>
                    </div>
                  ) : (
                    groupedMessages.map((item, idx) => {
                      if (item.type === 'date') return (
                        <div key={`date-${idx}`} className="flex items-center gap-3 py-2">
                          <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                          <span className={`text-[10px] font-semibold capitalize ${sub}`}>{item.label}</span>
                          <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        </div>
                      );
                      const { msg } = item;
                      const isPatient = msg.senderRole === 'patient';
                      return (
                        <div key={msg.id} className={`flex ${isPatient ? 'justify-end' : 'justify-start'} mb-1`}>
                          {!isPatient && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mr-2 mt-1">
                              {initials(activeConv.doctorName)}
                            </div>
                          )}
                          <div className={`max-w-[72%] group`}>
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                              ${isPatient
                                ? 'bg-red-600 text-white rounded-tr-sm'
                                : (darkMode ? 'bg-slate-800 text-slate-100 rounded-tl-sm' : 'bg-white text-slate-800 shadow-sm rounded-tl-sm border border-slate-100')
                              }`}>
                              {msg.body}
                            </div>
                            <p className={`text-[10px] mt-0.5 ${sub} ${isPatient ? 'text-right' : 'text-left'}`}>
                              {formatMsgTime(msg.createdAt)}
                              {isPatient && msg.isRead && <span className="ml-1 text-blue-400">✓✓</span>}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className={`p-3 border-t ${border}`}>
                  <div className={`flex items-end gap-2 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-3 py-2`}>
                    <button className={`p-1 rounded-lg ${sub} hover:text-red-600 shrink-0 mb-0.5`} title="Joindre un fichier">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                      ref={inputRef}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Écrire un message… (Entrée pour envoyer)"
                      rows={1}
                      className={`flex-1 resize-none bg-transparent text-sm outline-none max-h-28 leading-relaxed ${darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                      style={{ fieldSizing: 'content' }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!msgText.trim() || sending}
                      className="shrink-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-0.5">
                      {sending
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className={`text-[10px] ${sub} text-center mt-1.5`}>Messagerie médicale sécurisée · Nova</p>
                </div>
              </>
            ) : (
              <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                <MessageCircle className={`w-12 h-12 ${sub}`} />
                <p className={`text-sm ${sub}`}>Sélectionnez une conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
