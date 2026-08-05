import React, { useState } from 'react';
import { MapPin, Phone, Clock, Star, Search, Pill, Check, ShoppingCart, ClipboardList, Siren } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';

export default function PPharmacy({ data, card, sub, border, darkMode, notify }) {
  const [search, setSearch] = useState('');
  const [selectedPh, setSelectedPh] = useState(null);
  const [orders, setOrders] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [tab, setTab] = useState('list'); // 'list' | 'orders'

  const pharmacies = data || [];

  const filtered = pharmacies.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  const loadOrders = async () => {
    try {
      const o = await patientApi.pharmacyOrders();
      setOrders(o);
    } catch { setOrders([]); }
  };

  const handleTabOrders = () => {
    setTab('orders');
    if (!orders) loadOrders();
  };

  const submitOrder = async (pharmacyId) => {
    setOrderLoading(true);
    try {
      await patientApi.createPharmacyOrder({ pharmacyId });
      notify('Commande envoyée à la pharmacie !');
      setShowOrderModal(false);
      setSelectedPh(null);
      loadOrders();
    } catch (e) {
      notify(e.message || 'Erreur lors de la commande', 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  const statusColors = {
    pending:   'bg-amber-100 text-amber-700',
    ready:     'bg-emerald-100 text-emerald-700',
    delivered: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const statusLabels = {
    pending:   'En préparation',
    ready:     'Prêt à récupérer',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Pharmacie Connectée</h2>
        <p className={`text-sm ${sub}`}>Trouvez une pharmacie et commandez vos médicaments</p>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {[{ id: 'list', label: 'Pharmacies', icon: MapPin }, { id: 'orders', label: 'Mes commandes', icon: ClipboardList }].map(t => (
          <button key={t.id} onClick={() => t.id === 'orders' ? handleTabOrders() : setTab('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-red-600 ' + (darkMode ? 'bg-slate-700 shadow-slate-900' : '') : sub}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          {/* Recherche */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Search className={`w-4 h-4 ${sub} flex-shrink-0`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une pharmacie..."
              className={`flex-1 bg-transparent outline-none text-sm`} />
            {search && <button onClick={() => setSearch('')}><X className={`w-4 h-4 ${sub}`} /></button>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{filtered.filter(p => p.isOpen).length}</p>
              <p className="text-[11px]">Ouvertes</p>
            </div>
            <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{filtered.filter(p => p.isDuty).length}</p>
              <p className="text-[11px]">De garde</p>
            </div>
            <div className={`${card} border rounded-xl p-4 text-center`}>
              <p className="text-2xl font-black">{filtered.length}</p>
              <p className={`text-[11px] ${sub}`}>Total</p>
            </div>
          </div>

          {/* Liste */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className={`${card} border rounded-2xl p-8 flex flex-col items-center gap-2`}>
                <MapPin className={`w-8 h-8 ${sub}`} />
                <p className={`text-sm ${sub}`}>Aucune pharmacie trouvée</p>
              </div>
            )}
            {filtered.map(ph => (
              <div key={ph.id} className={`${card} border rounded-2xl p-4 flex items-start gap-4`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ph.isDuty ? 'bg-red-100' : ph.isOpen ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {ph.isDuty ? <Siren className="w-6 h-6 text-red-600" /> : <MapPin className={`w-6 h-6 ${ph.isOpen ? 'text-emerald-600' : sub}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold">{ph.name}</p>
                    {ph.isDuty && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 animate-pulse">GARDE</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ph.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ph.isOpen ? `Ouvert · ${ph.opensAt}–${ph.closesAt}` : 'Fermé'}
                    </span>
                  </div>
                  <p className={`text-xs ${sub}`}>{ph.address}</p>
                  <p className={`text-xs ${sub}`}>{ph.city} · {ph.distanceKm} km</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <a href={`tel:${ph.phone}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                      <Phone className="w-3 h-3" />{ph.phone}
                    </a>
                    <button onClick={() => { setSelectedPh(ph); setShowOrderModal(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">
                      <Pill className="w-3 h-3" /> Commander
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {!orders ? (
            <div className={`${card} border rounded-2xl p-6`}>
              <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-32 rounded-lg`} />
            </div>
          ) : orders.length === 0 ? (
            <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2 text-center`}>
              <ClipboardList className={`w-10 h-10 ${sub}`} />
              <p className={`text-sm ${sub}`}>Aucune commande</p>
              <button onClick={() => setTab('list')} className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">
                Trouver une pharmacie
              </button>
            </div>
          ) : orders.map(o => (
            <div key={o.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Pill className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{o.pharmacyName}</p>
                <p className={`text-xs ${sub}`}>{o.pharmacyAddress}</p>
                <p className={`text-xs ${sub}`}>{new Date(o.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusColors[o.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusLabels[o.status] || o.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal commande */}
      {showOrderModal && selectedPh && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowOrderModal(false)}>
          <div className={`${card} border rounded-2xl p-6 w-full max-w-md shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Commander</h3>
              <button onClick={() => setShowOrderModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className="font-semibold">{selectedPh.name}</p>
              <p className={`text-xs ${sub}`}>{selectedPh.address}</p>
              <p className={`text-xs ${sub}`}>{selectedPh.distanceKm} km · {selectedPh.phone}</p>
            </div>
            <p className={`text-xs ${sub} mb-4`}>La pharmacie recevra votre demande et préparera vos médicaments. Vous serez notifié quand la commande sera prête.</p>
            <button onClick={() => submitOrder(selectedPh.id)} disabled={orderLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {orderLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</> : <><Pill className="w-4 h-4" /> Confirmer la commande</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

