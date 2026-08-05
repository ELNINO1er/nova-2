import { pool } from '../db/database.js';
import { paginatedResponse } from '../middleware/paginate.js';

async function scalar(sql, params = []) {
  const [[row]] = await pool.execute(sql, params);
  return Number(Object.values(row || {})[0] || 0);
}

function likeSearch(search) {
  return `%${String(search || '').trim()}%`;
}

function applyLimit(limit, offset) {
  return `LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
}

export async function getAdminDashboard() {
  const [
    patients,
    doctors,
    pharmacies,
    users,
    consultationsToday,
    audit24h,
    access24h,
    openPharmacyOrders,
  ] = await Promise.all([
    scalar('SELECT COUNT(*) AS total FROM nova_patients'),
    scalar('SELECT COUNT(*) AS total FROM nova_doctors'),
    scalar('SELECT COUNT(*) AS total FROM nova_pharmacies'),
    scalar('SELECT COUNT(*) AS total FROM nova_users'),
    scalar('SELECT COUNT(*) AS total FROM nova_consultations WHERE LEFT(started_at, 10) = CURDATE()'),
    scalar('SELECT COUNT(*) AS total FROM nova_audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'),
    scalar('SELECT COUNT(*) AS total FROM nova_access_logs WHERE accessed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'),
    scalar("SELECT COUNT(*) AS total FROM nova_pharmacy_orders WHERE status IN ('pending','preparing')"),
  ]);

  const [recentAudit] = await pool.execute(
    `SELECT id, user_id AS userId, user_role AS userRole, action, resource_type AS resourceType,
            resource_id AS resourceId, ip_address AS ipAddress, created_at AS createdAt
     FROM nova_audit_logs
     ORDER BY created_at DESC
     LIMIT 5`
  );

  const [cities] = await pool.execute(
    `SELECT city, COUNT(*) AS patients
     FROM nova_patients
     WHERE city IS NOT NULL AND city <> ''
     GROUP BY city
     ORDER BY patients DESC
     LIMIT 8`
  );

  return {
    kpis: {
      patients,
      doctors,
      pharmacies,
      users,
      consultationsToday,
      audit24h,
      access24h,
      openPharmacyOrders,
    },
    cities,
    recentAudit,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminUsers({ type = 'doctors', search = '', limit, offset, page }) {
  const term = likeSearch(search);
  const limiter = applyLimit(limit, offset);

  if (type === 'patients') {
    const countSql = `SELECT COUNT(*) AS total FROM nova_patients
      WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR cmu_number LIKE ? OR phone LIKE ?)`;
    const dataSql = `SELECT id, first_name AS firstName, last_name AS lastName, cmu_number AS cmuNumber,
        phone, email, city, birth_date AS birthDate, created_at AS createdAt
      FROM nova_patients
      WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR cmu_number LIKE ? OR phone LIKE ?)
      ORDER BY COALESCE(created_at, updated_at) DESC
      ${limiter}`;
    const [[{ total }]] = await pool.execute(countSql, [term, term, term, term, term]);
    const [rows] = await pool.execute(dataSql, [term, term, term, term, term]);
    return paginatedResponse(rows, Number(total), { page, limit });
  }

  if (type === 'pharmacies') {
    const countSql = `SELECT COUNT(*) AS total FROM nova_pharmacies
      WHERE (? = '%%' OR name LIKE ? OR city LIKE ? OR phone LIKE ?)`;
    const dataSql = `SELECT id, name, address, city, phone, is_open AS isOpen, is_duty AS isDuty,
        opens_at AS opensAt, closes_at AS closesAt, created_at AS createdAt
      FROM nova_pharmacies
      WHERE (? = '%%' OR name LIKE ? OR city LIKE ? OR phone LIKE ?)
      ORDER BY COALESCE(created_at, name) DESC
      ${limiter}`;
    const [[{ total }]] = await pool.execute(countSql, [term, term, term, term]);
    const [rows] = await pool.execute(dataSql, [term, term, term, term]);
    return paginatedResponse(rows, Number(total), { page, limit });
  }

  if (type === 'users') {
    const countSql = `SELECT COUNT(*) AS total FROM nova_users
      WHERE (? = '%%' OR name LIKE ? OR phone LIKE ? OR role LIKE ?)`;
    const dataSql = `SELECT id, phone, role, patient_id AS patientId, doctor_id AS doctorId,
        pharmacy_id AS pharmacyId, name, avatar, created_at AS createdAt
      FROM nova_users
      WHERE (? = '%%' OR name LIKE ? OR phone LIKE ? OR role LIKE ?)
      ORDER BY created_at DESC
      ${limiter}`;
    const [[{ total }]] = await pool.execute(countSql, [term, term, term, term]);
    const [rows] = await pool.execute(dataSql, [term, term, term, term]);
    return paginatedResponse(rows, Number(total), { page, limit });
  }

  const countSql = `SELECT COUNT(*) AS total FROM nova_doctors
    WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR specialty LIKE ? OR phone LIKE ?)`;
  const dataSql = `SELECT id, first_name AS firstName, last_name AS lastName, specialty, sub_specialty AS subSpecialty,
      city, address, phone, email, rating, reviews_count AS reviewsCount, is_available AS isAvailable,
      created_at AS createdAt
    FROM nova_doctors
    WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR specialty LIKE ? OR phone LIKE ?)
    ORDER BY COALESCE(created_at, last_name) DESC
    ${limiter}`;
  const [[{ total }]] = await pool.execute(countSql, [term, term, term, term, term]);
  const [rows] = await pool.execute(dataSql, [term, term, term, term, term]);
  return paginatedResponse(rows, Number(total), { page, limit });
}

export async function getAdminAuditLogs({ action = '', role = '', resourceType = '', limit, offset, page }) {
  const where = [];
  const params = [];
  if (action) {
    where.push('action LIKE ?');
    params.push(likeSearch(action));
  }
  if (role) {
    where.push('user_role = ?');
    params.push(role);
  }
  if (resourceType) {
    where.push('resource_type = ?');
    params.push(resourceType);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM nova_audit_logs ${clause}`, params);
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, user_role AS userRole, action, resource_type AS resourceType,
            resource_id AS resourceId, details, ip_address AS ipAddress, user_agent AS userAgent,
            created_at AS createdAt
     FROM nova_audit_logs
     ${clause}
     ORDER BY created_at DESC
     ${applyLimit(limit, offset)}`,
    params
  );
  return paginatedResponse(rows, Number(total), { page, limit });
}

export async function getAdminAccessLogs({ patientId = '', accessorRole = '', limit, offset, page }) {
  const where = [];
  const params = [];
  if (patientId) {
    where.push('al.patient_id = ?');
    params.push(patientId);
  }
  if (accessorRole) {
    where.push('al.accessor_role = ?');
    params.push(accessorRole);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM nova_access_logs al ${clause}`, params);
  const [rows] = await pool.execute(
    `SELECT al.id, al.patient_id AS patientId, al.accessor_id AS accessorId,
            al.accessor_role AS accessorRole, al.data_accessed AS dataAccessed,
            al.accessed_at AS accessedAt,
            CONCAT(p.first_name, ' ', p.last_name) AS patientName
     FROM nova_access_logs al
     LEFT JOIN nova_patients p ON p.id = al.patient_id
     ${clause}
     ORDER BY al.accessed_at DESC
     ${applyLimit(limit, offset)}`,
    params
  );
  return paginatedResponse(rows, Number(total), { page, limit });
}

export async function getAdminSystem() {
  const [roles] = await pool.execute(
    `SELECT r.name, COUNT(rp.permission_id) AS permissions
     FROM nova_roles r
     LEFT JOIN nova_role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id, r.name
     ORDER BY r.name`
  );

  return {
    api: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    security: {
      roles,
      permissions: await scalar('SELECT COUNT(*) AS total FROM nova_permissions'),
      auditLogs: await scalar('SELECT COUNT(*) AS total FROM nova_audit_logs'),
      accessLogs: await scalar('SELECT COUNT(*) AS total FROM nova_access_logs'),
    },
    database: {
      patients: await scalar('SELECT COUNT(*) AS total FROM nova_patients'),
      doctors: await scalar('SELECT COUNT(*) AS total FROM nova_doctors'),
      pharmacies: await scalar('SELECT COUNT(*) AS total FROM nova_pharmacies'),
    },
  };
}

export async function setDoctorAvailability(id, isAvailable) {
  const [result] = await pool.execute('UPDATE nova_doctors SET is_available = ? WHERE id = ?', [isAvailable ? 1 : 0, id]);
  if (!result.affectedRows) return null;
  const [[doctor]] = await pool.execute(
    `SELECT id, first_name AS firstName, last_name AS lastName, is_available AS isAvailable
     FROM nova_doctors WHERE id = ?`,
    [id]
  );
  return doctor;
}

export async function setPharmacyOpen(id, isOpen) {
  const [result] = await pool.execute('UPDATE nova_pharmacies SET is_open = ? WHERE id = ?', [isOpen ? 1 : 0, id]);
  if (!result.affectedRows) return null;
  const [[pharmacy]] = await pool.execute(
    `SELECT id, name, is_open AS isOpen, is_duty AS isDuty
     FROM nova_pharmacies WHERE id = ?`,
    [id]
  );
  return pharmacy;
}
