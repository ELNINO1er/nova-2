import bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'node:crypto';
import { pool } from '../db/database.js';
import { sendSms } from './sms.provider.js';

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;

/**
 * Send OTP to a phone number.
 * In production, integrate with SMS provider (Twilio / Orange CI).
 * For dev, the OTP is returned in the response.
 */
export async function sendOtp(phone) {
  const cleaned = phone.replace(/\s/g, '');

  // Check if user exists
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE phone = ?', [cleaned]);
  if (!user) return null;

  // Invalidate any previous OTP for this phone
  await pool.execute(
    'UPDATE nova_otp SET verified = 1 WHERE phone = ? AND verified = 0',
    [cleaned]
  );

  // Generate 4-digit OTP
  const code = String(randomInt(1000, 9999));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');

  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_otp (id, phone, code_hash, attempts, max_attempts, expires_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [id, cleaned, codeHash, OTP_MAX_ATTEMPTS, expiresAt]
  );

  await sendSms(cleaned, `Votre code NOVA : ${code}. Il expire dans ${OTP_EXPIRY_MINUTES} minutes.`);

  // In dev mode, return the code (remove in production!)
  const isDev = process.env.NODE_ENV !== 'production';
  return { otpId: id, expiresIn: OTP_EXPIRY_MINUTES * 60, ...(isDev ? { devCode: code } : {}) };
}

/**
 * Verify OTP code and return user if valid.
 */
export async function verifyOtp(phone, code) {
  const cleaned = phone.replace(/\s/g, '');

  // Find latest non-verified, non-expired OTP
  const [[otp]] = await pool.execute(
    `SELECT * FROM nova_otp
     WHERE phone = ? AND verified = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [cleaned]
  );

  if (!otp) {
    return { error: 'otp_expired', message: 'Code expiré ou invalide. Demandez un nouveau code.' };
  }

  if (otp.attempts >= otp.max_attempts) {
    await pool.execute('UPDATE nova_otp SET verified = 1 WHERE id = ?', [otp.id]);
    return { error: 'otp_max_attempts', message: 'Trop de tentatives. Demandez un nouveau code.' };
  }

  const valid = await bcrypt.compare(code, otp.code_hash);

  if (!valid) {
    await pool.execute(
      'UPDATE nova_otp SET attempts = attempts + 1 WHERE id = ?',
      [otp.id]
    );
    const remaining = otp.max_attempts - otp.attempts - 1;
    return {
      error: 'otp_invalid',
      message: `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
    };
  }

  // Mark OTP as verified
  await pool.execute('UPDATE nova_otp SET verified = 1 WHERE id = ?', [otp.id]);

  // Get user
  const [[user]] = await pool.execute('SELECT * FROM nova_users WHERE phone = ?', [cleaned]);
  if (!user) return { error: 'user_not_found', message: 'Utilisateur introuvable.' };

  return {
    user: {
      id: user.id,
      role: user.role,
      patientId: user.patient_id || null,
      doctorId: user.doctor_id || null,
      pharmacyId: user.pharmacy_id || null,
      name: user.name,
      avatar: user.avatar,
    },
  };
}

export async function startDoctorPasswordLogin(email, password) {
  const cleaned = String(email || '').trim().toLowerCase();
  const [[user]] = await pool.execute(
    `SELECT u.*, d.email AS doctor_email
     FROM nova_users u
     JOIN nova_doctors d ON d.id = u.doctor_id
     WHERE u.role = 'doctor' AND LOWER(d.email) = ?
     LIMIT 1`,
    [cleaned]
  );
  if (!user) return { error: 'invalid_credentials', message: 'Identifiants medecin invalides.' };

  const valid = await bcrypt.compare(password, user.password_hash || user.code_hash);
  if (!valid) return { error: 'invalid_credentials', message: 'Identifiants medecin invalides.' };

  const otp = await sendOtp(user.phone);
  if (!otp) return { error: 'otp_unavailable', message: 'Impossible de generer le code OTP.' };
  return {
    otpId: otp.otpId,
    expiresIn: otp.expiresIn,
    maskedPhone: maskPhone(user.phone),
    ...(otp.devCode ? { devCode: otp.devCode } : {}),
  };
}

export async function verifyOtpById(otpId, code, expectedRole = null) {
  const [[otp]] = await pool.execute(
    `SELECT * FROM nova_otp
     WHERE id = ? AND verified = 0 AND expires_at > NOW()
     LIMIT 1`,
    [otpId]
  );

  if (!otp) {
    return { error: 'otp_expired', message: 'Code expire ou invalide. Demandez un nouveau code.' };
  }

  if (otp.attempts >= otp.max_attempts) {
    await pool.execute('UPDATE nova_otp SET verified = 1 WHERE id = ?', [otp.id]);
    return { error: 'otp_max_attempts', message: 'Trop de tentatives. Demandez un nouveau code.' };
  }

  const valid = await bcrypt.compare(code, otp.code_hash);

  if (!valid) {
    await pool.execute('UPDATE nova_otp SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
    const remaining = otp.max_attempts - otp.attempts - 1;
    return {
      error: 'otp_invalid',
      message: `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
    };
  }

  await pool.execute('UPDATE nova_otp SET verified = 1 WHERE id = ?', [otp.id]);

  const [[user]] = await pool.execute('SELECT * FROM nova_users WHERE phone = ?', [otp.phone]);
  if (!user) return { error: 'user_not_found', message: 'Utilisateur introuvable.' };
  if (expectedRole && user.role !== expectedRole) return { error: 'forbidden', message: 'Role non autorise pour ce flux.' };

  return {
    user: {
      id: user.id,
      role: user.role,
      patientId: user.patient_id || null,
      doctorId: user.doctor_id || null,
      pharmacyId: user.pharmacy_id || null,
      name: user.name,
      avatar: user.avatar,
    },
  };
}

function maskPhone(phone) {
  const value = String(phone || '');
  if (value.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

/**
 * Legacy login (direct code comparison) — kept for backward compatibility.
 */
export async function phoneExists(phone) {
  const cleaned = phone.replace(/\s/g, '');
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE phone = ?', [cleaned]);
  return !!user;
}

/**
 * Cleanup expired OTPs (call periodically or via cron).
 */
export async function cleanupExpiredOtps() {
  await pool.execute('DELETE FROM nova_otp WHERE expires_at < NOW()');
}
