import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import QRCode from 'qrcode';
import { requirePatient, requirePermission } from '../middleware/auth.js';
import { upload, uploadDir, verifyUploadedFile } from '../middleware/upload.js';
import {
  getInsurance,
  getPharmacies,
  getPharmacyOrders,
  createPharmacyOrder,
  createMedicationIntake,
  createAppointment,
  createDocument,
  createNote,
  deleteAppointment,
  deleteDocument,
  getAppointments,
  getConversations,
  getConversation,
  createMessage,
  markConversationRead,
  getDashboard,
  getDoctors,
  getDoctor,
  getDoctorSlots,
  bookSlot,
  getDocuments,
  getDocumentFile,
  getEmergencyCard,
  getHistory,
  getLabResults,
  getLabResult,
  getMedicationToday,
  getMedicalProfile,
  getNotes,
  getNotifications,
  getWellnessGoals,
  createWellnessGoal,
  updateWellnessGoal,
  deleteWellnessGoal,
  markNotificationRead,
  markAllNotificationsRead,
  getProfile,
  getPrescriptions,
  getPrescription,
  getSettings,
  getTreatments,
  getVaccinations,
  getVitals,
  addVital,
  updateNote,
  updateAppointment,
  updateMedicalProfile,
  updateProfile,
  updateSettings,
  deleteNote,
  getConsents,
  grantConsent,
  revokeConsent,
  getAccessLogs,
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getPrescriptionQR,
} from '../services/patient.service.js';

import { wrap, validateBody } from '../middleware/helpers.js';
import { cacheFor } from '../middleware/cache.js';
import { answerPatientAssistant } from '../services/ai.service.js';
import { createPatientPayment, listPatientPayments } from '../services/billing.service.js';
import { buildPatientSummaryPdf } from '../services/export.service.js';

const router = Router();
router.use(requirePatient);

const familyRelationshipSchema = z.preprocess((value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    enfant: 'child',
    child: 'child',
    conjoint: 'spouse',
    epoux: 'spouse',
    spouse: 'spouse',
    parent: 'parent',
    frere: 'sibling',
    soeur: 'sibling',
    sibling: 'sibling',
    autre: 'other',
    other: 'other',
  };
  return aliases[normalized] || value;
}, z.enum(['child', 'spouse', 'parent', 'sibling', 'other']));

/* ─── Dashboard & Profil ─────────────────────────────────────── */

router.get('/dashboard', cacheFor(30), wrap(async (req, res) => {
  res.json(await getDashboard(req.user.patientId));
}));

router.post('/assistant', validateBody(z.object({
  question: z.string().min(2).max(800),
})), wrap(async (req, res) => {
  res.json(answerPatientAssistant(req.body.question));
}));

router.get('/profile', cacheFor(60), wrap(async (req, res) => {
  res.json(await getProfile(req.user.patientId));
}));

router.patch('/profile', validateBody(z.object({
  firstName:             z.string().min(1).optional(),
  lastName:              z.string().min(1).optional(),
  birthDate:             z.string().optional(),
  sex:                   z.string().optional(),
  bloodType:             z.string().optional(),
  phone:                 z.string().min(8).optional(),
  email:                 z.string().email().optional(),
  address:               z.string().optional(),
  city:                  z.string().optional(),
  weightKg:              z.number().positive().optional(),
  heightCm:              z.number().positive().optional(),
  emergencyName:         z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone:        z.string().optional(),
})), wrap(async (req, res) => {
  const { invalidateCache } = await import('../middleware/cache.js');
  invalidateCache(req.user.id);
  res.json(await updateProfile(req.user.patientId, req.body));
}));

/* ─── Vitaux ─────────────────────────────────────────────────── */

router.get('/vitals', wrap(async (req, res) => {
  res.json(await getVitals(req.user.patientId, req.query));
}));

router.post('/vitals', validateBody(z.object({
  type:       z.enum(['blood_pressure','blood_glucose','heart_rate','temperature']),
  value:      z.string().min(1),
  label:      z.string().optional(),
  unit:       z.string().optional(),
  measuredAt: z.string().datetime().optional(),
})), wrap(async (req, res) => {
  const labels = { blood_pressure: 'Tension artérielle', blood_glucose: 'Glycémie', heart_rate: 'Fréquence cardiaque', temperature: 'Température' };
  const units  = { blood_pressure: 'mmHg', blood_glucose: 'g/L', heart_rate: 'bpm', temperature: '°C' };
  const payload = {
    ...req.body,
    label: req.body.label || labels[req.body.type],
    unit:  req.body.unit  || units[req.body.type],
  };
  res.status(201).json(await addVital(req.user.patientId, payload));
}));

/* ─── Traitements & Médicaments ──────────────────────────────── */

router.get('/treatments', wrap(async (req, res) => {
  res.json(await getTreatments(req.user.patientId));
}));

router.get('/medications/today', wrap(async (req, res) => {
  res.json(await getMedicationToday(req.user.patientId));
}));

router.post('/medications/:scheduleId/intakes', validateBody(z.object({
  status:  z.enum(['taken', 'missed', 'skipped']).default('taken'),
  takenAt: z.string().datetime().optional(),
})), wrap(async (req, res) => {
  res.status(201).json(
    await createMedicationIntake(req.user.patientId, req.params.scheduleId, req.body)
  );
}));

/* ─── Rendez-vous ────────────────────────────────────────────── */

router.get('/appointments', wrap(async (req, res) => {
  res.json(await getAppointments(req.user.patientId));
}));

router.post('/appointments', validateBody(z.object({
  startsAt:   z.string().datetime(),
  doctorId:   z.string().min(1),
  specialty:  z.string().default('Médecine générale'),
  location:   z.string().default('À confirmer'),
  mode:       z.enum(['onsite', 'video']).default('onsite'),
  status:     z.enum(['requested', 'confirmed', 'cancelled']).default('requested'),
})), wrap(async (req, res) => {
  res.status(201).json(await createAppointment(req.user.patientId, req.body));
}));

router.patch('/appointments/:id', validateBody(z.object({
  startsAt:   z.string().datetime().optional(),
  mode:       z.enum(['onsite', 'video']).optional(),
  status:     z.enum(['requested', 'confirmed', 'cancelled']).optional(),
})), wrap(async (req, res) => {
  res.json(await updateAppointment(req.user.patientId, req.params.id, req.body));
}));

router.delete('/appointments/:id', wrap(async (req, res) => {
  await deleteAppointment(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── Vaccinations ───────────────────────────────────────────── */

router.get('/vaccinations', wrap(async (req, res) => {
  res.json(await getVaccinations(req.user.patientId));
}));

/* ─── Historique ─────────────────────────────────────────────── */

router.get('/history', wrap(async (req, res) => {
  res.json(await getHistory(req.user.patientId, req.query));
}));

/* ─── Documents ──────────────────────────────────────────────── */

router.get('/documents', requirePermission('patient.documents'), wrap(async (req, res) => {
  res.json(await getDocuments(req.user.patientId, req.query));
}));

router.post('/documents', requirePermission('patient.documents'), upload.single('file'), verifyUploadedFile, wrap(async (req, res) => {
  const title    = req.body.title    || (req.file ? req.file.originalname : 'Document');
  const category = req.body.category || 'other';
  const doc = await createDocument(req.user.patientId, {
    title,
    category,
    mimeType:  req.file ? req.file.mimetype    : (req.body.mimeType || 'application/pdf'),
    sizeBytes: req.file ? req.file.size        : Number(req.body.sizeBytes || 0),
    filePath:  req.file ? req.file.path        : null,
  });
  res.status(201).json(doc);
}));

router.delete('/documents/:id', requirePermission('patient.documents'), wrap(async (req, res) => {
  await deleteDocument(req.user.patientId, req.params.id);
  res.status(204).send();
}));

router.get('/documents/:id/download', requirePermission('patient.documents'), wrap(async (req, res) => {
  const file = await getDocumentFile(req.user.patientId, req.params.id);
  if (!file) return res.status(404).json({ error: 'not_found', message: 'Document introuvable' });
  res.type(file.mimeType);
  res.download(file.path, file.filename);
}));

/* ─── Conversations & Messages ───────────────────────────────── */

router.get('/conversations', wrap(async (req, res) => {
  res.json(await getConversations(req.user.patientId));
}));

router.get('/conversations/:id', wrap(async (req, res) => {
  const data = await getConversation(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Conversation introuvable' });
  res.json(data);
}));

router.post('/conversations/:id/messages', validateBody(z.object({
  body:           z.string().min(1).max(2000),
  attachmentName: z.string().optional(),
})), wrap(async (req, res) => {
  const msg = await createMessage(req.user.patientId, req.params.id, req.body);
  if (!msg) return res.status(404).json({ error: 'not_found', message: 'Conversation introuvable' });
  res.status(201).json(msg);
}));

router.patch('/conversations/:id/read', wrap(async (req, res) => {
  const result = await markConversationRead(req.user.patientId, req.params.id);
  if (!result) return res.status(404).json({ error: 'not_found', message: 'Conversation introuvable' });
  res.json(result);
}));

/* ─── Ordonnances ────────────────────────────────────────────── */

router.get('/prescriptions', wrap(async (req, res) => {
  res.json(await getPrescriptions(req.user.patientId, req.query));
}));

router.get('/prescriptions/:id', wrap(async (req, res) => {
  const data = await getPrescription(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable' });
  res.json(data);
}));

/* ─── Médecins ───────────────────────────────────────────────── */

router.get('/doctors', wrap(async (req, res) => {
  res.json(await getDoctors(req.query));
}));

router.get('/doctors/:id', wrap(async (req, res) => {
  const doc = await getDoctor(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not_found', message: 'Médecin introuvable' });
  res.json(doc);
}));

router.get('/doctors/:id/slots', wrap(async (req, res) => {
  res.json(await getDoctorSlots(req.params.id, req.query));
}));

router.post('/doctors/:id/slots/:slotId/book', wrap(async (req, res) => {
  const result = await bookSlot(req.user.patientId, req.params.slotId, req.params.id);
  if (!result) return res.status(409).json({ error: 'slot_unavailable', message: 'Ce créneau n\'est plus disponible' });
  res.status(201).json(result);
}));

/* ─── Notifications ──────────────────────────────────────────── */

router.get('/notifications', wrap(async (req, res) => {
  res.json(await getNotifications(req.user.patientId, req.query));
}));

router.patch('/notifications/read-all', wrap(async (req, res) => {
  await markAllNotificationsRead(req.user.patientId);
  res.json({ ok: true });
}));

router.patch('/notifications/:id/read', wrap(async (req, res) => {
  await markNotificationRead(req.user.patientId, req.params.id);
  res.json({ ok: true });
}));

/* ─── Résultats de laboratoire ───────────────────────────────── */

router.get('/lab-results', wrap(async (req, res) => {
  res.json(await getLabResults(req.user.patientId, req.query));
}));

router.get('/lab-results/:id', wrap(async (req, res) => {
  const data = await getLabResult(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Résultat introuvable' });
  res.json(data);
}));

/* ─── Profil médical ─────────────────────────────────────────── */

router.get('/medical-profile', wrap(async (req, res) => {
  res.json(await getMedicalProfile(req.user.patientId));
}));

router.patch('/medical-profile', validateBody(z.object({
  allergies:       z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
  familyHistory:   z.array(z.string()).optional(),
  surgicalHistory: z.array(z.string()).optional(),
})), wrap(async (req, res) => {
  res.json(await updateMedicalProfile(req.user.patientId, req.body));
}));

/* ─── Notes ──────────────────────────────────────────────────── */

router.get('/notes', wrap(async (req, res) => {
  res.json(await getNotes(req.user.patientId));
}));

router.post('/notes', validateBody(z.object({
  title:   z.string().min(1),
  content: z.string().default(''),
  color:   z.enum(['amber', 'blue', 'emerald', 'pink']).default('amber'),
  pinned:  z.boolean().default(false),
})), wrap(async (req, res) => {
  res.status(201).json(await createNote(req.user.patientId, req.body));
}));

router.patch('/notes/:id', validateBody(z.object({
  title:   z.string().min(1).optional(),
  content: z.string().optional(),
  color:   z.enum(['amber', 'blue', 'emerald', 'pink']).optional(),
  pinned:  z.boolean().optional(),
})), wrap(async (req, res) => {
  res.json(await updateNote(req.user.patientId, req.params.id, req.body));
}));

router.delete('/notes/:id', wrap(async (req, res) => {
  await deleteNote(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── Fiche Urgence ──────────────────────────────────────────── */

router.get('/emergency-card', wrap(async (req, res) => {
  const card = await getEmergencyCard(req.user.patientId);
  if (!card) return res.status(404).json({ error: 'not_found', message: 'Patient introuvable' });
  res.json(card);
}));

router.get('/emergency-card/qr', wrap(async (req, res) => {
  const card = await getEmergencyCard(req.user.patientId);
  if (!card) return res.status(404).json({ error: 'not_found' });

  const jwt = (await import('jsonwebtoken')).default;
  const token = jwt.sign(
    { type: 'emergency_card', patientId: req.user.patientId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const dataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  res.json({ qr: dataUrl, expiresIn: 900 });
}));

/* ─── Wellness Goals ─────────────────────────────────────────── */

router.get('/wellness-goals', wrap(async (req, res) => {
  res.json(await getWellnessGoals(req.user.patientId));
}));

router.post('/wellness-goals', validateBody(z.object({
  type:         z.string().min(1),
  title:        z.string().min(1),
  target:       z.number().positive(),
  currentValue: z.number().min(0).default(0),
  unit:         z.string().default(''),
  icon:         z.string().default('Target'),
  color:        z.string().default('emerald'),
})), wrap(async (req, res) => {
  res.status(201).json(await createWellnessGoal(req.user.patientId, req.body));
}));

router.patch('/wellness-goals/:id', validateBody(z.object({
  title:        z.string().min(1).optional(),
  target:       z.number().positive().optional(),
  currentValue: z.number().min(0).optional(),
  completed:    z.boolean().optional(),
})), wrap(async (req, res) => {
  const result = await updateWellnessGoal(req.user.patientId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'not_found', message: 'Objectif introuvable' });
  res.json(result);
}));

router.delete('/wellness-goals/:id', wrap(async (req, res) => {
  await deleteWellnessGoal(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── Assurance ──────────────────────────────────────────────── */

router.get('/insurance', wrap(async (req, res) => {
  res.json(await getInsurance(req.user.patientId));
}));

router.get('/payments', wrap(async (req, res) => {
  res.json(await listPatientPayments(req.user.patientId));
}));

router.post('/payments', validateBody(z.object({
  appointmentId: z.string().optional(),
  doctorId: z.string().optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().default('XOF'),
  method: z.enum(['cash', 'mobile_money', 'insurance', 'offline']).default('offline'),
  reference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createPatientPayment(req.user.patientId, req.body));
}));

router.get('/export/pdf', wrap(async (req, res) => {
  const pdf = await buildPatientSummaryPdf(req.user.patientId);
  if (!pdf) return res.status(404).json({ error: 'not_found', message: 'Patient introuvable.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="nova-export-patient.pdf"');
  res.setHeader('Cache-Control', 'no-store');
  res.send(pdf);
}));

/* ─── Pharmacies ─────────────────────────────────────────────── */

router.get('/pharmacies', wrap(async (req, res) => {
  res.json(await getPharmacies(req.query));
}));

router.get('/pharmacy-orders', wrap(async (req, res) => {
  res.json(await getPharmacyOrders(req.user.patientId));
}));

router.post('/pharmacy-orders', validateBody(z.object({
  pharmacyId:     z.string().min(1),
  prescriptionId: z.string().optional(),
  notes:          z.string().max(500).optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createPharmacyOrder(req.user.patientId, req.body));
}));

/* ─── Paramètres ─────────────────────────────────────────────── */

router.get('/settings', wrap(async (req, res) => {
  res.json(await getSettings(req.user.patientId));
}));

router.patch('/settings', validateBody(z.record(z.string(), z.unknown()).refine(
  (val) => JSON.stringify(val).length < 50000,
  { message: 'Payload trop volumineux' }
)), wrap(async (req, res) => {
  res.json(await updateSettings(req.user.patientId, req.body));
}));

/* ─── Consentements ──────────────────────────────────────────── */

router.get('/consents', requirePermission('patient.consents'), wrap(async (req, res) => {
  res.json(await getConsents(req.user.patientId));
}));

router.post('/consents/:id/grant', requirePermission('patient.consents'), wrap(async (req, res) => {
  res.json(await grantConsent(req.user.patientId, req.params.id));
}));

router.post('/consents/:id/revoke', requirePermission('patient.consents'), wrap(async (req, res) => {
  res.json(await revokeConsent(req.user.patientId, req.params.id));
}));

/* ─── Access Logs ────────────────────────────────────────────── */

router.get('/access-logs', wrap(async (req, res) => {
  res.json(await getAccessLogs(req.user.patientId));
}));

/* ─── Dossier familial ───────────────────────────────────────── */

router.get('/family', requirePermission('patient.family'), wrap(async (req, res) => {
  res.json(await getFamilyMembers(req.user.patientId));
}));

router.post('/family', requirePermission('patient.family'), validateBody(z.object({
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  relationship:    familyRelationshipSchema,
  birthDate:       z.string().optional(),
  memberPatientId: z.string().optional(),
  notes:           z.string().max(500).optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createFamilyMember(req.user.patientId, req.body));
}));

router.patch('/family/:id', requirePermission('patient.family'), validateBody(z.object({
  firstName:    z.string().min(1).optional(),
  lastName:     z.string().min(1).optional(),
  relationship: familyRelationshipSchema.optional(),
  birthDate:    z.string().optional(),
  notes:        z.string().max(500).optional(),
})), wrap(async (req, res) => {
  res.json(await updateFamilyMember(req.user.patientId, req.params.id, req.body));
}));

router.delete('/family/:id', requirePermission('patient.family'), wrap(async (req, res) => {
  await deleteFamilyMember(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── QR Ordonnance sécurisé ─────────────────────────────────── */

router.get('/prescriptions/:id/qr', wrap(async (req, res) => {
  const data = await getPrescriptionQR(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable.' });
  res.json(data);
}));

export default router;
