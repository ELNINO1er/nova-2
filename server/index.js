import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db/database.js';
import { pool } from './db/database.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes  from './routes/doctor.routes.js';
import authRoutes     from './routes/auth.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { openApiSpec } from './openapi.js';
import { validateEnvironment } from './config/env.js';

validateEnvironment();

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 4001);
const isProduction = process.env.NODE_ENV === 'production';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression());
app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
const allowedOrigins = String(process.env.WEB_ORIGIN || 'http://localhost:5174')
  .split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origine non autorisée.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_requests', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'nova-api', database: 'ready' });
  } catch {
    res.status(503).json({ ok: false, service: 'nova-api', database: 'unavailable' });
  }
});

app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

if (!isProduction || process.env.ENABLE_API_DOCS === 'true') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'NOVA API Docs' }));
}

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient/me',  patientRoutes);
app.use('/api/doctor/me',   doctorRoutes);
app.use('/api/pharmacy/me', pharmacyRoutes);
app.use('/api/admin/me',    adminRoutes);

if (isProduction) {
  app.use(express.static(distDir, { etag: true, maxAge: '1y', immutable: true, index: false }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

initDb()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`NOVA API running on http://localhost:${port}`);
      console.log(`Base de données : MySQL (sika_sante)`);
    });

    const shutdown = async () => {
      console.log('\nArrêt en cours...');
      server.close();
      await pool.end();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('Erreur connexion MySQL :', err.message);
    process.exit(1);
  });
