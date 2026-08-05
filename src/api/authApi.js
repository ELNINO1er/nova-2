import { request } from './client.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function authRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
  return data;
}

export const authApi = {
  check: (phone) => authRequest('/auth/check', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.replace(/\s/g, '') }),
  }),

  sendOtp: (phone) => authRequest('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.replace(/\s/g, '') }),
  }),

  verifyOtp: (phone, code) => authRequest('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.replace(/\s/g, ''), code }),
  }),

  startDoctorPasswordLogin: (email, password) => authRequest('/auth/doctor/password/start', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  verifyDoctorOtp: (otpId, code) => authRequest('/auth/doctor/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ otpId, code }),
  }),

  me: () => {
    return authRequest('/auth/me');
  },

  logout: async () => {
    await authRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('nova_user');
  },

};
