import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/database.js';
import { notifyDoctorConsent, notifyDoctorAppointment } from './notification.service.js';
import { parsePagination, paginatedResponse } from '../middleware/paginate.js';

/* ─── Dashboard ─────────────────────────────────────────────── */

export async function getDashboard(patientId) {
  const [profile, latestVitals, todayMedications] = await Promise.all([
    getProfile(patientId),
    getDashboardVitals(patientId),
    getMedicationToday(patientId),
  ]);

  const [[nextRow]] = await pool.execute(
    `SELECT * FROM nova_appointments
     WHERE patient_id = ? AND starts_at >= ?
     ORDER BY starts_at ASC LIMIT 1`,
    [patientId, new Date().toISOString()]
  );
  const nextAppointment = nextRow ? mapAppointment(nextRow) : null;

  const [[{ total: unreadMessages }]] = await pool.execute(
    'SELECT COALESCE(SUM(unread_count), 0) AS total FROM nova_conversations WHERE patient_id = ?',
    [patientId]
  );
  const [[{ total: documentsCount }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_documents WHERE patient_id = ?',
    [patientId]
  );

  return {
    profile,
    healthScore: await calculateHealthScore(patientId, { latestVitals, todayMedications, nextAppointment }),
    latestVitals,
    nextAppointment,
    todayMedications,
    unreadMessages: Number(unreadMessages),
    documentsCount: Number(documentsCount),
  };
}

/* ─── Profil ─────────────────────────────────────────────────── */

export async function getProfile(patientId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_patients WHERE id = ?', [patientId]
  );
  return row ? mapPatient(row) : null;
}

export async function updateProfile(patientId, changes) {
  const current = await getProfile(patientId);
  if (!current) return null;

  const next = {
    first_name:               changes.firstName             ?? current.firstName,
    last_name:                changes.lastName              ?? current.lastName,
    birth_date:               changes.birthDate             ?? current.birthDate,
    sex:                      changes.sex                   ?? current.sex,
    blood_type:               changes.bloodType             ?? current.bloodType,
    phone:                    changes.phone                 ?? current.phone,
    email:                    changes.email                 ?? current.email,
    address:                  changes.address               ?? current.address,
    city:                     changes.city                  ?? current.city,
    weight_kg:                changes.weightKg              ?? current.weightKg,
    height_cm:                changes.heightCm              ?? current.heightCm,
    emergency_name:           changes.emergencyName         ?? current.emergencyContact?.name,
    emergency_relationship:   changes.emergencyRelationship ?? current.emergencyContact?.relationship,
    emergency_phone:          changes.emergencyPhone        ?? current.emergencyContact?.phone,
    updated_at:               new Date().toISOString(),
  };

  await pool.execute(`
    UPDATE nova_patients
    SET first_name = ?, last_name = ?, birth_date = ?, sex = ?, blood_type = ?,
        phone = ?, email = ?, address = ?, city = ?,
        weight_kg = ?, height_cm = ?,
        emergency_name = ?, emergency_relationship = ?, emergency_phone = ?,
        updated_at = ?
    WHERE id = ?
  `, [
    next.first_name, next.last_name, next.birth_date, next.sex, next.blood_type,
    next.phone, next.email, next.address, next.city,
    next.weight_kg, next.height_cm,
    next.emergency_name, next.emergency_relationship, next.emergency_phone,
    next.updated_at, patientId,
  ]);

  return getProfile(patientId);
}

/* ─── Vitaux ─────────────────────────────────────────────────── */

export async function getVitals(patientId, query) {
  const [rows] = query.type
    ? await pool.execute(
        'SELECT * FROM nova_vitals WHERE patient_id = ? AND type = ? ORDER BY measured_at DESC',
        [patientId, query.type]
      )
    : await pool.execute(
        'SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC',
        [patientId]
      );
  return rows.map(mapVital);
}

/* ─── Traitements ────────────────────────────────────────────── */

export async function getTreatments(patientId) {
  const [treatments] = await pool.execute(
    'SELECT * FROM nova_treatments WHERE patient_id = ? ORDER BY started_at DESC',
    [patientId]
  );
  if (!treatments.length) return [];
  const tIds = treatments.map(t => t.id);
  const [allMeds] = await pool.execute(
    `SELECT * FROM nova_medications WHERE treatment_id IN (${tIds.map(() => '?').join(',')})`,
    tIds
  );
  const medsByTreatment = new Map();
  for (const m of allMeds) {
    const list = medsByTreatment.get(m.treatment_id) || [];
    list.push(mapMedication(m));
    medsByTreatment.set(m.treatment_id, list);
  }
  return treatments.map(t => ({
    id: t.id,
    diagnosis: t.diagnosis,
    status: t.status,
    stage: t.stage,
    progress: t.progress,
    startedAt: t.started_at,
    doctorName: t.doctor_name,
    nextCheckupAt: t.next_checkup_at,
    medications: medsByTreatment.get(t.id) || [],
  }));
}

/* ─── Médicaments ────────────────────────────────────────────── */

export async function getMedicationToday(patientId) {
  const [schedules] = await pool.execute(
    'SELECT * FROM nova_medication_schedules WHERE patient_id = ? ORDER BY take_time ASC',
    [patientId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const [intakes] = await pool.execute(
    `SELECT schedule_id, status, taken_at FROM nova_medication_intakes
     WHERE patient_id = ? AND LEFT(taken_at, 10) = ?`,
    [patientId, today]
  );
  const intakeBySchedule = new Map(intakes.map((i) => [i.schedule_id, i]));

  return schedules.map((row) => ({
    id: row.id,
    medicationId: row.medication_id,
    name: row.name,
    dosage: row.dosage,
    time: row.take_time,
    period: row.period,
    color: row.color,
    interaction: Boolean(row.has_interaction),
    intake: intakeBySchedule.get(row.id) || null,
  }));
}

export async function createMedicationIntake(patientId, scheduleId, payload) {
  const [[schedule]] = await pool.execute(
    'SELECT id FROM nova_medication_schedules WHERE id = ? AND patient_id = ?',
    [scheduleId, patientId]
  );
  if (!schedule) {
    const err = new Error('Ce médicament ne vous appartient pas.');
    err.status = 403;
    throw err;
  }

  const now = new Date().toISOString();
  const takenAt = payload.takenAt || now;

  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_medication_intakes
     WHERE patient_id = ? AND schedule_id = ? AND LEFT(taken_at, 10) = LEFT(?, 10)`,
    [patientId, scheduleId, takenAt]
  );

  if (existing) {
    await pool.execute(
      'UPDATE nova_medication_intakes SET status = ?, taken_at = ? WHERE id = ?',
      [payload.status, takenAt, existing.id]
    );
    return { id: existing.id, patientId, scheduleId, status: payload.status, takenAt };
  }

  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_medication_intakes (id, patient_id, schedule_id, status, taken_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, patientId, scheduleId, payload.status, takenAt, now]
  );
  return { id, patientId, scheduleId, status: payload.status, takenAt };
}

/* ─── Rendez-vous ────────────────────────────────────────────── */

export async function getAppointments(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_appointments WHERE patient_id = ? ORDER BY starts_at ASC',
    [patientId]
  );
  return rows.map(mapAppointment);
}

export async function createAppointment(patientId, payload) {
  const [[doctor]] = await pool.execute(
    'SELECT id, first_name, last_name, specialty, city FROM nova_doctors WHERE id = ? AND is_available = 1',
    [payload.doctorId]
  );
  if (!doctor) {
    const err = new Error('Medecin indisponible ou introuvable.');
    err.status = 404;
    throw err;
  }
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status, doctor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.startsAt, `Dr. ${doctor.first_name} ${doctor.last_name}`,
     doctor.specialty || '', doctor.city || '', payload.mode || 'onsite', payload.status || 'requested', doctor.id]
  );
  return getAppointment(patientId, id);
}

export async function updateAppointment(patientId, id, changes) {
  const current = await getAppointment(patientId, id);
  if (!current) return null;
  await pool.execute(
    `UPDATE nova_appointments
     SET starts_at = ?, mode = ?, status = ?
     WHERE patient_id = ? AND id = ?`,
    [
      changes.startsAt   ?? current.startsAt,
      changes.mode       ?? current.mode,
      changes.status     ?? current.status,
      patientId, id,
    ]
  );
  return getAppointment(patientId, id);
}

export async function deleteAppointment(patientId, id) {
  await pool.execute(
    'DELETE FROM nova_appointments WHERE patient_id = ? AND id = ?', [patientId, id]
  );
}

/* ─── Vaccinations ───────────────────────────────────────────── */

export async function getVaccinations(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_vaccinations WHERE patient_id = ? ORDER BY injected_at DESC',
    [patientId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    injectedAt: row.injected_at,
    status: row.status,
    nextDueAt: row.next_due_at,
  }));
}

/* ─── Historique médical ─────────────────────────────────────── */

export async function getHistory(patientId, query = {}) {
  const pg = parsePagination(query);
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_medical_history WHERE patient_id = ?', [patientId]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM nova_medical_history WHERE patient_id = ? ORDER BY occurred_at DESC LIMIT ${pg.limit} OFFSET ${pg.offset}`,
    [patientId]
  );
  return paginatedResponse(rows.map((row) => ({
    id: row.id, type: row.type, title: row.title,
    occurredAt: row.occurred_at, doctorName: row.doctor_name,
  })), total, pg);
}

/* ─── Documents ──────────────────────────────────────────────── */

export async function getDocuments(patientId, query = {}) {
  const pg = parsePagination(query);
  const catFilter = query.category ? ' AND category = ?' : '';
  const catArgs = query.category ? [query.category] : [];

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM nova_documents WHERE patient_id = ?${catFilter}`,
    [patientId, ...catArgs]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM nova_documents WHERE patient_id = ?${catFilter} ORDER BY created_at DESC LIMIT ${pg.limit} OFFSET ${pg.offset}`,
    [patientId, ...catArgs]
  );
  return paginatedResponse(rows.map(mapDocument), total, pg);
}

export async function createDocument(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_documents (id, patient_id, title, category, mime_type, size_bytes, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.title, payload.category,
     payload.mimeType || 'application/pdf', payload.sizeBytes || 0,
     payload.filePath ? payload.filePath.replace(/\\/g, '/').replace(/^.*\/data\/uploads\//, '') : null, new Date().toISOString()]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_documents WHERE id = ?', [id]);
  return mapDocument(row);
}

export async function deleteDocument(patientId, id) {
  const [[doc]] = await pool.execute(
    'SELECT file_path FROM nova_documents WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!doc) { const err = new Error('Document introuvable'); err.status = 404; throw err; }
  await pool.execute(
    'DELETE FROM nova_documents WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (doc.file_path) {
    const { unlink } = await import('node:fs/promises');
    const { uploadDir: ud } = await import('../middleware/upload.js');
    const { join } = await import('node:path');
    await unlink(join(ud, doc.file_path)).catch(() => {});
  }
}

export async function getDocumentFile(patientId, id) {
  const [[doc]] = await pool.execute(
    'SELECT id, title, mime_type, file_path FROM nova_documents WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
  if (!doc || !doc.file_path) return null;

  const { uploadDir: ud } = await import('../middleware/upload.js');
  const { resolve, join, basename } = await import('node:path');
  const absolute = resolve(join(ud, doc.file_path));
  const root = resolve(ud);
  if (!absolute.startsWith(root)) {
    const err = new Error('Chemin document invalide.');
    err.status = 400;
    throw err;
  }

  return {
    path: absolute,
    mimeType: doc.mime_type || 'application/octet-stream',
    filename: basename(doc.file_path),
    title: doc.title,
  };
}

/* ─── Conversations & Messages ───────────────────────────────── */

export async function getConversations(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE patient_id = ? ORDER BY updated_at DESC',
    [patientId]
  );
  return rows.map(mapConversation);
}

export async function getConversation(patientId, conversationId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE patient_id = ? AND id = ?',
    [patientId, conversationId]
  );
  if (!row) return null;

  const [messages] = await pool.execute(
    'SELECT * FROM nova_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );

  return {
    ...mapConversation(row),
    messages: messages.map(mapMessage),
  };
}

export async function createMessage(patientId, conversationId, payload) {
  const [[conv]] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE patient_id = ? AND id = ?',
    [patientId, conversationId]
  );
  if (!conv) return null;

  const id = randomUUID();
  const now = new Date().toISOString();

  await pool.execute(
    `INSERT INTO nova_messages (id, conversation_id, sender_role, body, attachment_name, is_read, created_at)
     VALUES (?, ?, 'patient', ?, ?, 0, ?)`,
    [id, conversationId, payload.body, payload.attachmentName || null, now]
  );

  await pool.execute(
    `UPDATE nova_conversations
     SET last_message = ?, updated_at = ?
     WHERE id = ?`,
    [payload.body.slice(0, 120), now, conversationId]
  );

  return { id, conversationId, senderRole: 'patient', body: payload.body, isRead: false, createdAt: now };
}

export async function markConversationRead(patientId, conversationId) {
  const [[conv]] = await pool.execute(
    'SELECT id FROM nova_conversations WHERE patient_id = ? AND id = ?',
    [patientId, conversationId]
  );
  if (!conv) return null;

  await pool.execute(
    `UPDATE nova_messages SET is_read = 1
     WHERE conversation_id = ? AND sender_role = 'doctor' AND is_read = 0`,
    [conversationId]
  );
  await pool.execute(
    'UPDATE nova_conversations SET unread_count = 0 WHERE id = ?',
    [conversationId]
  );

  return { ok: true };
}

/* ─── Ordonnances ────────────────────────────────────────────── */

export async function getPrescriptions(patientId, query = {}) {
  const [rows] = query.status
    ? await pool.execute(
        'SELECT * FROM nova_prescriptions WHERE patient_id = ? AND status = ? ORDER BY issued_at DESC',
        [patientId, query.status]
      )
    : await pool.execute(
        'SELECT * FROM nova_prescriptions WHERE patient_id = ? ORDER BY issued_at DESC',
        [patientId]
      );

  if (!rows.length) return [];
  const pIds = rows.map(r => r.id);
  const [allItems] = await pool.execute(
    `SELECT * FROM nova_prescription_items WHERE prescription_id IN (${pIds.map(() => '?').join(',')})`,
    pIds
  );
  const itemsByPrescription = new Map();
  for (const i of allItems) {
    const list = itemsByPrescription.get(i.prescription_id) || [];
    list.push({ id: i.id, name: i.name, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions });
    itemsByPrescription.set(i.prescription_id, list);
  }
  return rows.map(row => ({
    id: row.id,
    doctorName: row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    status: row.status,
    notes: row.notes,
    items: itemsByPrescription.get(row.id) || [],
  }));
}

export async function getPrescription(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_prescriptions WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
  if (!row) return null;
  const [items] = await pool.execute(
    'SELECT * FROM nova_prescription_items WHERE prescription_id = ?',
    [id]
  );
  return {
    id: row.id,
    doctorName: row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    status: row.status,
    notes: row.notes,
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      instructions: i.instructions,
    })),
  };
}

/* ─── Vitaux (ajout manuel) ──────────────────────────────────── */

export async function addVital(patientId, payload) {
  const id = randomUUID();
  const now = payload.measuredAt || new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.type, payload.label, String(payload.value), payload.unit || '', now]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_vitals WHERE id = ?', [id]);
  return mapVital(row);
}

/* ─── Médecins ───────────────────────────────────────────────── */

export async function getDoctors(query = {}) {
  let sql = 'SELECT * FROM nova_doctors WHERE 1=1';
  const params = [];

  if (query.specialty) {
    sql += ' AND specialty = ?';
    params.push(query.specialty);
  }
  if (query.city) {
    sql += ' AND city LIKE ?';
    params.push(`%${query.city}%`);
  }
  if (query.q) {
    sql += ' AND (CONCAT(first_name," ",last_name) LIKE ? OR specialty LIKE ?)';
    params.push(`%${query.q}%`, `%${query.q}%`);
  }
  if (query.acceptsCmu === 'true') {
    sql += ' AND accepts_cmu = 1';
  }
  sql += ' ORDER BY rating DESC, reviews_count DESC';

  const [rows] = await pool.execute(sql, params);
  return rows.map(mapDoctor);
}

export async function getDoctor(id) {
  const [[row]] = await pool.execute('SELECT * FROM nova_doctors WHERE id = ?', [id]);
  if (!row) return null;
  return mapDoctor(row);
}

export async function getDoctorSlots(doctorId, query = {}) {
  let sql = 'SELECT * FROM nova_doctor_slots WHERE doctor_id = ? AND status = "available"';
  const params = [doctorId];

  if (query.date) {
    sql += ' AND slot_date = ?';
    params.push(query.date);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    sql += ' AND slot_date >= ?';
    params.push(today);
  }
  sql += ' ORDER BY slot_date ASC, slot_time ASC';

  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctor_id,
    date: r.slot_date,
    time: r.slot_time,
    status: r.status,
  }));
}

export async function bookSlot(patientId, slotId, doctorId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[slot]] = await conn.execute(
      'SELECT * FROM nova_doctor_slots WHERE id = ? AND doctor_id = ? AND status = "available" FOR UPDATE',
      [slotId, doctorId]
    );
    if (!slot) { await conn.rollback(); return null; }

    await conn.execute(
      'UPDATE nova_doctor_slots SET status = "booked", patient_id = ? WHERE id = ?',
      [patientId, slotId]
    );

    const [[doctor]] = await conn.execute('SELECT * FROM nova_doctors WHERE id = ?', [slot.doctor_id]);
    const apptId = randomUUID();
    const startsAt = `${slot.slot_date}T${slot.slot_time}:00.000Z`;

    await conn.execute(
      `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status, doctor_id)
       VALUES (?, ?, ?, ?, ?, ?, 'onsite', 'confirmed', ?)`,
      [apptId, patientId, startsAt,
       `Dr. ${doctor.first_name} ${doctor.last_name}`,
       doctor.specialty, doctor.city, doctorId]
    );

    await conn.commit();

    // Notifier le médecin
    const [[pat]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [patientId]);
    const dateStr = new Date(startsAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    notifyDoctorAppointment(slot.doctor_id, `${pat?.first_name || ''} ${pat?.last_name || ''}`, dateStr).catch(() => {});

    return { slotId, appointmentId: apptId, doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`, startsAt };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ─── Notifications ──────────────────────────────────────────── */

export async function getNotifications(patientId, query = {}) {
  const pg = parsePagination(query);
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_notifications WHERE patient_id = ?', [patientId]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM nova_notifications WHERE patient_id = ? ORDER BY created_at DESC LIMIT ${pg.limit} OFFSET ${pg.offset}`,
    [patientId]
  );
  return paginatedResponse(rows.map((r) => ({
    id: r.id, type: r.type, title: r.title, body: r.body,
    linkPage: r.link_page, isRead: Boolean(r.is_read), createdAt: r.created_at,
  })), total, pg);
}

export async function markNotificationRead(patientId, id) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
}

export async function markAllNotificationsRead(patientId) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE patient_id = ?',
    [patientId]
  );
}

/* ─── Résultats de laboratoire ───────────────────────────────── */

export async function getLabResults(patientId, query = {}) {
  const [rows] = query.status
    ? await pool.execute(
        'SELECT * FROM nova_lab_results WHERE patient_id = ? AND status = ? ORDER BY performed_at DESC',
        [patientId, query.status]
      )
    : await pool.execute(
        'SELECT * FROM nova_lab_results WHERE patient_id = ? ORDER BY performed_at DESC',
        [patientId]
      );

  if (!rows.length) return [];
  const lIds = rows.map(r => r.id);
  const [allItems] = await pool.execute(
    `SELECT * FROM nova_lab_result_items WHERE lab_result_id IN (${lIds.map(() => '?').join(',')}) ORDER BY id ASC`,
    lIds
  );
  const itemsByResult = new Map();
  for (const i of allItems) {
    const list = itemsByResult.get(i.lab_result_id) || [];
    list.push(mapLabResultItem(i));
    itemsByResult.set(i.lab_result_id, list);
  }
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    laboratoryName: row.lab_name,
    performedAt: row.performed_at,
    status: row.status,
    doctorName: row.ordered_by,
    items: itemsByResult.get(row.id) || [],
  }));
}

export async function getLabResult(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_lab_results WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
  if (!row) return null;
  const [items] = await pool.execute(
    'SELECT * FROM nova_lab_result_items WHERE lab_result_id = ? ORDER BY id ASC',
    [id]
  );
  return {
    id: row.id,
    title: row.title,
    laboratoryName: row.lab_name,
    performedAt: row.performed_at,
    status: row.status,
    doctorName: row.ordered_by,
    items: items.map(mapLabResultItem),
  };
}

/* ─── Profil médical ─────────────────────────────────────────── */

export async function getMedicalProfile(patientId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_medical_profile WHERE patient_id = ?', [patientId]
  );
  if (!row) return { allergies: [], chronicDiseases: [], familyHistory: [], surgicalHistory: [] };
  return {
    allergies:       JSON.parse(row.allergies       || '[]'),
    chronicDiseases: JSON.parse(row.chronic_diseases || '[]'),
    familyHistory:   JSON.parse(row.family_history   || '[]'),
    surgicalHistory: JSON.parse(row.surgical_history || '[]'),
    updatedAt:       row.updated_at,
  };
}

export async function updateMedicalProfile(patientId, changes) {
  const current = await getMedicalProfile(patientId);
  const next = {
    allergies:       changes.allergies       ?? current.allergies,
    chronicDiseases: changes.chronicDiseases ?? current.chronicDiseases,
    familyHistory:   changes.familyHistory   ?? current.familyHistory,
    surgicalHistory: changes.surgicalHistory ?? current.surgicalHistory,
  };
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_medical_profile (patient_id, allergies, chronic_diseases, family_history, surgical_history, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       allergies = VALUES(allergies),
       chronic_diseases = VALUES(chronic_diseases),
       family_history = VALUES(family_history),
       surgical_history = VALUES(surgical_history),
       updated_at = VALUES(updated_at)`,
    [patientId,
     JSON.stringify(next.allergies),
     JSON.stringify(next.chronicDiseases),
     JSON.stringify(next.familyHistory),
     JSON.stringify(next.surgicalHistory),
     now]
  );
  return { ...next, updatedAt: now };
}

/* ─── Notes ──────────────────────────────────────────────────── */

export async function getNotes(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_notes WHERE patient_id = ? ORDER BY pinned DESC, updated_at DESC',
    [patientId]
  );
  return rows.map(mapNote);
}

export async function createNote(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_notes (id, patient_id, title, content, color, pinned, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.title, payload.content || '',
     payload.color || 'amber', payload.pinned ? 1 : 0, new Date().toISOString()]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_notes WHERE id = ?', [id]);
  return mapNote(row);
}

export async function updateNote(patientId, id, changes) {
  const [[current]] = await pool.execute(
    'SELECT * FROM nova_notes WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!current) return null;
  await pool.execute(
    `UPDATE nova_notes SET title = ?, content = ?, color = ?, pinned = ?, updated_at = ?
     WHERE patient_id = ? AND id = ?`,
    [
      changes.title   ?? current.title,
      changes.content ?? current.content,
      changes.color   ?? current.color,
      changes.pinned === undefined ? current.pinned : (changes.pinned ? 1 : 0),
      new Date().toISOString(),
      patientId, id,
    ]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_notes WHERE id = ?', [id]);
  return mapNote(row);
}

export async function deleteNote(patientId, id) {
  await pool.execute(
    'DELETE FROM nova_notes WHERE patient_id = ? AND id = ?', [patientId, id]
  );
}

/* ─── Fiche Urgence ──────────────────────────────────────────── */

export async function getEmergencyCard(patientId) {
  const [[patient]] = await pool.execute('SELECT * FROM nova_patients WHERE id = ?', [patientId]);
  if (!patient) return null;

  const [[mpRow]] = await pool.execute('SELECT * FROM nova_medical_profile WHERE patient_id = ?', [patientId]);
  const mp = mpRow ? {
    allergies:       JSON.parse(mpRow.allergies       || '[]'),
    chronicDiseases: JSON.parse(mpRow.chronic_diseases || '[]'),
    surgicalHistory: JSON.parse(mpRow.surgical_history || '[]'),
  } : { allergies: [], chronicDiseases: [], surgicalHistory: [] };

  const [activeTreatments] = await pool.execute(
    `SELECT t.diagnosis, m.name, m.dosage FROM nova_treatments t
     JOIN nova_medications m ON m.treatment_id = t.id
     WHERE t.patient_id = ? AND t.status = 'active'`,
    [patientId]
  );

  return {
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    birthDate: patient.birth_date,
    sex: patient.sex,
    bloodType: patient.blood_type,
    phone: patient.phone,
    cmuNumber: patient.cmu_number,
    emergencyContact: {
      name: patient.emergency_name,
      relationship: patient.emergency_relationship,
      phone: patient.emergency_phone,
    },
    allergies:       mp.allergies,
    chronicDiseases: mp.chronicDiseases,
    surgicalHistory: mp.surgicalHistory,
    currentMedications: activeTreatments.map(r => ({ name: r.name, dosage: r.dosage, diagnosis: r.diagnosis })),
  };
}

/* ─── Wellness Goals ─────────────────────────────────────────── */

export async function getWellnessGoals(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_wellness_goals WHERE patient_id = ? ORDER BY completed ASC, created_at DESC',
    [patientId]
  );
  return rows.map(mapGoal);
}

export async function createWellnessGoal(patientId, payload) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_wellness_goals (id,patient_id,type,title,target,current_value,unit,icon,color,completed,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`,
    [id, patientId, payload.type, payload.title, payload.target,
     payload.currentValue ?? 0, payload.unit ?? '', payload.icon ?? 'Target',
     payload.color ?? 'emerald', now, now]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_wellness_goals WHERE id = ?', [id]);
  return mapGoal(row);
}

export async function updateWellnessGoal(patientId, id, changes) {
  const [[current]] = await pool.execute(
    'SELECT * FROM nova_wellness_goals WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!current) return null;
  const now = new Date().toISOString();
  const next = {
    current_value: changes.currentValue ?? current.current_value,
    completed:     changes.completed !== undefined ? (changes.completed ? 1 : 0) : current.completed,
    title:         changes.title     ?? current.title,
    target:        changes.target    ?? current.target,
  };
  await pool.execute(
    `UPDATE nova_wellness_goals SET current_value=?,completed=?,title=?,target=?,updated_at=? WHERE id=?`,
    [next.current_value, next.completed, next.title, next.target, now, id]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_wellness_goals WHERE id = ?', [id]);
  return mapGoal(row);
}

export async function deleteWellnessGoal(patientId, id) {
  await pool.execute('DELETE FROM nova_wellness_goals WHERE patient_id = ? AND id = ?', [patientId, id]);
}

/* ─── Paramètres ─────────────────────────────────────────────── */

export async function getSettings(patientId) {
  const [[row]] = await pool.execute(
    'SELECT settings_json FROM nova_patient_settings WHERE patient_id = ?', [patientId]
  );
  return row ? JSON.parse(row.settings_json) : {};
}

export async function updateSettings(patientId, changes) {
  const next = deepMerge(await getSettings(patientId), changes);
  await pool.execute(
    `INSERT INTO nova_patient_settings (patient_id, settings_json, updated_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_at = VALUES(updated_at)`,
    [patientId, JSON.stringify(next), new Date().toISOString()]
  );
  return next;
}

/* ─── Privées ────────────────────────────────────────────────── */

async function getAppointment(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_appointments WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  return row ? mapAppointment(row) : null;
}

async function getDashboardVitals(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 100',
    [patientId]
  );
  rows.reverse();
  const byType = new Map();

  for (const row of rows) {
    const vital = mapVital(row);
    const historyValue = vitalToHistoryValue(vital);
    const items = byType.get(vital.type) || [];
    items.push({ ...vital, historyValue });
    byType.set(vital.type, items);
  }

  return ['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature']
    .map((type) => {
      const history = byType.get(type) || [];
      const latest = history.at(-1);
      if (!latest) return null;
      return {
        id: latest.id,
        type: latest.type,
        label: latest.label,
        value: latest.value,
        unit: latest.unit,
        measuredAt: latest.measuredAt,
        status: getVitalStatus(latest),
        history: history
          .slice(-7)
          .map((p) => ({ value: p.historyValue, measuredAt: p.measuredAt }))
          .filter((p) => Number.isFinite(p.value)),
      };
    })
    .filter(Boolean);
}

async function calculateHealthScore(patientId, { latestVitals, todayMedications, nextAppointment }) {
  const vitalPenalty = latestVitals.reduce((total, v) => {
    if (v.status === 'critical') return total + 12;
    if (v.status === 'watch')    return total + 5;
    return total;
  }, 0);

  const missedMeds   = todayMedications.filter((m) => m.intake?.status === 'missed').length;
  const waitingMeds  = todayMedications.filter((m) => !m.intake).length;

  const [[{ total: dueVaccines }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM nova_vaccinations WHERE patient_id = ? AND status = 'due_soon'`,
    [patientId]
  );

  const score = 100
    - vitalPenalty
    - missedMeds * 4
    - waitingMeds * 2
    - Number(dueVaccines) * 3
    - (nextAppointment ? 0 : 4);

  return Math.max(0, Math.min(100, score));
}

/* ─── Mappers ────────────────────────────────────────────────── */

function mapPatient(row) {
  return {
    id: row.id,
    cmuNumber: row.cmu_number,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    sex: row.sex,
    bloodType: row.blood_type,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    emergencyContact: {
      name: row.emergency_name,
      relationship: row.emergency_relationship,
      phone: row.emergency_phone,
    },
  };
}

function mapVital(row) {
  const numeric = Number(row.value);
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    value: Number.isNaN(numeric) ? row.value : numeric,
    unit: row.unit,
    measuredAt: row.measured_at,
  };
}

function mapMedication(row) {
  return { id: row.id, name: row.name, dosage: row.dosage, frequency: row.frequency };
}

function mapAppointment(row) {
  return {
    id: row.id,
    startsAt: row.starts_at,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    location: row.location,
    mode: row.mode,
    status: row.status,
  };
}

function mapConversation(row) {
  return {
    id: row.id,
    doctorName: row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    unreadCount: row.unread_count,
    lastMessage: row.last_message,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role,
    body: row.body,
    attachmentName: row.attachment_name,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    filePath: row.file_path || null,
    createdAt: row.created_at,
  };
}

function mapGoal(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    target: Number(row.target),
    currentValue: Number(row.current_value),
    unit: row.unit,
    icon: row.icon,
    color: row.color,
    completed: Boolean(row.completed),
    progress: row.target > 0 ? Math.min(100, Math.round((Number(row.current_value) / Number(row.target)) * 100)) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDoctor(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `Dr. ${row.first_name} ${row.last_name}`,
    specialty: row.specialty,
    subSpecialty: row.sub_specialty,
    city: row.city,
    address: row.address,
    phone: row.phone,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    experienceYears: row.experience_years,
    languages: row.languages,
    bio: row.bio,
    avatarInitials: row.avatar_initials,
    avatarColor: row.avatar_color,
    consultationFee: row.consultation_fee,
    acceptsCmu: Boolean(row.accepts_cmu),
    isAvailable: Boolean(row.is_available),
  };
}

function mapLabResultItem(row) {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    unit: row.unit,
    referenceRange: row.ref_min != null && row.ref_max != null ? `${row.ref_min}-${row.ref_max}` : null,
    status: row.status,
  };
}

function mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    pinned: Boolean(row.pinned),
    updatedAt: row.updated_at,
  };
}

/* ─── Helpers ────────────────────────────────────────────────── */

function vitalToHistoryValue(vital) {
  if (vital.type === 'blood_pressure') return Number(String(vital.value).split('/')[0]);
  return Number(vital.value);
}

function getVitalStatus(vital) {
  const value = vitalToHistoryValue(vital);
  if (!Number.isFinite(value)) return 'normal';
  if (vital.type === 'blood_pressure') {
    if (value >= 160 || value <= 90)  return 'critical';
    if (value >= 140 || value <= 100) return 'watch';
  }
  if (vital.type === 'blood_glucose') {
    if (value >= 1.26 || value < 0.7)  return 'critical';
    if (value >= 1.1  || value < 0.8)  return 'watch';
  }
  if (vital.type === 'heart_rate') {
    if (value >= 120 || value <= 45)  return 'critical';
    if (value >= 100 || value <= 55)  return 'watch';
  }
  if (vital.type === 'temperature') {
    if (value >= 39   || value <= 35) return 'critical';
    if (value >= 37.8 || value <= 36) return 'watch';
  }
  return 'normal';
}

function deepMerge(target, source) {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    next[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(next[key] || {}, value)
      : value;
  }
  return next;
}

/* ─── Assurance ──────────────────────────────────────────────── */

export async function getInsurance(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_insurance WHERE patient_id = ? ORDER BY status DESC',
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    provider: r.provider,
    policyNumber: r.policy_number,
    holderName: r.holder_name,
    coverageType: r.coverage_type,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    status: r.status,
    reimbursementRate: r.reimbursement_rate,
    logoColor: r.logo_color,
  }));
}

/* ─── Pharmacies ─────────────────────────────────────────────── */

export async function getPharmacies(query = {}) {
  let sql = 'SELECT * FROM nova_pharmacies';
  const args = [];
  if (query.search) {
    sql += ' WHERE name LIKE ? OR city LIKE ? OR address LIKE ?';
    const s = `%${query.search}%`;
    args.push(s, s, s);
  }
  sql += ' ORDER BY is_duty DESC, is_open DESC, distance_km ASC';
  const [rows] = await pool.execute(sql, args);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    address: r.address,
    city: r.city,
    phone: r.phone,
    isOpen: Boolean(r.is_open),
    opensAt: r.opens_at,
    closesAt: r.closes_at,
    isDuty: Boolean(r.is_duty),
    distanceKm: r.distance_km,
  }));
}

export async function getPharmacyOrders(patientId) {
  const [rows] = await pool.execute(
    `SELECT po.*, ph.name AS pharmacy_name, ph.address AS pharmacy_address, ph.phone AS pharmacy_phone
     FROM nova_pharmacy_orders po
     JOIN nova_pharmacies ph ON ph.id = po.pharmacy_id
     WHERE po.patient_id = ?
     ORDER BY po.created_at DESC`,
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    pharmacyId: r.pharmacy_id,
    pharmacyName: r.pharmacy_name,
    pharmacyAddress: r.pharmacy_address,
    pharmacyPhone: r.pharmacy_phone,
    prescriptionId: r.prescription_id,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export async function createPharmacyOrder(patientId, payload) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_pharmacy_orders (id, patient_id, pharmacy_id, prescription_id, status, notes, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    [id, patientId, payload.pharmacyId, payload.prescriptionId || null, payload.notes || null, now]
  );
  const [[row]] = await pool.execute(
    `SELECT po.*, ph.name AS pharmacy_name, ph.address AS pharmacy_address, ph.phone AS pharmacy_phone
     FROM nova_pharmacy_orders po
     JOIN nova_pharmacies ph ON ph.id = po.pharmacy_id
     WHERE po.id = ?`,
    [id]
  );
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    pharmacyAddress: row.pharmacy_address,
    pharmacyPhone: row.pharmacy_phone,
    prescriptionId: row.prescription_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/* ═══════════════════════════════════════════════════════════════
   CONSENTEMENTS — accès dossier médical
   ═══════════════════════════════════════════════════════════════ */

export async function getConsents(patientId) {
  const [rows] = await pool.execute(
    `SELECT c.*, d.first_name, d.last_name, d.specialty
     FROM nova_consents c
     JOIN nova_doctors d ON d.id = c.doctor_id
     WHERE c.patient_id = ?
     ORDER BY c.requested_at DESC`,
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    doctorId: r.doctor_id,
    doctorName: `Dr. ${r.first_name} ${r.last_name}`,
    specialty: r.specialty,
    status: r.status,
    scope: typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope,
    requestedAt: r.requested_at,
    respondedAt: r.responded_at,
    expiresAt: r.expires_at,
  }));
}

export async function grantConsent(patientId, consentId) {
  const [[consent]] = await pool.execute(
    'SELECT id, status FROM nova_consents WHERE id = ? AND patient_id = ?',
    [consentId, patientId]
  );
  if (!consent) { const e = new Error('Consentement introuvable.'); e.status = 404; throw e; }
  if (consent.status === 'granted') return { id: consentId, status: 'granted', message: 'Déjà accordé.' };

  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await pool.execute(
    'UPDATE nova_consents SET status = ?, responded_at = NOW(), expires_at = ? WHERE id = ?',
    ['granted', expiresAt, consentId]
  );
  // Notifier le médecin
  const [[c]] = await pool.execute('SELECT doctor_id FROM nova_consents WHERE id = ?', [consentId]);
  const [[pat]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [patientId]);
  if (c?.doctor_id && pat) notifyDoctorConsent(c.doctor_id, `${pat.first_name} ${pat.last_name}`, true).catch(() => {});

  return { id: consentId, status: 'granted' };
}

export async function revokeConsent(patientId, consentId) {
  const [[consent]] = await pool.execute(
    'SELECT id FROM nova_consents WHERE id = ? AND patient_id = ?',
    [consentId, patientId]
  );
  if (!consent) { const e = new Error('Consentement introuvable.'); e.status = 404; throw e; }

  await pool.execute(
    'UPDATE nova_consents SET status = ?, responded_at = NOW() WHERE id = ?',
    ['revoked', consentId]
  );
  // Notifier le médecin
  const [[c]] = await pool.execute('SELECT doctor_id FROM nova_consents WHERE id = ?', [consentId]);
  const [[pat]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [patientId]);
  if (c?.doctor_id && pat) notifyDoctorConsent(c.doctor_id, `${pat.first_name} ${pat.last_name}`, false).catch(() => {});

  return { id: consentId, status: 'revoked' };
}

/* ═══════════════════════════════════════════════════════════════
   ACCESS LOGS — qui a consulté mon dossier
   ═══════════════════════════════════════════════════════════════ */

export async function getAccessLogs(patientId) {
  const [rows] = await pool.execute(
    `SELECT al.*, u.name AS accessor_name
     FROM nova_access_logs al
     LEFT JOIN nova_users u ON u.id = al.accessor_id
     WHERE al.patient_id = ?
     ORDER BY al.accessed_at DESC
     LIMIT 50`,
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    accessorName: r.accessor_name || 'Inconnu',
    accessorRole: r.accessor_role,
    dataAccessed: r.data_accessed,
    accessedAt: r.accessed_at,
  }));
}

/* ═══════════════════════════════════════════════════════════════
   DOSSIER FAMILIAL
   ═══════════════════════════════════════════════════════════════ */

export async function getFamilyMembers(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_family_members WHERE owner_patient_id = ? ORDER BY created_at DESC',
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    relationship: r.relationship,
    firstName: r.first_name,
    lastName: r.last_name,
    birthDate: r.birth_date,
    memberPatientId: r.member_patient_id,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export async function createFamilyMember(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_family_members (id, owner_patient_id, member_patient_id, relationship, first_name, last_name, birth_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.memberPatientId || null, payload.relationship,
     payload.firstName, payload.lastName, payload.birthDate || null, payload.notes || null]
  );
  return { id, ...payload };
}

export async function updateFamilyMember(patientId, memberId, payload) {
  const [[existing]] = await pool.execute(
    'SELECT id FROM nova_family_members WHERE id = ? AND owner_patient_id = ?',
    [memberId, patientId]
  );
  if (!existing) { const e = new Error('Membre introuvable.'); e.status = 404; throw e; }

  const sets = []; const vals = [];
  const fields = { firstName: 'first_name', lastName: 'last_name', relationship: 'relationship', birthDate: 'birth_date', notes: 'notes' };
  for (const [k, col] of Object.entries(fields)) {
    if (payload[k] !== undefined) { sets.push(`${col} = ?`); vals.push(payload[k]); }
  }
  if (!sets.length) return { id: memberId };
  vals.push(memberId);
  await pool.execute(`UPDATE nova_family_members SET ${sets.join(', ')} WHERE id = ?`, vals);
  return { id: memberId, ...payload };
}

export async function deleteFamilyMember(patientId, memberId) {
  const [[existing]] = await pool.execute(
    'SELECT id FROM nova_family_members WHERE id = ? AND owner_patient_id = ?',
    [memberId, patientId]
  );
  if (!existing) { const e = new Error('Membre introuvable.'); e.status = 404; throw e; }
  await pool.execute('DELETE FROM nova_family_members WHERE id = ?', [memberId]);
}

/* ═══════════════════════════════════════════════════════════════
   QR ORDONNANCE SÉCURISÉ (JWT signé)
   ═══════════════════════════════════════════════════════════════ */

export async function getPrescriptionQR(patientId, prescriptionId) {
  const [[rx]] = await pool.execute(
    'SELECT * FROM nova_prescriptions WHERE id = ? AND patient_id = ?',
    [prescriptionId, patientId]
  );
  if (!rx) return null;

  const JWT_SECRET = process.env.JWT_SECRET;
  // Sign a minimal payload — NO medical data in QR
  const qrToken = jwt.sign(
    { type: 'prescription', prescriptionId: rx.id, patientId, issuedAt: rx.issued_at, validUntil: rx.valid_until },
    JWT_SECRET,
    { expiresIn: '90d' }
  );

  const QRCode = (await import('qrcode')).default;
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'M', margin: 2, width: 300,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return {
    prescriptionId: rx.id,
    qr: qrDataUrl,
    token: qrToken,
    doctorName: rx.doctor_name,
    issuedAt: rx.issued_at,
    validUntil: rx.valid_until,
    status: rx.status,
  };
}
