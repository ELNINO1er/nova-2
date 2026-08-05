import { Router } from 'express';
import { z } from 'zod';
import { phoneExists, sendOtp, startDoctorPasswordLogin, verifyOtp, verifyOtpById } from '../services/auth.service.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  blacklistToken, revokeRefreshToken, requireAuth,
} from '../middleware/auth.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

function setAuthCookies(res, token, refreshToken) {
  res.cookie('nova_access_token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
  res.cookie('nova_refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res) {
  res.clearCookie('nova_access_token', cookieOptions);
  res.clearCookie('nova_refresh_token', cookieOptions);
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

/* ── POST /api/auth/check — vérifie si le numéro existe ─────── */
router.post('/check', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    const exists = await phoneExists(phone);
    if (!exists) return res.status(404).json({ error: 'not_found', message: 'Numéro non reconnu.' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/otp/send — envoyer un OTP ──────────────── */
router.post('/otp/send', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    const result = await sendOtp(phone);
    if (!result) return res.status(404).json({ error: 'not_found', message: 'Numéro non reconnu.' });
    res.json(result);
  } catch (err) { next(err); }
});

/* ── POST /api/auth/otp/verify — vérifier OTP → tokens ─────── */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, code } = z.object({
      phone: z.string().min(8),
      code:  z.string().length(4),
    }).parse(req.body);

    const result = await verifyOtp(phone, code);
    if (result.error) {
      const status = result.error === 'otp_max_attempts' ? 429
        : result.error === 'otp_expired' ? 410 : 401;
      return res.status(status).json({ error: result.error, message: result.message });
    }

    const { user } = result;
    const tokenPayload = { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    setAuthCookies(res, token, refreshToken);

    res.json({ user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null } });
  } catch (err) { next(err); }
});

/* POST /api/auth/doctor/password/start - email + mot de passe puis OTP */
router.post('/doctor/password/start', async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(4),
    }).parse(req.body);

    const result = await startDoctorPasswordLogin(email, password);
    if (result.error) {
      return res.status(result.error === 'invalid_credentials' ? 401 : 400).json({
        error: result.error,
        message: result.message,
      });
    }

    res.json(result);
  } catch (err) { next(err); }
});

/* POST /api/auth/doctor/otp/verify - OTP par challenge, reserve medecin */
router.post('/doctor/otp/verify', async (req, res, next) => {
  try {
    const { otpId, code } = z.object({
      otpId: z.string().uuid(),
      code: z.string().length(4),
    }).parse(req.body);

    const result = await verifyOtpById(otpId, code, 'doctor');
    if (result.error) {
      const status = result.error === 'otp_max_attempts' ? 429
        : result.error === 'otp_expired' ? 410
          : result.error === 'forbidden' ? 403 : 401;
      return res.status(status).json({ error: result.error, message: result.message });
    }

    const { user } = result;
    const tokenPayload = { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    setAuthCookies(res, token, refreshToken);

    res.json({ user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null } });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/login — legacy (rétrocompatible) ────────── */
/* ── POST /api/auth/refresh — renouveler access token ───────── */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = getCookie(req, 'nova_refresh_token');
    if (!refreshToken) {
      return res.status(401).json({ error: 'invalid_refresh', message: 'Refresh token manquant.' });
    }
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'invalid_refresh', message: 'Refresh token invalide ou expiré.' });
    }

    // Blacklist the old refresh token (rotation)
    await revokeRefreshToken(refreshToken);

    const tokenPayload = { id: payload.id, role: payload.role, patientId: payload.patientId, doctorId: payload.doctorId, pharmacyId: payload.pharmacyId || null };
    const newToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    setAuthCookies(res, newToken, newRefreshToken);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/logout — invalider le token ─────────────── */
router.post('/logout', requireAuth, async (req, res) => {
  if (req.token) blacklistToken(req.token);
  const refreshToken = getCookie(req, 'nova_refresh_token');
  if (refreshToken) await revokeRefreshToken(refreshToken);
  clearAuthCookies(res);
  res.json({ ok: true, message: 'Déconnecté.' });
});

/* ── GET /api/auth/me — profil + permissions ────────────────── */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { pool } = await import('../db/database.js');
    const [permissions] = await pool.execute(
      `SELECT p.code FROM nova_permissions p
       JOIN nova_role_permissions rp ON rp.permission_id = p.id
       JOIN nova_roles r ON r.id = rp.role_id
       WHERE r.name = ?`,
      [req.user.role]
    );

    res.json({
      id: req.user.id,
      role: req.user.role,
      patientId: req.user.patientId,
      doctorId: req.user.doctorId,
      pharmacyId: req.user.pharmacyId,
      permissions: permissions.map(p => p.code),
    });
  } catch (err) { next(err); }
});

export default router;
