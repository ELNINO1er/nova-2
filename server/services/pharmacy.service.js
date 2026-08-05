import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/database.js';
import { notifyPatientDispense, notifyDoctorDispense } from './notification.service.js';

/* ─── Dashboard pharmacie ─────────────────────────────────────── */

export async function getPharmacyDashboard(pharmacyId) {
  const [[pharmacy]] = await pool.execute(
    'SELECT * FROM nova_pharmacies WHERE id = ?', [pharmacyId]
  );

  const [[{ todayCount }]] = await pool.execute(
    `SELECT COUNT(*) AS todayCount FROM nova_dispenses
     WHERE pharmacy_id = ? AND DATE(dispensed_at) = CURDATE()`,
    [pharmacyId]
  );

  const [[{ totalCount }]] = await pool.execute(
    `SELECT COUNT(*) AS totalCount FROM nova_dispenses WHERE pharmacy_id = ?`,
    [pharmacyId]
  );

  const [recentDispenses] = await pool.execute(
    `SELECT d.*, p.first_name, p.last_name
     FROM nova_dispenses d
     JOIN nova_patients p ON p.id = d.patient_id
     WHERE d.pharmacy_id = ?
     ORDER BY d.dispensed_at DESC LIMIT 10`,
    [pharmacyId]
  );

  return {
    pharmacy: pharmacy ? {
      id: pharmacy.id, name: pharmacy.name, city: pharmacy.city, phone: pharmacy.phone,
    } : null,
    todayDispenses: todayCount,
    totalDispenses: totalCount,
    recentDispenses: recentDispenses.map(r => ({
      id: r.id,
      patientName: displayName(r.first_name, r.last_name),
      status: r.status,
      dispensedAt: r.dispensed_at,
    })),
  };
}

/* ─── Vérifier ordonnance via QR / ID ─────────────────────────── */

export async function verifyPrescriptionQR(qrToken) {
  let decoded;
  try {
    decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
  } catch {
    const err = new Error('QR ordonnance invalide ou expiré.');
    err.status = 401;
    throw err;
  }
  if (decoded?.type !== 'prescription' || !decoded.prescriptionId) {
    const err = new Error('QR ordonnance invalide.');
    err.status = 422;
    throw err;
  }
  const prescriptionId = decoded.prescriptionId;

  const [[rx]] = await pool.execute(
    `SELECT p.id, p.patient_id, p.doctor_name, p.doctor_specialty, p.issued_at, p.valid_until, p.status,
            pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.id = ?`,
    [prescriptionId]
  );
  if (!rx) return null;

  // Vérifier si déjà délivrée
  const [[dispense]] = await pool.execute(
    `SELECT id, status, dispensed_at FROM nova_dispenses WHERE prescription_id = ? ORDER BY dispensed_at DESC LIMIT 1`,
    [prescriptionId]
  );

  const isExpired = rx.valid_until && new Date(rx.valid_until) < new Date();

  return {
    id: rx.id,
    patientName: displayName(rx.first_name, rx.last_name),
    cmuNumber: maskIdentifier(rx.cmu_number),
    doctorName: rx.doctor_name,
    doctorSpecialty: rx.doctor_specialty,
    issuedAt: rx.issued_at,
    validUntil: rx.valid_until,
    status: rx.status,
    isExpired,
    isAlreadyDispensed: dispense?.status === 'full',
    lastDispense: dispense ? {
      id: dispense.id,
      status: dispense.status,
      dispensedAt: dispense.dispensed_at,
    } : null,
    verification: {
      authentic: true,
      expired: isExpired,
      alreadyFull: dispense?.status === 'full',
      canDispense: !isExpired && dispense?.status !== 'full' && rx.status === 'active',
    },
  };
}

/* ─── Détail ordonnance (médicaments uniquement, PAS le dossier) ── */

export async function getPrescriptionForPharmacy(prescriptionId) {
  const [[rx]] = await pool.execute(
    `SELECT p.id, p.patient_id, p.doctor_name, p.doctor_specialty, p.issued_at, p.valid_until, p.status,
            pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.id = ?`,
    [prescriptionId]
  );
  if (!rx) return null;

  const [items] = await pool.execute(
    'SELECT * FROM nova_prescription_items WHERE prescription_id = ?',
    [prescriptionId]
  );

  // Vérifier délivrances précédentes
  const [dispenses] = await pool.execute(
    `SELECT d.id, d.status, d.dispensed_at, d.notes, ph.name AS pharmacyName
     FROM nova_dispenses d
     JOIN nova_pharmacies ph ON ph.id = d.pharmacy_id
     WHERE d.prescription_id = ?
     ORDER BY d.dispensed_at DESC`,
    [prescriptionId]
  );

  return {
    id: rx.id,
    patientName: displayName(rx.first_name, rx.last_name),
    cmuNumber: maskIdentifier(rx.cmu_number),
    doctorName: rx.doctor_name,
    doctorSpecialty: rx.doctor_specialty,
    issuedAt: rx.issued_at,
    validUntil: rx.valid_until,
    status: rx.status,
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      instructions: i.instructions,
    })),
    dispenseHistory: dispenses.map(d => ({
      id: d.id,
      status: d.status,
      pharmacyName: d.pharmacyName,
      dispensedAt: d.dispensed_at,
    })),
  };
}

/* ─── Délivrer ordonnance ─────────────────────────────────────── */

export async function dispensePrescription(pharmacyId, pharmacistUserId, payload) {
  // Vérifier que l'ordonnance existe et est dispensable
  const [[rxStatus]] = await pool.execute(
    `SELECT p.id, p.valid_until, p.status,
            (SELECT d.status FROM nova_dispenses d WHERE d.prescription_id = p.id ORDER BY d.dispensed_at DESC LIMIT 1) AS last_dispense_status
     FROM nova_prescriptions p WHERE p.id = ?`,
    [payload.prescriptionId]
  );
  if (!rxStatus) {
    const err = new Error('Ordonnance introuvable.');
    err.status = 404;
    throw err;
  }
  const isExpired = rxStatus.valid_until && new Date(rxStatus.valid_until) < new Date();
  if (isExpired || rxStatus.last_dispense_status === 'full' || rxStatus.status !== 'active') {
    const err = new Error(
      isExpired ? 'Ordonnance expiree.'
      : rxStatus.last_dispense_status === 'full' ? 'Ordonnance deja entierement delivree.'
      : 'Ordonnance non dispensable.'
    );
    err.status = 422;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const dispenseId = randomUUID();
    const [[rx]] = await conn.execute('SELECT patient_id FROM nova_prescriptions WHERE id = ?', [payload.prescriptionId]);

    await conn.execute(
      `INSERT INTO nova_dispenses (id, prescription_id, pharmacy_id, pharmacist_user_id, patient_id, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dispenseId, payload.prescriptionId, pharmacyId, pharmacistUserId, rx.patient_id, payload.status, payload.notes || null]
    );

    for (const item of payload.items) {
      await conn.execute(
        `INSERT INTO nova_dispense_items (id, dispense_id, prescription_item_id, quantity_dispensed, substituted, substitution_name, substitution_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), dispenseId, item.prescriptionItemId, item.quantityDispensed,
         item.substituted ? 1 : 0, item.substitutionName || null, item.substitutionReason || null]
      );
    }

    // Mettre à jour le statut de l'ordonnance
    if (payload.status === 'full') {
      await conn.execute('UPDATE nova_prescriptions SET status = ? WHERE id = ?', ['dispensed', payload.prescriptionId]);
    } else if (payload.status === 'partial') {
      await conn.execute('UPDATE nova_prescriptions SET status = ? WHERE id = ?', ['partial', payload.prescriptionId]);
    }

    await conn.commit();

    // Notifications (hors transaction — non bloquant)
    const [[pharmacy]] = await pool.execute('SELECT name FROM nova_pharmacies WHERE id = ?', [pharmacyId]);
    const phName = pharmacy?.name || 'Pharmacie';
    notifyPatientDispense(rx.patient_id, phName, payload.status).catch(() => {});

    // Notifier le médecin prescripteur
    const [[rxFull]] = await pool.execute('SELECT doctor_id FROM nova_prescriptions WHERE id = ?', [payload.prescriptionId]);
    if (rxFull?.doctor_id) {
      const [[pat]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [rx.patient_id]);
      notifyDoctorDispense(rxFull.doctor_id, `${pat?.first_name || ''} ${pat?.last_name || ''}`, phName, payload.status).catch(() => {});
    }

    return { id: dispenseId, status: payload.status, prescriptionId: payload.prescriptionId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ─── Historique délivrances ──────────────────────────────────── */

export async function getDispenseHistory(pharmacyId, query = {}) {
  let sql = `
    SELECT d.*, p.first_name, p.last_name, p.cmu_number,
           rx.doctor_name, rx.issued_at AS rx_issued_at
    FROM nova_dispenses d
    JOIN nova_patients p ON p.id = d.patient_id
    JOIN nova_prescriptions rx ON rx.id = d.prescription_id
    WHERE d.pharmacy_id = ?`;
  const args = [pharmacyId];

  if (query.status) {
    sql += ' AND d.status = ?';
    args.push(query.status);
  }
  if (query.date) {
    sql += ' AND DATE(d.dispensed_at) = ?';
    args.push(query.date);
  }

  sql += ' ORDER BY d.dispensed_at DESC LIMIT 50';

  const [rows] = await pool.execute(sql, args);
  return rows.map(r => ({
    id: r.id,
    patientName: displayName(r.first_name, r.last_name),
    cmuNumber: maskIdentifier(r.cmu_number),
    doctorName: r.doctor_name,
    status: r.status,
    notes: r.notes,
    dispensedAt: r.dispensed_at,
    rxIssuedAt: r.rx_issued_at,
  }));
}

function displayName(firstName, lastName) {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  return `${first} ${last ? `${last[0]}.` : ''}`.trim() || 'Patient';
}

function maskIdentifier(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const visible = raw.slice(-4);
  return `${'*'.repeat(Math.max(4, raw.length - 4))}${visible}`;
}
