import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { pool } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is required. Set it in .env');

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '-refresh-development-only');

/* ── Token blacklist (in-memory, swap for Redis in production) ── */
const blacklistedTokens = new Set();

export function blacklistToken(token) {
  blacklistedTokens.add(token);
  // Auto-cleanup after 7 days
  setTimeout(() => blacklistedTokens.delete(token), 7 * 24 * 60 * 60 * 1000);
}

export function isBlacklisted(token) {
  return blacklistedTokens.has(token);
}

/* ── Token helpers ──────────────────────────────────────────────── */

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d' });
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function verifyRefreshToken(token) {
  if (isBlacklisted(token)) return null;
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    if (payload.type !== 'refresh') return null;
    const [[revoked]] = await pool.execute(
      'SELECT token_hash FROM nova_revoked_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
      [tokenHash(token)]
    );
    if (revoked) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(token) {
  if (!token) return;
  blacklistToken(token);
  const decoded = jwt.decode(token);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.execute('INSERT IGNORE INTO nova_revoked_tokens (token_hash, expires_at) VALUES (?, ?)', [tokenHash(token), expiresAt]);
}

/* ── Core verify ────────────────────────────────────────────────── */

function verifyToken(req, res) {
  const header = req.headers.authorization;
  const cookieToken = getCookie(req, 'nova_access_token');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'Token manquant.' });
    return null;
  }
  if (isBlacklisted(token)) {
    res.status(401).json({ error: 'token_revoked', message: 'Token révoqué. Reconnectez-vous.' });
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.token = token; // Store for potential blacklisting on logout
    return payload;
  } catch {
    res.status(401).json({ error: 'invalid_token', message: 'Token invalide ou expiré.' });
    return null;
  }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

/* ── Role-based middlewares ─────────────────────────────────────── */

export function requirePatient(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'patient') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux patients.' });
  }
  req.user = { id: payload.id, role: payload.role, patientId: payload.patientId };
  next();
}

export function requireDoctor(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'doctor') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux médecins.' });
  }
  req.user = { id: payload.id, role: payload.role, doctorId: payload.doctorId };
  next();
}

export function requirePharmacist(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'pharmacist') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux pharmaciens.' });
  }
  req.user = { id: payload.id, role: payload.role, pharmacyId: payload.pharmacyId };
  next();
}

export function requireAdmin(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux administrateurs.' });
  }
  req.user = { id: payload.id, role: payload.role };
  next();
}

/**
 * Generic auth middleware — accepts any authenticated user.
 */
export function requireAuth(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  req.user = {
    id: payload.id,
    role: payload.role,
    patientId: payload.patientId || null,
    doctorId: payload.doctorId || null,
    pharmacyId: payload.pharmacyId || null,
  };
  next();
}

/**
 * Permission-based middleware — checks if user's role has the required permission.
 * Usage: requirePermission('doctor.prescriptions')
 */
export function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const payload = verifyToken(req, res);
    if (!payload) return;

    req.user = {
      id: payload.id,
      role: payload.role,
      patientId: payload.patientId || null,
      doctorId: payload.doctorId || null,
      pharmacyId: payload.pharmacyId || null,
    };

    try {
      const [[perm]] = await pool.execute(
        `SELECT rp.role_id FROM nova_role_permissions rp
         JOIN nova_roles r ON r.id = rp.role_id
         JOIN nova_permissions p ON p.id = rp.permission_id
         WHERE r.name = ? AND p.code = ?
         LIMIT 1`,
        [payload.role, permissionCode]
      );

      if (!perm) {
        return res.status(403).json({
          error: 'forbidden',
          message: `Permission requise : ${permissionCode}`,
        });
      }

      next();
    } catch {
      return res.status(500).json({ error: 'server_error', message: 'Erreur vérification permissions.' });
    }
  };
}
