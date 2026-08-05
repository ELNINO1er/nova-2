import { request, toQuery } from './client.js';

export const doctorApi = {
  dashboard:    ()        => request('/doctor/me/dashboard'),
  assistant:    (question, context = {}) => request('/doctor/me/assistant', {
    method: 'POST',
    body: JSON.stringify({ question, ...context }),
  }),
  patients:     (params = {}) => request(`/doctor/me/patients${toQuery(params)}`),
  patient:      (id)      => request(`/doctor/me/patients/${id}`),
  appointments: (params = {}) => request(`/doctor/me/appointments${toQuery(params)}`),
  updateAppointment: (id, payload) => request(`/doctor/me/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  consultations: ()       => request('/doctor/me/consultations'),
  createConsultation: (payload) => request('/doctor/me/consultations', { method: 'POST', body: JSON.stringify(payload) }),
  updateConsultation: (id, payload) => request(`/doctor/me/consultations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  stats:        ()        => request('/doctor/me/stats'),
  profile:      ()        => request('/doctor/me/profile'),
  prescriptions:       ()        => request('/doctor/me/prescriptions'),
  prescription:        (id)      => request(`/doctor/me/prescriptions/${id}`),
  createPrescription:  (payload) => request('/doctor/me/prescriptions', { method: 'POST', body: JSON.stringify(payload) }),
  labRequests:         ()        => request('/doctor/me/lab-requests'),
  createLabRequest:    (payload) => request('/doctor/me/lab-requests', { method: 'POST', body: JSON.stringify(payload) }),
  chronicPatients:     ()        => request('/doctor/me/chronic-patients'),
  alerts:              ()        => request('/doctor/me/alerts'),
  createAlert:         (payload) => request('/doctor/me/alerts', { method: 'POST', body: JSON.stringify(payload) }),
  resolveAlert:        (id)      => request(`/doctor/me/alerts/${id}/resolve`, { method: 'PATCH' }),
  finances:            ()        => request('/doctor/me/finances'),
  payments:            ()        => request('/doctor/me/payments'),
  markPaymentPaid:     (id, reference) => request(`/doctor/me/payments/${id}/paid`, { method: 'PATCH', body: JSON.stringify({ reference }) }),
  reputation:          ()        => request('/doctor/me/reputation'),
  signature:           ()        => request('/doctor/me/signature'),
  saveSignature:       (payload) => request('/doctor/me/signature', { method: 'POST', body: JSON.stringify(payload) }),
  // Création patient
  createPatient:       (payload) => request('/doctor/me/patients', { method: 'POST', body: JSON.stringify(payload) }),
  // Consentement
  requestConsent:      (patientId, scope) => request(`/doctor/me/consents/${patientId}/request`, { method: 'POST', body: JSON.stringify({ scope }) }),
  // Statut délivrance
  prescriptionDispenseStatus: (id) => request(`/doctor/me/prescriptions/${id}/dispense-status`),
  // Templates consultation
  consultationTemplates: () => request('/doctor/me/consultation-templates'),
  createConsultationTemplate: (payload) => request('/doctor/me/consultation-templates', { method: 'POST', body: JSON.stringify(payload) }),
  deleteConsultationTemplate: (id) => request(`/doctor/me/consultation-templates/${id}`, { method: 'DELETE' }),
  // Templates ordonnance
  prescriptionTemplates: () => request('/doctor/me/prescription-templates'),
  createPrescriptionTemplate: (payload) => request('/doctor/me/prescription-templates', { method: 'POST', body: JSON.stringify(payload) }),
  deletePrescriptionTemplate: (id) => request(`/doctor/me/prescription-templates/${id}`, { method: 'DELETE' }),
  // Transferts
  referrals: () => request('/doctor/me/referrals'),
  createReferral: (payload) => request('/doctor/me/referrals', { method: 'POST', body: JSON.stringify(payload) }),
  acceptReferral: (id) => request(`/doctor/me/referrals/${id}/accept`, { method: 'POST' }),
  declineReferral: (id) => request(`/doctor/me/referrals/${id}/decline`, { method: 'POST' }),
  // Vitals par médecin
  addPatientVital: (patientId, payload) => request(`/doctor/me/patients/${patientId}/vitals`, { method: 'POST', body: JSON.stringify(payload) }),
  // Notifications
  notifications: () => request('/doctor/me/notifications'),
  markNotificationRead: (id) => request(`/doctor/me/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/doctor/me/notifications/read-all', { method: 'PATCH' }),
  // Messages
  conversations: () => request('/doctor/me/conversations'),
  conversation: (id) => request(`/doctor/me/conversations/${id}`),
  sendMessage: (id, payload) => request(`/doctor/me/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
  markConversationRead: (id) => request(`/doctor/me/conversations/${id}/read`, { method: 'PATCH' }),
  // Documents
  documents: () => request('/doctor/me/documents'),
  deleteDocument: (id) => request(`/doctor/me/documents/${id}`, { method: 'DELETE' }),
  uploadDocument: async (formData) => {
    const API = import.meta.env.VITE_API_BASE_URL || '/api';
    const r = await fetch(`${API}/doctor/me/documents`, {
      method: 'POST', body: formData, credentials: 'include',
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `Upload failed: ${r.status}`); }
    return r.json();
  },
  // Settings
  settings: () => request('/doctor/me/settings'),
  updateSettings: (payload) => request('/doctor/me/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
};
