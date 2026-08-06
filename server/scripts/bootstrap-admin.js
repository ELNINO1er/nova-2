import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { initDb, pool } from '../db/database.js';
import { isValidCiPhone, normalizeCiPhone } from '../utils/phone.js';

const phone = normalizeCiPhone(process.env.BOOTSTRAP_ADMIN_PHONE);
const name = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Administrateur NOVA').trim();

if (!isValidCiPhone(phone)) {
  console.error('BOOTSTRAP_ADMIN_PHONE doit contenir les 10 chiffres ivoiriens.');
  process.exit(1);
}

try {
  await initDb();
  const codeHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  const aliases = [phone, `+225${phone}`];
  const [existing] = await pool.execute(
    'SELECT id FROM nova_users WHERE phone IN (?, ?) ORDER BY phone = ? DESC LIMIT 1',
    [aliases[0], aliases[1], phone]
  );
  const now = new Date().toISOString();
  if (existing[0]) {
    await pool.execute(
      `UPDATE nova_users SET phone = ?, role = 'admin', name = ?, updated_at = ? WHERE id = ?`,
      [phone, name, now, existing[0].id]
    );
  } else {
    await pool.execute(
      `INSERT INTO nova_users (id, phone, code_hash, role, name, avatar, created_at)
       VALUES (?, ?, ?, 'admin', ?, 'AD', ?)`,
      [randomUUID(), phone, codeHash, name, now]
    );
  }
  console.log(`Administrateur prêt: ${phone}. Connexion par OTP uniquement.`);
} finally {
  await pool.end();
}
