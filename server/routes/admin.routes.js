import express from 'express';
import { requireAdmin, requirePermission } from '../middleware/auth.js';
import { parsePagination } from '../middleware/paginate.js';
import { auditLog } from '../middleware/audit.js';
import {
  getAdminAccessLogs,
  getAdminAuditLogs,
  getAdminDashboard,
  getAdminSystem,
  getAdminUsers,
  setDoctorAvailability,
  setPharmacyOpen,
} from '../services/admin.service.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/dashboard', requirePermission('admin.stats'), async (_req, res, next) => {
  try {
    res.json(await getAdminDashboard());
  } catch (err) {
    next(err);
  }
});

router.get('/users', requirePermission('admin.users'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    res.json(await getAdminUsers({ ...req.query, ...pagination }));
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', requirePermission('admin.audit_logs'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    res.json(await getAdminAuditLogs({ ...req.query, ...pagination }));
  } catch (err) {
    next(err);
  }
});

router.get('/access-logs', requirePermission('admin.audit_logs'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    res.json(await getAdminAccessLogs({ ...req.query, ...pagination }));
  } catch (err) {
    next(err);
  }
});

router.get('/system', requirePermission('admin.stats'), async (_req, res, next) => {
  try {
    res.json(await getAdminSystem());
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/doctors/:id/status',
  requirePermission('admin.doctors.validate'),
  auditLog('admin.doctor.status_update', 'doctor'),
  async (req, res, next) => {
    try {
      const doctor = await setDoctorAvailability(req.params.id, Boolean(req.body?.isAvailable));
      if (!doctor) return res.status(404).json({ error: 'not_found', message: 'Medecin introuvable.' });
      res.json(doctor);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/pharmacies/:id/status',
  requirePermission('admin.pharmacies'),
  auditLog('admin.pharmacy.status_update', 'pharmacy'),
  async (req, res, next) => {
    try {
      const pharmacy = await setPharmacyOpen(req.params.id, Boolean(req.body?.isOpen));
      if (!pharmacy) return res.status(404).json({ error: 'not_found', message: 'Pharmacie introuvable.' });
      res.json(pharmacy);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
