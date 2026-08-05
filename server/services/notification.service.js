import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';

/**
 * Créer une notification pour un utilisateur (patient, médecin, pharmacien).
 * @param {Object} opts
 * @param {string} opts.patientId — ID patient (legacy, pour compat)
 * @param {string} opts.userId — ID user cible (nouveau, universel)
 * @param {string} opts.targetRole — rôle cible (patient/doctor/pharmacist)
 * @param {string} opts.type — type de notification
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} opts.linkPage — page de navigation
 * @param {string} opts.sourceUserId — qui a déclenché
 * @param {string} opts.sourceRole — rôle source
 */
export async function createNotification(opts) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_notifications (id, patient_id, user_id, target_role, type, title, body, link_page, source_user_id, source_role, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, opts.patientId || '', opts.userId || null, opts.targetRole || null,
     opts.type, opts.title, opts.body || null, opts.linkPage || null,
     opts.sourceUserId || null, opts.sourceRole || null, now]
  );
  return id;
}

/**
 * Notification → patient quand médecin crée consultation
 */
export async function notifyPatientConsultation(patientId, doctorName, consultationId) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'consultation',
    title: 'Nouvelle consultation',
    body: `${doctorName} a ajouté un compte-rendu de consultation à votre dossier.`,
    linkPage: 'history',
  });
}

/**
 * Notification → patient quand ordonnance créée
 */
export async function notifyPatientPrescription(patientId, doctorName) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'prescription',
    title: 'Nouvelle ordonnance',
    body: `${doctorName} vous a émis une ordonnance. Consultez-la dans vos ordonnances.`,
    linkPage: 'prescriptions',
  });
}

/**
 * Notification → patient quand pharmacie délivre
 */
export async function notifyPatientDispense(patientId, pharmacyName, status) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  const label = status === 'full' ? 'délivré votre ordonnance' : 'partiellement délivré votre ordonnance';
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'pharmacy',
    title: status === 'full' ? 'Ordonnance délivrée' : 'Délivrance partielle',
    body: `${pharmacyName} a ${label}.`,
    linkPage: 'prescriptions',
  });
}

/**
 * Notification → médecin quand pharmacie délivre son ordonnance
 */
export async function notifyDoctorDispense(doctorId, patientName, pharmacyName, status) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  const label = status === 'full' ? 'intégralement délivrée' : 'partiellement délivrée';
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'dispense',
    title: 'Ordonnance délivrée',
    body: `L'ordonnance de ${patientName} a été ${label} par ${pharmacyName}.`,
    linkPage: 'prescriptions',
  });
}

/**
 * Notification → médecin quand patient prend RDV
 */
export async function notifyDoctorAppointment(doctorId, patientName, date) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'appointment',
    title: 'Nouveau rendez-vous',
    body: `${patientName} a pris rendez-vous pour le ${date}.`,
    linkPage: 'agenda',
  });
}

/**
 * Notification → médecin quand patient accorde/révoque consentement
 */
export async function notifyDoctorConsent(doctorId, patientName, granted) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'consent',
    title: granted ? 'Accès accordé' : 'Accès révoqué',
    body: `${patientName} a ${granted ? 'accordé' : 'révoqué'} l'accès à son dossier médical.`,
    linkPage: 'patients',
  });
}

/**
 * Notification → médecin quand transfert accepté/refusé
 */
export async function notifyDoctorReferral(doctorId, toDoctorName, patientName, accepted) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'referral',
    title: accepted ? 'Transfert accepté' : 'Transfert refusé',
    body: `Dr. ${toDoctorName} a ${accepted ? 'accepté' : 'refusé'} le transfert de ${patientName}.`,
    linkPage: 'patients',
  });
}

/**
 * Notification → patient quand résultat labo disponible
 */
export async function notifyPatientLabResult(patientId, labTitle) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'lab_result',
    title: 'Résultat disponible',
    body: `Votre résultat "${labTitle}" est disponible.`,
    linkPage: 'labresults',
  });
}

/**
 * Notification → patient rappel médicament
 */
export async function notifyPatientMedicationReminder(patientId, medName, time) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'medication',
    title: 'Rappel médicament',
    body: `Il est l'heure de prendre ${medName} (${time}).`,
    linkPage: 'pilulier',
  });
}

/**
 * Récupérer notifications pour un user (par user_id OU patient_id legacy)
 */
export async function getNotificationsForUser(userId, role) {
  if (role === 'patient') {
    // Compat: chercher par patient_id ou user_id
    const [[user]] = await pool.execute('SELECT patient_id FROM nova_users WHERE id = ?', [userId]);
    const [rows] = await pool.execute(
      `SELECT * FROM nova_notifications
       WHERE (user_id = ? OR patient_id = ?)
       ORDER BY created_at DESC LIMIT 50`,
      [userId, user?.patient_id || '']
    );
    return rows;
  }

  const [rows] = await pool.execute(
    'SELECT * FROM nova_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return rows;
}

/**
 * Marquer notification lue
 */
export async function markNotificationReadById(userId, notificationId) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR patient_id IN (SELECT patient_id FROM nova_users WHERE id = ?))',
    [notificationId, userId, userId]
  );
}

/**
 * Marquer toutes les notifications lues
 */
export async function markAllNotificationsReadForUser(userId) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE (user_id = ? OR patient_id IN (SELECT patient_id FROM nova_users WHERE id = ?)) AND is_read = 0',
    [userId, userId]
  );
}
