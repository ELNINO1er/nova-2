import { request, getToken, toQuery } from './client.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const patientApi = {
  dashboard: () => request('/patient/me/dashboard'),
  assistant: (question) => request('/patient/me/assistant', {
    method: 'POST',
    body: JSON.stringify({ question }),
  }),
  profile: () => request('/patient/me/profile'),
  updateProfile: (payload) => request('/patient/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  vitals: (params = {}) => request(`/patient/me/vitals${toQuery(params)}`),
  treatments: () => request('/patient/me/treatments'),
  todayMedications: () => request('/patient/me/medications/today'),
  markMedication: (scheduleId, payload = { status: 'taken' }) => request(`/patient/me/medications/${scheduleId}/intakes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  appointments: () => request('/patient/me/appointments'),
  createAppointment: (payload) => request('/patient/me/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateAppointment: (id, payload) => request(`/patient/me/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteAppointment: (id) => request(`/patient/me/appointments/${id}`, { method: 'DELETE' }),
  vaccinations: () => request('/patient/me/vaccinations'),
  history: () => request('/patient/me/history'),
  documents: (params = {}) => request(`/patient/me/documents${toQuery(params)}`),
  createDocument: (payload) => request('/patient/me/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteDocument: (id) => request(`/patient/me/documents/${id}`, { method: 'DELETE' }),
  conversations: () => request('/patient/me/conversations'),
  conversation: (id) => request(`/patient/me/conversations/${id}`),
  sendMessage: (id, payload) => request(`/patient/me/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  markConversationRead: (id) => request(`/patient/me/conversations/${id}/read`, { method: 'PATCH' }),
  notes: () => request('/patient/me/notes'),
  createNote: (payload) => request('/patient/me/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateNote: (id, payload) => request(`/patient/me/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteNote: (id) => request(`/patient/me/notes/${id}`, { method: 'DELETE' }),
  prescriptions: (params = {}) => request(`/patient/me/prescriptions${toQuery(params)}`),
  prescription: (id) => request(`/patient/me/prescriptions/${id}`),
  addVital: (payload) => request('/patient/me/vitals', { method: 'POST', body: JSON.stringify(payload) }),
  emergencyCard: () => request('/patient/me/emergency-card'),
  emergencyCardQr: () => request('/patient/me/emergency-card/qr'),
  wellnessGoals: () => request('/patient/me/wellness-goals'),
  createWellnessGoal: (payload) => request('/patient/me/wellness-goals', { method: 'POST', body: JSON.stringify(payload) }),
  updateWellnessGoal: (id, payload) => request(`/patient/me/wellness-goals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteWellnessGoal: (id) => request(`/patient/me/wellness-goals/${id}`, { method: 'DELETE' }),
  doctors: (params = {}) => request(`/patient/me/doctors${toQuery(params)}`),
  doctor: (id) => request(`/patient/me/doctors/${id}`),
  doctorSlots: (id, params = {}) => request(`/patient/me/doctors/${id}/slots${toQuery(params)}`),
  bookSlot: (doctorId, slotId) => request(`/patient/me/doctors/${doctorId}/slots/${slotId}/book`, { method: 'POST' }),
  notifications: () => request('/patient/me/notifications'),
  markNotificationRead: (id) => request(`/patient/me/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/patient/me/notifications/read-all', { method: 'PATCH' }),
  labResults: (params = {}) => request(`/patient/me/lab-results${toQuery(params)}`),
  labResult: (id) => request(`/patient/me/lab-results/${id}`),
  medicalProfile: () => request('/patient/me/medical-profile'),
  updateMedicalProfile: (payload) => request('/patient/me/medical-profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  uploadDocument: async (formData) => {
    const token = getToken();
    const r = await fetch(`${API_BASE_URL}/patient/me/documents`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `Upload failed: ${r.status}`); }
    return r.json();
  },
  insurance: () => request('/patient/me/insurance'),
  payments: () => request('/patient/me/payments'),
  createPayment: (payload) => request('/patient/me/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  exportPdfUrl: () => `${API_BASE_URL}/patient/me/export/pdf`,
  pharmacies: (params = {}) => request(`/patient/me/pharmacies${toQuery(params)}`),
  pharmacyOrders: () => request('/patient/me/pharmacy-orders'),
  createPharmacyOrder: (payload) => request('/patient/me/pharmacy-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  settings: () => request('/patient/me/settings'),
  updateSettings: (payload) => request('/patient/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  // Consentements
  consents: () => request('/patient/me/consents'),
  grantConsent: (id) => request(`/patient/me/consents/${id}/grant`, { method: 'POST' }),
  revokeConsent: (id) => request(`/patient/me/consents/${id}/revoke`, { method: 'POST' }),
  // Access logs
  accessLogs: () => request('/patient/me/access-logs'),
  // Famille
  familyMembers: () => request('/patient/me/family'),
  createFamilyMember: (payload) => request('/patient/me/family', { method: 'POST', body: JSON.stringify(payload) }),
  updateFamilyMember: (id, payload) => request(`/patient/me/family/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFamilyMember: (id) => request(`/patient/me/family/${id}`, { method: 'DELETE' }),
  // QR ordonnance sécurisé
  prescriptionQR: (id) => request(`/patient/me/prescriptions/${id}/qr`),
};
