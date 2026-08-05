const isProduction = process.env.NODE_ENV === 'production';

export function validateEnvironment() {
  if (!isProduction) return;
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'WEB_ORIGIN'];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  if (String(process.env.JWT_SECRET).length < 32 || String(process.env.JWT_REFRESH_SECRET).length < 32) {
    throw new Error('JWT_SECRET et JWT_REFRESH_SECRET doivent contenir au moins 32 caractères.');
  }
  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET et JWT_REFRESH_SECRET doivent être différents.');
  }
  if (process.env.SEED_DEMO === 'true') throw new Error('SEED_DEMO ne peut pas être activé en production.');
}
