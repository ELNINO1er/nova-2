import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';

export async function listPatientPayments(patientId) {
  const [rows] = await pool.execute(
    `SELECT pay.*, d.first_name AS doctorFirstName, d.last_name AS doctorLastName
     FROM nova_payments pay
     LEFT JOIN nova_doctors d ON d.id = pay.doctor_id
     WHERE pay.patient_id = ?
     ORDER BY pay.created_at DESC
     LIMIT 50`,
    [patientId]
  );
  return rows.map(mapPayment);
}

export async function createPatientPayment(patientId, payload) {
  const id = randomUUID();
  let doctorId = payload.doctorId || null;
  let appointmentId = payload.appointmentId || null;
  let amount = Number(payload.amount || 0);

  if (appointmentId) {
    const [[appt]] = await pool.execute(
      'SELECT id, doctor_id FROM nova_appointments WHERE id = ? AND patient_id = ?',
      [appointmentId, patientId]
    );
    if (!appt) {
      const err = new Error('Rendez-vous introuvable pour ce patient.');
      err.status = 404;
      throw err;
    }
    appointmentId = appt.id;
    doctorId = appt.doctor_id || doctorId;
  }

  if (!amount && doctorId) {
    const [[doctor]] = await pool.execute('SELECT consultation_fee FROM nova_doctors WHERE id = ?', [doctorId]);
    amount = Number(doctor?.consultation_fee || 0);
  }

  if (!amount || amount < 0) {
    const err = new Error('Montant invalide.');
    err.status = 422;
    throw err;
  }

  await pool.execute(
    `INSERT INTO nova_payments
      (id, patient_id, doctor_id, appointment_id, amount, currency, method, status, reference, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      patientId,
      doctorId,
      appointmentId,
      amount,
      payload.currency || 'XOF',
      payload.method || 'offline',
      payload.method === 'cash' ? 'paid' : 'pending',
      payload.reference || null,
      JSON.stringify({ note: payload.note || null, source: 'nova' }),
    ]
  );

  const [[row]] = await pool.execute('SELECT * FROM nova_payments WHERE id = ?', [id]);
  return mapPayment(row);
}

export async function listDoctorPayments(doctorId) {
  const [rows] = await pool.execute(
    `SELECT pay.*, p.first_name AS patientFirstName, p.last_name AS patientLastName
     FROM nova_payments pay
     LEFT JOIN nova_patients p ON p.id = pay.patient_id
     WHERE pay.doctor_id = ?
     ORDER BY pay.created_at DESC
     LIMIT 100`,
    [doctorId]
  );
  return rows.map(mapPayment);
}

export async function markDoctorPaymentPaid(doctorId, paymentId, reference = null) {
  const [result] = await pool.execute(
    `UPDATE nova_payments
     SET status = 'paid', reference = COALESCE(?, reference)
     WHERE id = ? AND doctor_id = ?`,
    [reference, paymentId, doctorId]
  );
  if (!result.affectedRows) return null;
  const [[row]] = await pool.execute('SELECT * FROM nova_payments WHERE id = ?', [paymentId]);
  return mapPayment(row);
}

function mapPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    appointmentId: row.appointment_id,
    amount: Number(row.amount),
    currency: row.currency,
    method: row.method,
    status: row.status,
    reference: row.reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    doctorName: row.doctorFirstName ? `Dr. ${row.doctorFirstName} ${row.doctorLastName || ''}`.trim() : undefined,
    patientName: row.patientFirstName ? `${row.patientFirstName} ${row.patientLastName || ''}`.trim() : undefined,
  };
}
