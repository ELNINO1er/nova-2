import { Router } from 'express';
import { z } from 'zod';
import { requirePharmacist, requirePermission } from '../middleware/auth.js';
import { wrap, validateBody } from '../middleware/helpers.js';
import { auditLog } from '../middleware/audit.js';
import {
  verifyPrescriptionQR,
  getPrescriptionForPharmacy,
  dispensePrescription,
  getDispenseHistory,
  getPharmacyDashboard,
} from '../services/pharmacy.service.js';

const router = Router();
router.use(requirePharmacist);

/* ─── Dashboard ───────────────────────────────────────────────── */
router.get('/dashboard', wrap(async (req, res) => {
  res.json(await getPharmacyDashboard(req.user.pharmacyId));
}));

/* ─── Vérifier ordonnance (scan QR) ───────────────────────────── */
router.post('/verify-prescription', requirePermission('pharmacy.verify'), validateBody(z.object({
  qrToken: z.string().min(1),
})), wrap(async (req, res) => {
  const result = await verifyPrescriptionQR(req.body.qrToken);
  if (!result) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable.' });
  res.json(result);
}));

/* ─── Voir détail ordonnance ──────────────────────────────────── */
router.get('/prescription/:id', requirePermission('pharmacy.verify'), wrap(async (req, res) => {
  const data = await getPrescriptionForPharmacy(req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable.' });
  res.json(data);
}));

/* ─── Délivrer ordonnance ─────────────────────────────────────── */
router.post('/dispense', requirePermission('pharmacy.dispense'), validateBody(z.object({
  prescriptionId: z.string().min(1),
  status:         z.enum(['full', 'partial', 'refused']),
  items:          z.array(z.object({
    prescriptionItemId: z.string().min(1),
    quantityDispensed:  z.number().int().positive(),
    substituted:        z.boolean().default(false),
    substitutionName:   z.string().optional(),
    substitutionReason: z.string().optional(),
  })).min(1),
  notes: z.string().max(1000).optional(),
})), auditLog('prescription.dispense', 'dispense'), wrap(async (req, res) => {
  res.status(201).json(await dispensePrescription(
    req.user.pharmacyId,
    req.user.id,
    req.body
  ));
}));

/* ─── Historique délivrances ──────────────────────────────────── */
router.get('/dispenses', requirePermission('pharmacy.history'), wrap(async (req, res) => {
  res.json(await getDispenseHistory(req.user.pharmacyId, req.query));
}));

export default router;
