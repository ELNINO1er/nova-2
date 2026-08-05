import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { initDb, pool } from '../db/database.js';

const phone = String(process.env.BOOTSTRAP_ADMIN_PHONE || '').replace(/\s/g, '');
const name = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Administrateur NOVA').trim();

if (phone.length < 8) {
  console.error('BOOTSTRAP_ADMIN_PHONE est requis (8 caractères minimum).');
  process.exit(1);
}

try {
  await initDb();
  const codeHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  await pool.execute(
    `INSERT INTO nova_users (id, phone, code_hash, role, name, avatar, created_at)
     VALUES (?, ?, ?, 'admin', ?, 'AD', ?)
     ON DUPLICATE KEY UPDATE role = 'admin', name = VALUES(name), updated_at = VALUES(created_at)`,
    [randomUUID(), phone, codeHash, name, new Date().toISOString()]
  );
  console.log(`Administrateur prêt: ${phone}. Connexion par OTP uniquement.`);
} finally {
  await pool.end();
}

