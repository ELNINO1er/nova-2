import { request, toQuery } from './client.js';

export const adminApi = {
  dashboard: () => request('/admin/me/dashboard'),
  users: (params = {}) => request(`/admin/me/users${toQuery(params)}`),
  auditLogs: (params = {}) => request(`/admin/me/audit-logs${toQuery(params)}`),
  accessLogs: (params = {}) => request(`/admin/me/access-logs${toQuery(params)}`),
  system: () => request('/admin/me/system'),
  setDoctorStatus: (id, isAvailable) =>
    request(`/admin/me/doctors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    }),
  setPharmacyStatus: (id, isOpen) =>
    request(`/admin/me/pharmacies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isOpen }),
    }),
};
