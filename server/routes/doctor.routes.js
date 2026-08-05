import { Router } from 'express';
import { z } from 'zod';
import { requireDoctor, requirePermission } from '../middleware/auth.js';
import {
  getDoctorDashboard,
  getDoctorPatients,
  getDoctorPatient,
  getDoctorAppointments,
  updateDoctorAppointment,
  getDoctorConsultations,
  createConsultation,
  updateConsultation,
  getDoctorStats,
  getDoctorProfile,
  getDoctorPrescriptions,
  getDoctorPrescription,
  createDoctorPrescription,
  getDoctorLabRequests,
  createDoctorLabRequest,
  getChronicPatients,
  getDoctorAlerts,
  createDoctorAlert,
  resolveDoctorAlert,
  getDoctorFinances,
  getDoctorFullReputation,
  getDoctorSignatureData,
  saveDoctorSignatureData,
  createPatientByDoctor,
  getConsultationTemplates,
  createConsultationTemplate,
  deleteConsultationTemplate,
  getPrescriptionTemplates,
  createPrescriptionTemplate,
  deletePrescriptionTemplate,
  createReferral,
  getReferrals,
  respondReferral,
  addVitalByDoctor,
} from '../services/doctor.service.js';

import { wrap, validateBody } from '../middleware/helpers.js';
import { upload, verifyUploadedFile } from '../middleware/upload.js';
import { answerDoctorAssistant } from '../services/ai.service.js';
import { listDoctorPayments, markDoctorPaymentPaid } from '../services/billing.service.js';
import { auditLog, accessLog } from '../middleware/audit.js';

const router = Router();
router.use(requireDoctor);

/* ─── Dashboard ────────────────────────────────────────────── */
router.get('/dashboard', wrap(async (req, res) => {
  res.json(await getDoctorDashboard(req.user.doctorId));
}));

router.post('/assistant', validateBody(z.object({
  question: z.string().min(2).max(800),
  highRiskCount: z.number().int().min(0).optional(),
})), wrap(async (req, res) => {
  res.json(answerDoctorAssistant(req.body.question, { highRiskCount: req.body.highRiskCount || 0 }));
}));

/* ─── Patients ─────────────────────────────────────────────── */
router.get('/patients', requirePermission('doctor.patients'), wrap(async (req, res) => {
  res.json(await getDoctorPatients(req.user.doctorId, req.query));
}));

router.post('/patients', requirePermission('doctor.patients.create'), validateBody(z.object({
  firstName:             z.string().min(1),
  lastName:              z.string().min(1),
  phone:                 z.string().min(8),
  cmuNumber:             z.string().optional(),
  birthDate:             z.string().optional(),
  sex:                   z.enum(['M', 'F']).optional(),
  bloodType:             z.string().optional(),
  email:                 z.string().email().optional(),
  address:               z.string().optional(),
  city:                  z.string().optional(),
  weightKg:              z.number().positive().optional(),
  heightCm:              z.number().positive().optional(),
  emergencyName:         z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone:        z.string().optional(),
  allergies:             z.array(z.string()).optional(),
  chronicDiseases:       z.array(z.string()).optional(),
})), auditLog('patient.create', 'patient'), wrap(async (req, res) => {
  res.status(201).json(await createPatientByDoctor(req.user.doctorId, req.body));
}));

router.get('/patients/:id', requirePermission('doctor.patients'), accessLog('patient_record'), wrap(async (req, res) => {
  const data = await getDoctorPatient(req.user.doctorId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Patient introuvable ou non autorisé.' });
  res.json(data);
}));

/* ─── Rendez-vous ──────────────────────────────────────────── */
router.get('/appointments', wrap(async (req, res) => {
  res.json(await getDoctorAppointments(req.user.doctorId, req.query));
}));

router.patch('/appointments/:id', validateBody(z.object({
  status:   z.enum(['confirmed','cancelled','requested']).optional(),
  startsAt: z.string().datetime().optional(),
  location: z.string().optional(),
})), wrap(async (req, res) => {
  const result = await updateDoctorAppointment(req.user.doctorId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
}));

/* ─── Consultations ────────────────────────────────────────── */
router.get('/consultations', wrap(async (req, res) => {
  res.json(await getDoctorConsultations(req.user.doctorId));
}));

router.post('/consultations', requirePermission('doctor.consultations'), validateBody(z.object({
  patientId:          z.string().min(1),
  motif:              z.string().optional(),
  diagnosisMain:      z.string().optional(),
  diagnosisSecondary: z.string().optional(),
  notes:              z.string().optional(),
  recommendations:    z.string().optional(),
})), auditLog('consultation.create', 'consultation'), wrap(async (req, res) => {
  res.status(201).json(await createConsultation(req.user.doctorId, req.body));
}));

router.patch('/consultations/:id', validateBody(z.object({
  motif:              z.string().optional(),
  diagnosisMain:      z.string().optional(),
  diagnosisSecondary: z.string().optional(),
  notes:              z.string().optional(),
  recommendations:    z.string().optional(),
  status:             z.enum(['draft','completed']).optional(),
})), wrap(async (req, res) => {
  const result = await updateConsultation(req.user.doctorId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
}));

/* ─── Statistiques ─────────────────────────────────────────── */
router.get('/stats', wrap(async (req, res) => {
  res.json(await getDoctorStats(req.user.doctorId));
}));

/* ─── Profil ────────────────────────────────────────────────── */
router.get('/profile', wrap(async (req, res) => {
  const data = await getDoctorProfile(req.user.doctorId);
  if (!data) return res.status(404).json({ error: 'not_found' });
  res.json(data);
}));

/* ─── Ordonnances (médecin) ─────────────────────────────────── */
router.get('/prescriptions', wrap(async (req, res) => {
  res.json(await getDoctorPrescriptions(req.user.doctorId));
}));

router.get('/prescriptions/:id', wrap(async (req, res) => {
  const data = await getDoctorPrescription(req.user.doctorId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found' });
  res.json(data);
}));

router.post('/prescriptions', requirePermission('doctor.prescriptions'), validateBody(z.object({
  patientId: z.string().min(1),
  items:     z.array(z.object({
    name:         z.string().min(1),
    dosage:       z.string().optional(),
    frequency:    z.string().optional(),
    duration:     z.string().optional(),
    instructions: z.string().optional(),
  })).min(1),
  notes:     z.string().optional(),
  validDays: z.number().int().positive().optional(),
})), auditLog('prescription.create', 'prescription'), wrap(async (req, res) => {
  res.status(201).json(await createDoctorPrescription(req.user.doctorId, req.body));
}));

/* ─── Suivi chroniques ──────────────────────────────────────── */
router.get('/chronic-patients', wrap(async (req, res) => {
  res.json(await getChronicPatients(req.user.doctorId));
}));

/* ─── Alertes médecin ───────────────────────────────────────── */
router.get('/alerts', wrap(async (req, res) => {
  res.json(await getDoctorAlerts(req.user.doctorId));
}));

router.post('/alerts', validateBody(z.object({
  patientId: z.string().min(1),
  type:      z.enum(['chronic', 'urgent', 'followup', 'lab', 'other']),
  level:     z.enum(['info', 'warning', 'critical']).optional(),
  title:     z.string().min(1),
  body:      z.string().optional(),
})), auditLog('alert.create', 'alert'), wrap(async (req, res) => {
  res.status(201).json(await createDoctorAlert(req.user.doctorId, req.body));
}));

router.patch('/alerts/:id/resolve', wrap(async (req, res) => {
  const result = await resolveDoctorAlert(req.user.doctorId, req.params.id);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
}));

/* ─── Finances ──────────────────────────────────────────────── */
router.get('/finances', wrap(async (req, res) => {
  res.json(await getDoctorFinances(req.user.doctorId));
}));

router.get('/payments', wrap(async (req, res) => {
  res.json(await listDoctorPayments(req.user.doctorId));
}));

router.patch('/payments/:id/paid', validateBody(z.object({
  reference: z.string().max(100).optional(),
})), wrap(async (req, res) => {
  const payment = await markDoctorPaymentPaid(req.user.doctorId, req.params.id, req.body.reference || null);
  if (!payment) return res.status(404).json({ error: 'not_found', message: 'Paiement introuvable.' });
  res.json(payment);
}));

/* ─── Réputation complète ───────────────────────────────────── */
router.get('/reputation', wrap(async (req, res) => {
  res.json(await getDoctorFullReputation(req.user.doctorId));
}));

/* ─── Signature électronique ────────────────────────────────── */
router.get('/signature', wrap(async (req, res) => {
  res.json(await getDoctorSignatureData(req.user.doctorId));
}));

router.post('/signature', validateBody(z.object({
  signatureData: z.string().min(1).max(500000),
})), wrap(async (req, res) => {
  res.json(await saveDoctorSignatureData(req.user.doctorId, req.body.signatureData));
}));

/* ─── Demandes d'analyses ───────────────────────────────────── */
router.get('/lab-requests', wrap(async (req, res) => {
  res.json(await getDoctorLabRequests(req.user.doctorId));
}));

router.post('/lab-requests', requirePermission('doctor.lab_requests'), validateBody(z.object({
  patientId:      z.string().min(1),
  type:           z.string().min(1),
  title:          z.string().min(1),
  notes:          z.string().optional(),
  consultationId: z.string().optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createDoctorLabRequest(req.user.doctorId, req.body));
}));

/* ─── Consentement : demander accès dossier patient ──────────── */
router.post('/consents/:patientId/request', requirePermission('doctor.consents.request'), validateBody(z.object({
  scope: z.array(z.string()).min(1),
})), auditLog('consent.request', 'consent'), wrap(async (req, res) => {
  const { randomUUID } = await import('node:crypto');
  const { pool } = await import('../db/database.js');

  // Vérifier que le patient existe
  const [[patient]] = await pool.execute('SELECT id FROM nova_patients WHERE id = ?', [req.params.patientId]);
  if (!patient) return res.status(404).json({ error: 'not_found', message: 'Patient introuvable.' });

  // Vérifier s'il y a déjà un consentement pending
  const [[existing]] = await pool.execute(
    'SELECT id FROM nova_consents WHERE patient_id = ? AND doctor_id = ? AND status = ?',
    [req.params.patientId, req.user.doctorId, 'pending']
  );
  if (existing) return res.status(409).json({ error: 'already_pending', message: 'Une demande est déjà en attente.' });

  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope) VALUES (?, ?, ?, 'pending', ?)`,
    [id, req.params.patientId, req.user.doctorId, JSON.stringify(req.body.scope)]
  );

  // Notification au patient
  const [[doctor]] = await pool.execute('SELECT first_name, last_name, specialty FROM nova_doctors WHERE id = ?', [req.user.doctorId]);
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Un médecin';
  await pool.execute(
    `INSERT INTO nova_notifications (id, patient_id, type, title, body, link_page, created_at)
     VALUES (?, ?, 'consent', ?, ?, 'consents', NOW())`,
    [randomUUID(), req.params.patientId, 'Demande d\'accès à votre dossier',
     `${doctorName} (${doctor?.specialty || ''}) demande l'accès à votre dossier médical.`]
  );

  res.status(201).json({ id, status: 'pending', patientId: req.params.patientId });
}));

/* ─── Voir statut délivrance d'une ordonnance ────────────────── */
router.get('/prescriptions/:id/dispense-status', wrap(async (req, res) => {
  const { pool } = await import('../db/database.js');
  const [[rx]] = await pool.execute(
    'SELECT id, status, doctor_id FROM nova_prescriptions WHERE id = ? AND doctor_id = ?',
    [req.params.id, req.user.doctorId]
  );
  if (!rx) return res.status(404).json({ error: 'not_found' });

  const [dispenses] = await pool.execute(
    `SELECT d.id, d.status, d.dispensed_at, d.notes, ph.name AS pharmacy_name
     FROM nova_dispenses d JOIN nova_pharmacies ph ON ph.id = d.pharmacy_id
     WHERE d.prescription_id = ? ORDER BY d.dispensed_at DESC`,
    [req.params.id]
  );

  res.json({
    prescriptionId: rx.id,
    prescriptionStatus: rx.status,
    dispenses: dispenses.map(d => ({
      id: d.id, status: d.status, pharmacyName: d.pharmacy_name,
      dispensedAt: d.dispensed_at, notes: d.notes,
    })),
  });
}));

/* ─── Templates consultation ─────────────────────────────────── */
router.get('/consultation-templates', wrap(async (req, res) => {
  res.json(await getConsultationTemplates(req.user.doctorId));
}));

router.post('/consultation-templates', validateBody(z.object({
  name:            z.string().min(1),
  specialty:       z.string().optional(),
  motif:           z.string().optional(),
  diagnosisMain:   z.string().optional(),
  notes:           z.string().optional(),
  recommendations: z.string().optional(),
  isDefault:       z.boolean().optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createConsultationTemplate(req.user.doctorId, req.body));
}));

router.delete('/consultation-templates/:id', wrap(async (req, res) => {
  await deleteConsultationTemplate(req.user.doctorId, req.params.id);
  res.status(204).send();
}));

/* ─── Templates ordonnance ───────────────────────────────────── */
router.get('/prescription-templates', wrap(async (req, res) => {
  res.json(await getPrescriptionTemplates(req.user.doctorId));
}));

router.post('/prescription-templates', validateBody(z.object({
  name:  z.string().min(1),
  items: z.array(z.object({
    name:         z.string().min(1),
    dosage:       z.string().optional(),
    frequency:    z.string().optional(),
    duration:     z.string().optional(),
    instructions: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createPrescriptionTemplate(req.user.doctorId, req.body));
}));

router.delete('/prescription-templates/:id', wrap(async (req, res) => {
  await deletePrescriptionTemplate(req.user.doctorId, req.params.id);
  res.status(204).send();
}));

/* ─── Transfert patient vers spécialiste ─────────────────────── */
router.get('/referrals', wrap(async (req, res) => {
  res.json(await getReferrals(req.user.doctorId));
}));

router.post('/referrals', validateBody(z.object({
  patientId:  z.string().min(1),
  toDoctorId: z.string().min(1),
  reason:     z.string().min(1),
  urgency:    z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes:      z.string().optional(),
  sharedData: z.array(z.string()).optional(),
})), auditLog('referral.create', 'referral'), wrap(async (req, res) => {
  res.status(201).json(await createReferral(req.user.doctorId, req.body));
}));

router.post('/referrals/:id/accept', wrap(async (req, res) => {
  res.json(await respondReferral(req.user.doctorId, req.params.id, true));
}));

router.post('/referrals/:id/decline', wrap(async (req, res) => {
  res.json(await respondReferral(req.user.doctorId, req.params.id, false));
}));

/* ─── Constantes vitales par médecin ─────────────────────────── */
router.post('/patients/:id/vitals', validateBody(z.object({
  type:       z.enum(['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature', 'weight', 'spo2']),
  value:      z.string().min(1),
  label:      z.string().optional(),
  unit:       z.string().optional(),
  measuredAt: z.string().optional(),
})), auditLog('vital.create', 'vital'), wrap(async (req, res) => {
  const labels = { blood_pressure: 'Tension', blood_glucose: 'Glycémie', heart_rate: 'Fréquence', temperature: 'Température', weight: 'Poids', spo2: 'SpO2' };
  const units  = { blood_pressure: 'mmHg', blood_glucose: 'g/L', heart_rate: 'bpm', temperature: '°C', weight: 'kg', spo2: '%' };
  const payload = {
    ...req.body,
    label: req.body.label || labels[req.body.type],
    unit:  req.body.unit  || units[req.body.type],
  };
  res.status(201).json(await addVitalByDoctor(req.user.doctorId, req.params.id, payload));
}));

/* ─── Notifications médecin ──────────────────────────────────── */
router.get('/notifications', wrap(async (req, res) => {
  const { getNotificationsForUser } = await import('../services/notification.service.js');
  const rows = await getNotificationsForUser(req.user.id, 'doctor');
  res.json(rows.map(r => ({
    id: r.id, type: r.type, title: r.title, body: r.body,
    linkPage: r.link_page, isRead: Boolean(r.is_read), createdAt: r.created_at,
  })));
}));

router.patch('/notifications/:id/read', wrap(async (req, res) => {
  const { markNotificationReadById } = await import('../services/notification.service.js');
  await markNotificationReadById(req.user.id, req.params.id);
  res.json({ ok: true });
}));

router.patch('/notifications/read-all', wrap(async (req, res) => {
  const { markAllNotificationsReadForUser } = await import('../services/notification.service.js');
  await markAllNotificationsReadForUser(req.user.id);
  res.json({ ok: true });
}));

/* ── Messages (doctor) ───────────────────────────── */
router.get('/conversations', wrap(async (req, res) => {
  const { getDoctorConversations } = await import('../services/doctor.service.js');
  res.json(await getDoctorConversations(req.user.doctorId));
}));
router.get('/conversations/:id', wrap(async (req, res) => {
  const { getDoctorConversation } = await import('../services/doctor.service.js');
  res.json(await getDoctorConversation(req.user.doctorId, req.params.id));
}));
router.post('/conversations/:id/messages', wrap(async (req, res) => {
  const { createDoctorMessage } = await import('../services/doctor.service.js');
  res.json(await createDoctorMessage(req.user.doctorId, req.params.id, req.body));
}));
router.patch('/conversations/:id/read', wrap(async (req, res) => {
  const { markDoctorConversationRead } = await import('../services/doctor.service.js');
  res.json(await markDoctorConversationRead(req.user.doctorId, req.params.id));
}));

/* ── Documents (doctor) ──────────────────────────── */
router.get('/documents', wrap(async (req, res) => {
  const { getDoctorDocuments } = await import('../services/doctor.service.js');
  res.json(await getDoctorDocuments(req.user.id));
}));
router.post('/documents', upload.single('file'), verifyUploadedFile, wrap(async (req, res) => {
  const { createDoctorDocument } = await import('../services/doctor.service.js');
  if (!req.file) return res.status(422).json({ error: 'file_required', message: 'Fichier requis.' });
  res.status(201).json(await createDoctorDocument(req.user.id, req.body, req.file));
}));
router.delete('/documents/:id', wrap(async (req, res) => {
  const { deleteDoctorDocument } = await import('../services/doctor.service.js');
  res.json(await deleteDoctorDocument(req.user.id, req.params.id));
}));

/* ── Settings (doctor) ───────────────────────────── */
router.get('/settings', wrap(async (req, res) => {
  const { getDoctorSettings } = await import('../services/doctor.service.js');
  res.json(await getDoctorSettings(req.user.id));
}));
router.patch('/settings', wrap(async (req, res) => {
  const { updateDoctorSettings } = await import('../services/doctor.service.js');
  res.json(await updateDoctorSettings(req.user.id, req.body));
}));

export default router;
