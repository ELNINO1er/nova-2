import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../db/database.js';
import { sendOtp } from './auth.service.js';
import { notifyPatientConsultation, notifyPatientPrescription, notifyDoctorReferral } from './notification.service.js';
import { normalizeCiPhone } from '../utils/phone.js';

/* ─── Dashboard ──────────────────────────────────────────────── */

export async function getDoctorDashboard(doctorId) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  const [[doctor]]         = await pool.execute(`SELECT * FROM nova_doctors WHERE id = ?`, [doctorId]);
  const [todayAppts]       = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name, p.cmu_number, p.birth_date, p.blood_type
     FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ? AND a.starts_at LIKE ? ORDER BY a.starts_at ASC`,
    [doctorId, `${todayStr}%`]
  );
  const [[{ totalPatients }]] = await pool.execute(
    `SELECT COUNT(DISTINCT patient_id) AS totalPatients FROM nova_appointments WHERE doctor_id = ?`, [doctorId]
  );
  const [[{ monthCons }]] = await pool.execute(
    `SELECT COUNT(*) AS monthCons FROM nova_consultations WHERE doctor_id = ? AND started_at LIKE ?`,
    [doctorId, `${monthStr}%`]
  );
  const [[{ avgRating }]] = await pool.execute(
    `SELECT AVG(rating) AS avgRating FROM nova_doctor_reputation WHERE doctor_id = ?`, [doctorId]
  );
  // Recent consultations (5 dernières)
  const [recentCons] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name FROM nova_consultations c
     JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 5`,
    [doctorId]
  );

  return {
    doctor:             doctor ? mapDoctorProfile(doctor) : null,
    todayAppointments:  todayAppts.map(mapApptWithPatient),
    totalPatients,
    monthConsultations: monthCons,
    avgRating:          avgRating ? Number(avgRating).toFixed(1) : '—',
    recentConsultations: recentCons.map(r => ({
      id: r.id,
      patientName: `${r.first_name} ${r.last_name}`,
      diagnosisMain: r.diagnosis_main,
      status: r.status,
      startedAt: r.started_at,
    })),
  };
}

/* ─── Patients ───────────────────────────────────────────────── */

export async function getDoctorPatients(doctorId, query = {}) {
  let sql = `
    SELECT DISTINCT p.*
    FROM nova_patients p
    JOIN nova_appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ?`;
  const args = [doctorId];
  if (query.search) {
    sql += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.cmu_number LIKE ? OR p.phone LIKE ?)`;
    const s = `%${query.search}%`;
    args.push(s, s, s, s);
  }
  sql += ' ORDER BY p.last_name, p.first_name';
  const [rows] = await pool.execute(sql, args);
  return rows.map(mapPatientSummary);
}

export async function getDoctorPatient(doctorId, patientId) {
  const access = await hasDoctorPatientAccess(doctorId, patientId);
  if (!access) return null;

  const [[patient]] = await pool.execute(`SELECT * FROM nova_patients WHERE id = ?`, [patientId]);
  if (!patient) return null;

  const [[mp]] = await pool.execute(`SELECT * FROM nova_medical_profile WHERE patient_id = ?`, [patientId]);
  const [vitals] = await pool.execute(
    `SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 40`, [patientId]
  );
  const [consultations] = await pool.execute(
    `SELECT * FROM nova_consultations WHERE patient_id = ? AND doctor_id = ? ORDER BY started_at DESC LIMIT 10`,
    [patientId, doctorId]
  );
  const [prescriptions] = await pool.execute(
    `SELECT * FROM nova_prescriptions WHERE patient_id = ? ORDER BY issued_at DESC LIMIT 5`, [patientId]
  );
  const [labResults] = await pool.execute(
    `SELECT * FROM nova_lab_results WHERE patient_id = ? ORDER BY performed_at DESC LIMIT 5`, [patientId]
  );

  const mpData = mp ? {
    allergies:       safeJson(mp.allergies),
    chronicDiseases: safeJson(mp.chronic_diseases),
    familyHistory:   safeJson(mp.family_history),
    surgicalHistory: safeJson(mp.surgical_history),
  } : { allergies: [], chronicDiseases: [], familyHistory: [], surgicalHistory: [] };

  return {
    ...mapPatientFull(patient),
    medicalProfile: mpData,
    vitals: vitals.map(v => ({ id: v.id, type: v.type, label: v.label, value: v.value, unit: v.unit, measuredAt: v.measured_at })),
    consultations: consultations.map(c => ({
      id: c.id, motif: c.motif, diagnosisMain: c.diagnosis_main, notes: c.notes,
      recommendations: c.recommendations, status: c.status, startedAt: c.started_at,
    })),
    prescriptions: prescriptions.map(r => ({ id: r.id, issuedAt: r.issued_at, status: r.status })),
    labResults: labResults.map(r => ({ id: r.id, title: r.title, performedAt: r.performed_at, status: r.status })),
  };
}

/* ─── Rendez-vous ────────────────────────────────────────────── */

export async function getDoctorAppointments(doctorId, query = {}) {
  let sql = `
    SELECT a.*, p.first_name, p.last_name, p.cmu_number, p.birth_date, p.blood_type, p.phone
    FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id
    WHERE a.doctor_id = ?`;
  const args = [doctorId];
  if (query.date)   { sql += ' AND a.starts_at LIKE ?'; args.push(`${query.date}%`); }
  if (query.status) { sql += ' AND a.status = ?'; args.push(query.status); }
  sql += ' ORDER BY a.starts_at DESC';
  const [rows] = await pool.execute(sql, args);
  return rows.map(mapApptWithPatient);
}

export async function updateDoctorAppointment(doctorId, id, changes) {
  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_appointments WHERE id = ? AND doctor_id = ?`, [id, doctorId]
  );
  if (!existing) return null;
  const sets = []; const vals = [];
  if (changes.status)   { sets.push('status = ?');    vals.push(changes.status); }
  if (changes.startsAt) { sets.push('starts_at = ?'); vals.push(changes.startsAt); }
  if (changes.location) { sets.push('location = ?');  vals.push(changes.location); }
  if (!sets.length) return null;
  vals.push(id);
  vals.push(doctorId);
  await pool.execute(`UPDATE nova_appointments SET ${sets.join(', ')} WHERE id = ? AND doctor_id = ?`, vals);
  const [[row]] = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id WHERE a.id = ? AND a.doctor_id = ?`, [id, doctorId]
  );
  return mapApptWithPatient(row);
}

/* ─── Consultations ──────────────────────────────────────────── */

export async function getDoctorConsultations(doctorId) {
  const [rows] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name, p.cmu_number
     FROM nova_consultations c JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 50`,
    [doctorId]
  );
  return rows.map(r => ({
    id:                 r.id,
    patientId:          r.patient_id,
    patientName:        `${r.first_name} ${r.last_name}`,
    cmuNumber:          r.cmu_number,
    motif:              r.motif,
    diagnosisMain:      r.diagnosis_main,
    diagnosisSecondary: r.diagnosis_secondary,
    notes:              r.notes,
    recommendations:    r.recommendations,
    status:             r.status,
    startedAt:          r.started_at,
    completedAt:        r.completed_at,
  }));
}

/* ─── Créer un patient depuis l'espace médecin ───────────────── */

export async function createPatientByDoctor(doctorId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Vérifier que le téléphone n'existe pas déjà
    const phone = normalizeCiPhone(payload.phone);
    const [[existingUser]] = await conn.execute('SELECT id FROM nova_users WHERE phone = ?', [phone]);
    if (existingUser) {
      const err = new Error('Un compte avec ce numéro existe déjà.');
      err.status = 409;
      throw err;
    }

    // 2. Créer le patient
    const patientId = randomUUID();
    const now = new Date().toISOString();
    const cmuNumber = payload.cmuNumber || `CI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    await conn.execute(
      `INSERT INTO nova_patients (id, cmu_number, first_name, last_name, birth_date, sex, blood_type, phone, email, address, city, weight_kg, height_cm, emergency_name, emergency_relationship, emergency_phone, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, cmuNumber, payload.firstName, payload.lastName,
       payload.birthDate || null, payload.sex || null, payload.bloodType || null,
       phone, payload.email || null, payload.address || null, payload.city || 'Abidjan',
       payload.weightKg || null, payload.heightCm || null,
       payload.emergencyName || null, payload.emergencyRelationship || null, payload.emergencyPhone || null,
       now, now]
    );

    // 3. Créer le profil médical initial
    await conn.execute(
      `INSERT INTO nova_medical_profile (patient_id, allergies, chronic_diseases, family_history, surgical_history, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId,
       JSON.stringify(payload.allergies || []),
       JSON.stringify(payload.chronicDiseases || []),
       JSON.stringify([]),
       JSON.stringify([]),
       now]
    );

    // 4. Créer le user avec un code temporaire (sera remplacé par OTP)
    const userId = randomUUID();
    const tempCode = String(Math.floor(1000 + Math.random() * 9000));
    const codeHash = await bcrypt.hash(tempCode, 10);
    const avatar = `${(payload.firstName?.[0] || '').toUpperCase()}${(payload.lastName?.[0] || '').toUpperCase()}`;

    await conn.execute(
      `INSERT INTO nova_users (id, phone, code_hash, role, patient_id, name, avatar, created_at)
       VALUES (?, ?, ?, 'patient', ?, ?, ?, ?)`,
      [userId, phone, codeHash, patientId, `${payload.firstName} ${payload.lastName}`, avatar, now]
    );

    // 5. Créer un RDV initial pour lier docteur ↔ patient
    const apptId = randomUUID();
    const [[doctor]] = await conn.execute('SELECT first_name, last_name, specialty, city FROM nova_doctors WHERE id = ?', [doctorId]);
    const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Dr.';

    await conn.execute(
      `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status, doctor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'onsite', 'confirmed', ?, ?)`,
      [apptId, patientId, now, doctorName, doctor?.specialty || '', doctor?.city || '', doctorId, now]
    );

    await conn.commit();

    // 6. Envoyer OTP pour activation (hors transaction)
    const otpResult = await sendOtp(phone).catch(() => null);

    return {
      patientId,
      userId,
      cmuNumber,
      name: `${payload.firstName} ${payload.lastName}`,
      phone,
      otpSent: !!otpResult,
      ...(otpResult?.devCode ? { devCode: otpResult.devCode } : {}),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function verifyDoctorPatientRelation(doctorId, patientId) {
  const access = await hasDoctorPatientAccess(doctorId, patientId);
  if (!access) {
    const err = new Error('Aucune relation avec ce patient.');
    err.status = 403;
    throw err;
  }
}

async function hasDoctorPatientAccess(doctorId, patientId) {
  const [[consent]] = await pool.execute(
    `SELECT id FROM nova_consents
     WHERE doctor_id = ? AND patient_id = ? AND status = 'granted'
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [doctorId, patientId]
  );
  if (consent) return true;

  const [[clinicalRelation]] = await pool.execute(
    `SELECT id FROM (
       SELECT id FROM nova_consultations WHERE doctor_id = ? AND patient_id = ?
       UNION ALL
       SELECT id FROM nova_prescriptions WHERE doctor_id = ? AND patient_id = ?
       UNION ALL
       SELECT id FROM nova_lab_requests WHERE doctor_id = ? AND patient_id = ?
       UNION ALL
       SELECT id FROM nova_appointments WHERE doctor_id = ? AND patient_id = ? AND status <> 'cancelled'
     ) rel LIMIT 1`,
    [doctorId, patientId, doctorId, patientId, doctorId, patientId, doctorId, patientId]
  );
  return !!clinicalRelation;
}

export async function createConsultation(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  const id  = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_consultations
      (id,patient_id,doctor_id,motif,diagnosis_main,diagnosis_secondary,notes,recommendations,status,started_at,completed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, payload.patientId, doctorId,
     payload.motif || null, payload.diagnosisMain || null, payload.diagnosisSecondary || null,
     payload.notes || null, payload.recommendations || null,
     payload.status || 'completed', now, payload.status === 'draft' ? null : now]
  );
  const [[row]] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name FROM nova_consultations c
     JOIN nova_patients p ON p.id = c.patient_id WHERE c.id = ?`, [id]
  );
  const result = {
    id: row.id, patientId: row.patient_id,
    patientName: `${row.first_name} ${row.last_name}`,
    motif: row.motif, diagnosisMain: row.diagnosis_main,
    status: row.status, startedAt: row.started_at,
  };

  // Notifier le patient
  const [[doc]] = await pool.execute('SELECT first_name, last_name FROM nova_doctors WHERE id = ?', [doctorId]);
  notifyPatientConsultation(payload.patientId, `Dr. ${doc?.first_name || ''} ${doc?.last_name || ''}`, id).catch(() => {});

  return result;
}

export async function updateConsultation(doctorId, id, changes) {
  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_consultations WHERE id = ? AND doctor_id = ?`, [id, doctorId]
  );
  if (!existing) return null;
  const sets = []; const vals = [];
  const fields = ['motif','diagnosis_main','diagnosis_secondary','notes','recommendations','status'];
  const map    = { motif:'motif', diagnosisMain:'diagnosis_main', diagnosisSecondary:'diagnosis_secondary', notes:'notes', recommendations:'recommendations', status:'status' };
  for (const [k, col] of Object.entries(map)) {
    if (changes[k] !== undefined) { sets.push(`${col} = ?`); vals.push(changes[k]); }
  }
  if (!sets.length) return null;
  vals.push(id);
  await pool.execute(`UPDATE nova_consultations SET ${sets.join(', ')} WHERE id = ?`, vals);
  return { id, ...changes };
}

/* ─── Statistiques ───────────────────────────────────────────── */

export async function getDoctorStats(doctorId) {
  const [[{ totalPatients }]] = await pool.execute(
    `SELECT COUNT(DISTINCT patient_id) AS totalPatients FROM nova_appointments WHERE doctor_id = ?`, [doctorId]
  );
  const [[{ totalConsultations }]] = await pool.execute(
    `SELECT COUNT(*) AS totalConsultations FROM nova_consultations WHERE doctor_id = ?`, [doctorId]
  );
  const [[{ avgRating, ratingCount }]] = await pool.execute(
    `SELECT AVG(rating) AS avgRating, COUNT(*) AS ratingCount FROM nova_doctor_reputation WHERE doctor_id = ?`, [doctorId]
  );
  const [diagnoses] = await pool.execute(
    `SELECT diagnosis_main AS name, COUNT(*) AS count
     FROM nova_consultations WHERE doctor_id = ? AND diagnosis_main IS NOT NULL
     GROUP BY diagnosis_main ORDER BY count DESC LIMIT 6`,
    [doctorId]
  );
  const [monthlyData] = await pool.execute(
    `SELECT SUBSTR(started_at,1,7) AS month, COUNT(*) AS count
     FROM nova_consultations WHERE doctor_id = ? GROUP BY month ORDER BY month DESC LIMIT 6`,
    [doctorId]
  );
  const [ratings] = await pool.execute(
    `SELECT rating, comment, created_at FROM nova_doctor_reputation WHERE doctor_id = ? ORDER BY created_at DESC LIMIT 5`,
    [doctorId]
  );
  return {
    totalPatients,
    totalConsultations,
    avgRating:   avgRating ? Number(avgRating).toFixed(1) : '—',
    ratingCount: ratingCount || 0,
    diagnoses,
    monthlyData: monthlyData.reverse(),
    ratings: ratings.map(r => ({ rating: r.rating, comment: r.comment, createdAt: r.created_at })),
  };
}

/* ─── Profil médecin ─────────────────────────────────────────── */

export async function getDoctorProfile(doctorId) {
  const [[doc]] = await pool.execute(`SELECT * FROM nova_doctors WHERE id = ?`, [doctorId]);
  return doc ? mapDoctorProfile(doc) : null;
}

/* ─── Mappers ────────────────────────────────────────────────── */

function mapDoctorProfile(r) {
  return {
    id:               r.id,
    firstName:        r.first_name,
    lastName:         r.last_name,
    specialty:        r.specialty,
    subSpecialty:     r.sub_specialty,
    city:             r.city,
    address:          r.address,
    phone:            r.phone,
    email:            r.email,
    rating:           r.rating,
    reviewsCount:     r.reviews_count,
    experienceYears:  r.experience_years,
    languages:        r.languages,
    bio:              r.bio,
    avatarInitials:   r.avatar_initials,
    avatarColor:      r.avatar_color,
    consultationFee:  r.consultation_fee,
    acceptsCmu:       Boolean(r.accepts_cmu),
  };
}

function mapApptWithPatient(r) {
  const birth = r.birth_date ? new Date(r.birth_date) : null;
  const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
  return {
    id:          r.id,
    startsAt:    r.starts_at,
    patientId:   r.patient_id,
    patientName: `${r.first_name} ${r.last_name}`,
    cmuNumber:   r.cmu_number,
    bloodType:   r.blood_type,
    age,
    phone:       r.phone || null,
    specialty:   r.specialty,
    location:    r.location,
    mode:        r.mode,
    status:      r.status,
  };
}

function mapPatientSummary(r) {
  const birth = r.birth_date ? new Date(r.birth_date) : null;
  const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
  return {
    id:        r.id,
    firstName: r.first_name,
    lastName:  r.last_name,
    cmuNumber: r.cmu_number,
    phone:     r.phone,
    bloodType: r.blood_type,
    age,
  };
}

function mapPatientFull(r) {
  const birth = r.birth_date ? new Date(r.birth_date) : null;
  const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
  return {
    id:          r.id,
    firstName:   r.first_name,
    lastName:    r.last_name,
    cmuNumber:   r.cmu_number,
    birthDate:   r.birth_date,
    sex:         r.sex,
    bloodType:   r.blood_type,
    phone:       r.phone,
    email:       r.email,
    address:     r.address,
    city:        r.city,
    weightKg:    r.weight_kg,
    heightCm:    r.height_cm,
    emergencyName:  r.emergency_name,
    emergencyPhone: r.emergency_phone,
    age,
  };
}

function safeJson(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

/* ─── Ordonnances (médecin) ──────────────────────────────────── */

export async function getDoctorPrescriptions(doctorId) {
  const [rows] = await pool.execute(
    `SELECT p.*, pat.first_name, pat.last_name, pat.cmu_number,
            (SELECT COUNT(*) FROM nova_prescription_items pi WHERE pi.prescription_id = p.id) AS items_count
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.doctor_id = ?
     ORDER BY p.issued_at DESC LIMIT 50`,
    [doctorId]
  );
  return rows.map(r => ({
    id:          r.id,
    patientId:   r.patient_id,
    patientName: `${r.first_name} ${r.last_name}`,
    cmuNumber:   r.cmu_number,
    issuedAt:    r.issued_at,
    validUntil:  r.valid_until,
    status:      r.status,
    notes:       r.notes,
    itemsCount:  Number(r.items_count),
  }));
}

export async function getDoctorPrescription(doctorId, prescriptionId) {
  const [[row]] = await pool.execute(
    `SELECT p.*, pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_prescriptions p JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.id = ? AND p.doctor_id = ?`,
    [prescriptionId, doctorId]
  );
  if (!row) return null;
  const [items] = await pool.execute(
    `SELECT * FROM nova_prescription_items WHERE prescription_id = ?`, [prescriptionId]
  );
  return {
    id:              row.id,
    patientId:       row.patient_id,
    patientName:     `${row.first_name} ${row.last_name}`,
    cmuNumber:       row.cmu_number,
    doctorName:      row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    issuedAt:        row.issued_at,
    validUntil:      row.valid_until,
    status:          row.status,
    notes:           row.notes,
    items: items.map(i => ({ id: i.id, name: i.name, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions })),
  };
}

export async function createDoctorPrescription(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[doc]] = await conn.execute(`SELECT first_name, last_name, specialty FROM nova_doctors WHERE id = ?`, [doctorId]);
    const doctorName = doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Dr. —';
    const specialty  = doc?.specialty || '';
    const id  = randomUUID();
    const now = new Date().toISOString();
    const validUntil = payload.validDays
      ? new Date(Date.now() + Number(payload.validDays) * 86400000).toISOString().slice(0, 10)
      : null;
    await conn.execute(
      `INSERT INTO nova_prescriptions (id, patient_id, doctor_name, doctor_specialty, issued_at, valid_until, status, notes, doctor_id)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, payload.patientId, doctorName, specialty, now, validUntil, payload.notes || null, doctorId]
    );
    if (payload.items?.length) {
      const values = payload.items.map(item =>
        [randomUUID(), id, item.name, item.dosage || null, item.frequency || null, item.duration || null, item.instructions || null]
      );
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      await conn.execute(
        `INSERT INTO nova_prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions) VALUES ${placeholders}`,
        values.flat()
      );
    }
    await conn.commit();
    const [[row]] = await pool.execute(
      `SELECT p.*, pat.first_name, pat.last_name FROM nova_prescriptions p
       JOIN nova_patients pat ON pat.id = p.patient_id WHERE p.id = ?`, [id]
    );
    // Notifier le patient
    notifyPatientPrescription(row.patient_id, doctorName).catch(() => {});

    return { id, patientId: row.patient_id, patientName: `${row.first_name} ${row.last_name}`, issuedAt: row.issued_at, status: row.status };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ─── Demandes d'analyses ────────────────────────────────────── */

export async function getDoctorLabRequests(doctorId) {
  const [rows] = await pool.execute(
    `SELECT lr.*, pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_lab_requests lr JOIN nova_patients pat ON pat.id = lr.patient_id
     WHERE lr.doctor_id = ? ORDER BY lr.requested_at DESC LIMIT 50`,
    [doctorId]
  );
  return rows.map(r => ({
    id:             r.id,
    patientId:      r.patient_id,
    patientName:    `${r.first_name} ${r.last_name}`,
    cmuNumber:      r.cmu_number,
    type:           r.type,
    title:          r.title,
    notes:          r.notes,
    status:         r.status,
    consultationId: r.consultation_id,
    requestedAt:    r.requested_at,
  }));
}

/* ─── Suivi chroniques ───────────────────────────────────────── */

export async function getChronicPatients(doctorId) {
  // Patients avec maladies chroniques dans leur profil médical
  const [rows] = await pool.execute(
    `SELECT DISTINCT p.*, mp.chronic_diseases, mp.allergies,
            (SELECT c.started_at FROM nova_consultations c WHERE c.patient_id = p.id AND c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 1) AS last_consult,
            (SELECT c.diagnosis_main FROM nova_consultations c WHERE c.patient_id = p.id AND c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 1) AS last_diagnosis
     FROM nova_patients p
     JOIN nova_appointments a ON a.patient_id = p.id AND a.doctor_id = ?
     LEFT JOIN nova_medical_profile mp ON mp.patient_id = p.id
     WHERE mp.chronic_diseases IS NOT NULL AND mp.chronic_diseases != '[]'
     ORDER BY last_consult ASC`,
    [doctorId, doctorId, doctorId]
  );
  return rows.map(r => {
    const birth = r.birth_date ? new Date(r.birth_date) : null;
    const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
    const chronic = safeJson(r.chronic_diseases);
    const daysSince = r.last_consult
      ? Math.floor((Date.now() - new Date(r.last_consult).getTime()) / 86400000)
      : null;
    const risk = !r.last_consult ? 'high'
      : daysSince > 180 ? 'high'
      : daysSince > 90  ? 'medium'
      : 'low';
    return {
      id:           r.id,
      firstName:    r.first_name,
      lastName:     r.last_name,
      cmuNumber:    r.cmu_number,
      phone:        r.phone,
      age,
      bloodType:    r.blood_type,
      chronicDiseases: chronic,
      allergies:    safeJson(r.allergies),
      lastConsult:  r.last_consult || null,
      lastDiagnosis:r.last_diagnosis || null,
      daysSince,
      risk,
    };
  });
}

/* ─── Alertes docteur ────────────────────────────────────────── */

export async function getDoctorAlerts(doctorId) {
  const [rows] = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name, p.cmu_number
     FROM nova_doctor_alerts a
     JOIN nova_patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ? ORDER BY a.created_at DESC LIMIT 50`,
    [doctorId]
  );
  return rows.map(r => ({
    id:          r.id,
    patientId:   r.patient_id,
    patientName: `${r.first_name} ${r.last_name}`,
    cmuNumber:   r.cmu_number,
    type:        r.type,
    level:       r.level,
    title:       r.title,
    body:        r.body,
    status:      r.status,
    createdAt:   r.created_at,
    resolvedAt:  r.resolved_at,
  }));
}

export async function createDoctorAlert(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  const id  = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_doctor_alerts (id, doctor_id, patient_id, type, level, title, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [id, doctorId, payload.patientId, payload.type, payload.level || 'warning', payload.title, payload.body || null, now]
  );
  return { id, ...payload, status: 'open', createdAt: now };
}

export async function resolveDoctorAlert(doctorId, alertId) {
  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_doctor_alerts WHERE id = ? AND doctor_id = ?`, [alertId, doctorId]
  );
  if (!existing) return null;
  const now = new Date().toISOString();
  await pool.execute(
    `UPDATE nova_doctor_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?`, [now, alertId]
  );
  return { id: alertId, status: 'resolved', resolvedAt: now };
}

/* ─── Finances (estimations) ─────────────────────────────────── */

export async function getDoctorFinances(doctorId) {
  const [[doc]] = await pool.execute(
    `SELECT consultation_fee, accepts_cmu FROM nova_doctors WHERE id = ?`, [doctorId]
  );
  const fee = doc?.consultation_fee || 15000;

  const [monthly] = await pool.execute(
    `SELECT SUBSTR(started_at,1,7) AS month, COUNT(*) AS count
     FROM nova_consultations WHERE doctor_id = ? AND status = 'completed'
     GROUP BY month ORDER BY month DESC LIMIT 12`,
    [doctorId]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM nova_consultations WHERE doctor_id = ? AND status = 'completed'`,
    [doctorId]
  );

  const month = new Date().toISOString().slice(0, 7);
  const [[{ monthCount }]] = await pool.execute(
    `SELECT COUNT(*) AS monthCount FROM nova_consultations
     WHERE doctor_id = ? AND started_at LIKE ? AND status = 'completed'`,
    [doctorId, `${month}%`]
  );

  const [[{ activePrescriptions }]] = await pool.execute(
    `SELECT COUNT(*) AS activePrescriptions FROM nova_prescriptions WHERE doctor_id = ? AND status = 'active'`,
    [doctorId]
  );

  return {
    consultationFee:       fee,
    totalConsultations:    total,
    monthConsultations:    monthCount,
    estimatedMonthRevenue: monthCount * fee,
    estimatedTotalRevenue: total * fee,
    activePrescriptions,
    monthlyData: monthly.reverse().map(r => ({
      month:   r.month,
      count:   r.count,
      revenue: r.count * fee,
    })),
  };
}

/* ─── Réputation complète ────────────────────────────────────── */

export async function getDoctorFullReputation(doctorId) {
  const [[agg]] = await pool.execute(
    `SELECT AVG(rating) AS avgRating, COUNT(*) AS total FROM nova_doctor_reputation WHERE doctor_id = ?`,
    [doctorId]
  );
  const [dist] = await pool.execute(
    `SELECT ROUND(rating) AS star, COUNT(*) AS count
     FROM nova_doctor_reputation WHERE doctor_id = ?
     GROUP BY star ORDER BY star DESC`,
    [doctorId]
  );
  const [ratings] = await pool.execute(
    `SELECT r.rating, r.comment, r.created_at, p.first_name, p.last_name
     FROM nova_doctor_reputation r
     JOIN nova_patients p ON p.id = r.patient_id
     WHERE r.doctor_id = ? ORDER BY r.created_at DESC`,
    [doctorId]
  );
  return {
    avgRating:    agg.avgRating ? Number(agg.avgRating).toFixed(1) : '—',
    total:        agg.total || 0,
    distribution: [5, 4, 3, 2, 1].map(s => ({
      star:  s,
      count: Number(dist.find(d => Number(d.star) === s)?.count || 0),
    })),
    ratings: ratings.map(r => ({
      rating:      r.rating,
      comment:     r.comment,
      createdAt:   r.created_at,
      patientName: `${r.first_name?.[0] || 'A'}. ${r.last_name || 'Patient'}`,
    })),
  };
}

/* ─── Signature électronique ─────────────────────────────────── */

export async function getDoctorSignatureData(doctorId) {
  const [[doc]] = await pool.execute(
    `SELECT signature_data FROM nova_doctors WHERE id = ?`, [doctorId]
  );
  return { signatureData: doc?.signature_data || null };
}

export async function saveDoctorSignatureData(doctorId, signatureData) {
  await pool.execute(
    `UPDATE nova_doctors SET signature_data = ? WHERE id = ?`, [signatureData, doctorId]
  );
  return { ok: true };
}

export async function createDoctorLabRequest(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  const id  = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_lab_requests (id, patient_id, doctor_id, consultation_id, type, title, notes, status, requested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, payload.patientId, doctorId, payload.consultationId || null, payload.type, payload.title, payload.notes || null, now]
  );
  const [[row]] = await pool.execute(
    `SELECT lr.*, pat.first_name, pat.last_name FROM nova_lab_requests lr
     JOIN nova_patients pat ON pat.id = lr.patient_id WHERE lr.id = ?`, [id]
  );
  return { id, patientName: `${row.first_name} ${row.last_name}`, type: row.type, title: row.title, status: row.status };
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATES CONSULTATION
   ═══════════════════════════════════════════════════════════════ */

export async function getConsultationTemplates(doctorId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_consultation_templates WHERE doctor_id = ? ORDER BY is_default DESC, name ASC',
    [doctorId]
  );
  return rows.map(r => ({
    id: r.id, name: r.name, specialty: r.specialty,
    motif: r.motif, diagnosisMain: r.diagnosis_main,
    notes: r.notes, recommendations: r.recommendations,
    isDefault: Boolean(r.is_default), createdAt: r.created_at,
  }));
}

export async function createConsultationTemplate(doctorId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_consultation_templates (id, doctor_id, name, specialty, motif, diagnosis_main, notes, recommendations, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, doctorId, payload.name, payload.specialty || null,
     payload.motif || null, payload.diagnosisMain || null,
     payload.notes || null, payload.recommendations || null,
     payload.isDefault ? 1 : 0]
  );
  return { id, ...payload };
}

export async function deleteConsultationTemplate(doctorId, templateId) {
  const [[t]] = await pool.execute(
    'SELECT id FROM nova_consultation_templates WHERE id = ? AND doctor_id = ?', [templateId, doctorId]
  );
  if (!t) { const e = new Error('Template introuvable.'); e.status = 404; throw e; }
  await pool.execute('DELETE FROM nova_consultation_templates WHERE id = ?', [templateId]);
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATES ORDONNANCE
   ═══════════════════════════════════════════════════════════════ */

export async function getPrescriptionTemplates(doctorId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_prescription_templates WHERE doctor_id = ? ORDER BY name ASC',
    [doctorId]
  );
  return rows.map(r => ({
    id: r.id, name: r.name,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
    notes: r.notes, createdAt: r.created_at,
  }));
}

export async function createPrescriptionTemplate(doctorId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_prescription_templates (id, doctor_id, name, items, notes) VALUES (?, ?, ?, ?, ?)`,
    [id, doctorId, payload.name, JSON.stringify(payload.items), payload.notes || null]
  );
  return { id, ...payload };
}

export async function deletePrescriptionTemplate(doctorId, templateId) {
  const [[t]] = await pool.execute(
    'SELECT id FROM nova_prescription_templates WHERE id = ? AND doctor_id = ?', [templateId, doctorId]
  );
  if (!t) { const e = new Error('Template introuvable.'); e.status = 404; throw e; }
  await pool.execute('DELETE FROM nova_prescription_templates WHERE id = ?', [templateId]);
}

/* ═══════════════════════════════════════════════════════════════
   TRANSFERT PATIENT VERS SPÉCIALISTE
   ═══════════════════════════════════════════════════════════════ */

export async function createReferral(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);

  const id = randomUUID();
  const sharedData = payload.sharedData || ['profile', 'vitals', 'consultations'];
  await pool.execute(
    `INSERT INTO nova_referrals (id, from_doctor_id, to_doctor_id, patient_id, reason, urgency, notes, shared_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, doctorId, payload.toDoctorId, payload.patientId,
     payload.reason, payload.urgency || 'medium', payload.notes || null,
     JSON.stringify(sharedData)]
  );

  // Notification au médecin destinataire
  const [[fromDoc]] = await pool.execute('SELECT first_name, last_name FROM nova_doctors WHERE id = ?', [doctorId]);
  const [[toDocUser]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [payload.toDoctorId]);
  if (toDocUser) {
    await pool.execute(
      `INSERT INTO nova_notifications (id, patient_id, type, title, body, link_page, created_at)
       VALUES (?, ?, 'referral', ?, ?, 'patients', NOW())`,
      [randomUUID(), payload.patientId,
       'Transfert de patient',
       `Dr. ${fromDoc?.first_name || ''} ${fromDoc?.last_name || ''} vous transfère un patient. Motif : ${payload.reason}`]
    );
  }

  return { id, status: 'pending' };
}

export async function getReferrals(doctorId) {
  const [sent] = await pool.execute(
    `SELECT r.*, p.first_name AS p_fn, p.last_name AS p_ln,
            d.first_name AS d_fn, d.last_name AS d_ln, d.specialty AS d_spec
     FROM nova_referrals r
     JOIN nova_patients p ON p.id = r.patient_id
     JOIN nova_doctors d ON d.id = r.to_doctor_id
     WHERE r.from_doctor_id = ? ORDER BY r.created_at DESC LIMIT 30`,
    [doctorId]
  );
  const [received] = await pool.execute(
    `SELECT r.*, p.first_name AS p_fn, p.last_name AS p_ln,
            d.first_name AS d_fn, d.last_name AS d_ln, d.specialty AS d_spec
     FROM nova_referrals r
     JOIN nova_patients p ON p.id = r.patient_id
     JOIN nova_doctors d ON d.id = r.from_doctor_id
     WHERE r.to_doctor_id = ? ORDER BY r.created_at DESC LIMIT 30`,
    [doctorId]
  );

  const map = r => ({
    id: r.id, patientName: `${r.p_fn} ${r.p_ln}`, patientId: r.patient_id,
    doctorName: `Dr. ${r.d_fn} ${r.d_ln}`, doctorSpecialty: r.d_spec,
    reason: r.reason, urgency: r.urgency, notes: r.notes,
    sharedData: typeof r.shared_data === 'string' ? JSON.parse(r.shared_data) : r.shared_data,
    status: r.status, createdAt: r.created_at, respondedAt: r.responded_at,
  });

  return { sent: sent.map(map), received: received.map(map) };
}

export async function respondReferral(doctorId, referralId, accept) {
  const [[ref]] = await pool.execute(
    'SELECT * FROM nova_referrals WHERE id = ? AND to_doctor_id = ? AND status = ?',
    [referralId, doctorId, 'pending']
  );
  if (!ref) { const e = new Error('Transfert introuvable.'); e.status = 404; throw e; }

  const status = accept ? 'accepted' : 'declined';
  await pool.execute(
    'UPDATE nova_referrals SET status = ?, responded_at = NOW() WHERE id = ?',
    [status, referralId]
  );

  // Si accepté, créer un RDV initial pour lier le nouveau médecin au patient
  if (accept) {
    const [[doc]] = await pool.execute('SELECT first_name, last_name, specialty, city FROM nova_doctors WHERE id = ?', [doctorId]);
    await pool.execute(
      `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status, doctor_id, created_at)
       VALUES (?, ?, NOW(), ?, ?, ?, 'onsite', 'confirmed', ?, NOW())`,
      [randomUUID(), ref.patient_id, `Dr. ${doc.first_name} ${doc.last_name}`,
       doc.specialty, doc.city || '', doctorId]
    );
  }

  // Notifier le médecin d'origine
  const [[toDoc]] = await pool.execute('SELECT first_name, last_name FROM nova_doctors WHERE id = ?', [doctorId]);
  const [[patRow]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [ref.patient_id]);
  notifyDoctorReferral(ref.from_doctor_id, `${toDoc?.first_name || ''} ${toDoc?.last_name || ''}`, `${patRow?.first_name || ''} ${patRow?.last_name || ''}`, accept).catch(() => {});

  return { id: referralId, status };
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTES VITALES — ajoutées par le médecin
   ═══════════════════════════════════════════════════════════════ */

export async function addVitalByDoctor(doctorId, patientId, payload) {
  await verifyDoctorPatientRelation(doctorId, patientId);

  const id = randomUUID();
  const now = payload.measuredAt || new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.type, payload.label || payload.type, String(payload.value), payload.unit || '', now]
  );
  return { id, patientId, type: payload.type, value: payload.value, unit: payload.unit, measuredAt: now };
}

// ── Doctor Conversations ──────────────────────────
export async function getDoctorConversations(doctorId) {
  const [rows] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name
     FROM nova_conversations c
     JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ?
     ORDER BY c.updated_at DESC`,
    [doctorId]
  );
  return rows.map(r => ({
    id: r.id, patientId: r.patient_id,
    doctorName: r.doctor_name, doctorSpecialty: r.doctor_specialty,
    patientName: `${r.first_name} ${r.last_name}`,
    unreadCount: r.unread_count, lastMessage: r.last_message,
    updatedAt: r.updated_at,
  }));
}

export async function getDoctorConversation(doctorId, convId) {
  const [[conv]] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE id = ? AND doctor_id = ?', [convId, doctorId]
  );
  if (!conv) throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
  const [messages] = await pool.execute(
    'SELECT * FROM nova_messages WHERE conversation_id = ? ORDER BY created_at ASC', [convId]
  );
  return {
    id: conv.id, patientId: conv.patient_id,
    doctorName: conv.doctor_name, doctorSpecialty: conv.doctor_specialty,
    messages: messages.map(m => ({
      id: m.id, senderRole: m.sender_role, body: m.body,
      attachmentName: m.attachment_name, isRead: !!m.is_read, createdAt: m.created_at,
    })),
  };
}

export async function createDoctorMessage(doctorId, convId, { body }) {
  const [[conv]] = await pool.execute(
    'SELECT id FROM nova_conversations WHERE id = ? AND doctor_id = ?', [convId, doctorId]
  );
  if (!conv) throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO nova_messages (id, conversation_id, sender_role, body, is_read, created_at) VALUES (?,?,?,?,0,?)',
    [id, convId, 'doctor', body, now]
  );
  await pool.execute(
    'UPDATE nova_conversations SET last_message = ?, unread_count = unread_count + 1, updated_at = ? WHERE id = ?',
    [body, now, convId]
  );
  return { id, conversationId: convId, senderRole: 'doctor', body, createdAt: now };
}

export async function markDoctorConversationRead(doctorId, convId) {
  const [[conv]] = await pool.execute(
    'SELECT id FROM nova_conversations WHERE id = ? AND doctor_id = ?', [convId, doctorId]
  );
  if (!conv) throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
  await pool.execute('UPDATE nova_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = ?', [convId, 'patient']);
  await pool.execute('UPDATE nova_conversations SET unread_count = 0 WHERE id = ?', [convId]);
  return { ok: true };
}

// ── Doctor Documents ──────────────────────────────
export async function getDoctorDocuments(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_user_documents WHERE owner_user_id = ? AND owner_role = ? ORDER BY created_at DESC',
    [userId, 'doctor']
  );
  return rows.map(r => ({
    id: r.id, title: r.title, category: r.category,
    mimeType: r.mime_type, sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  }));
}

export async function createDoctorDocument(userId, body, file) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO nova_user_documents (id, owner_user_id, owner_role, title, category, mime_type, size_bytes, file_path, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, userId, 'doctor', body.title || file.originalname, body.category || 'other', file.mimetype, file.size, file.path, now]
  );
  return { id, title: body.title || file.originalname, category: body.category || 'other', createdAt: now };
}

export async function deleteDoctorDocument(userId, docId) {
  const [[doc]] = await pool.execute('SELECT file_path FROM nova_user_documents WHERE id = ? AND owner_user_id = ? AND owner_role = ?', [docId, userId, 'doctor']);
  if (!doc) throw Object.assign(new Error('Document introuvable'), { status: 404 });
  await pool.execute('DELETE FROM nova_user_documents WHERE id = ? AND owner_user_id = ?', [docId, userId]);
  if (doc.file_path) {
    const fs = await import('node:fs/promises');
    await fs.unlink(doc.file_path).catch(() => {});
  }
  return { ok: true };
}

// ── Doctor Settings ───────────────────────────────
export async function getDoctorSettings(userId) {
  const [[row]] = await pool.execute(
    'SELECT settings_json FROM nova_user_settings WHERE user_id = ?', [userId]
  );
  if (!row) return {};
  try { return JSON.parse(row.settings_json); } catch { return {}; }
}

export async function updateDoctorSettings(userId, payload) {
  const json = JSON.stringify(payload);
  await pool.execute(
    `INSERT INTO nova_user_settings (user_id, settings_json, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_at = NOW()`,
    [userId, json]
  );
  return payload;
}
