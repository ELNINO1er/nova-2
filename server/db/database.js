import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sika_sante',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

export async function initDb() {
  const conn = await pool.getConnection();
  try {
    await createTables(conn);
    await createOperationalTables(conn);
    await seedRbac(conn);
    if (process.env.SEED_DEMO === 'true' && process.env.NODE_ENV !== 'production') {
      await seedDemo(conn);
      await seedVitalHistory(conn);
      await seedDoctors(conn);
      await seedNotifications(conn);
      await seedWellnessGoals(conn);
      await seedUsers(conn);
      await seedInsurance(conn);
      await seedPharmacies(conn);
      await seedDoctorUser(conn);
      await seedDoctorData(conn);
    }
    await addForeignKeys(conn);
  } finally {
    conn.release();
  }
}

async function createOperationalTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_payments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36),
      appointment_id VARCHAR(36),
      amount INT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
      method ENUM('cash','mobile_money','insurance','offline') NOT NULL DEFAULT 'offline',
      status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
      reference VARCHAR(100),
      metadata JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pay_patient (patient_id),
      INDEX idx_pay_doctor (doctor_id),
      INDEX idx_pay_status (status)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_offline_queue (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      user_role VARCHAR(20) NOT NULL,
      operation VARCHAR(100) NOT NULL,
      payload JSON NOT NULL,
      status ENUM('queued','synced','failed') NOT NULL DEFAULT 'queued',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME,
      INDEX idx_offline_user (user_id),
      INDEX idx_offline_status (status)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_user_documents (
      id VARCHAR(36) PRIMARY KEY,
      owner_user_id VARCHAR(36) NOT NULL,
      owner_role VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'other',
      mime_type VARCHAR(100) NOT NULL,
      size_bytes INT NOT NULL DEFAULT 0,
      file_path VARCHAR(500) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_nud_owner (owner_user_id, owner_role),
      INDEX idx_nud_created (created_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_user_settings (
      user_id VARCHAR(36) PRIMARY KEY,
      settings_json JSON NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_revoked_tokens (
      token_hash CHAR(64) PRIMARY KEY,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_nrt_expires (expires_at)
    )
  `);
}

async function createTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_patients (
      id VARCHAR(36) PRIMARY KEY,
      cmu_number VARCHAR(30) UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      birth_date VARCHAR(30),
      sex VARCHAR(10),
      blood_type VARCHAR(10),
      phone VARCHAR(30),
      email VARCHAR(191),
      address VARCHAR(255),
      city VARCHAR(100),
      weight_kg FLOAT,
      height_cm FLOAT,
      emergency_name VARCHAR(150),
      emergency_relationship VARCHAR(100),
      emergency_phone VARCHAR(30),
      updated_at VARCHAR(30) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_vitals (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      label VARCHAR(100) NOT NULL,
      value VARCHAR(50) NOT NULL,
      unit VARCHAR(20),
      measured_at VARCHAR(30) NOT NULL,
      INDEX idx_nv_patient (patient_id),
      INDEX idx_nv_measured (measured_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_treatments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      diagnosis VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      stage VARCHAR(100),
      progress INT,
      started_at VARCHAR(30),
      doctor_name VARCHAR(150),
      next_checkup_at VARCHAR(30),
      INDEX idx_nt_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medications (
      id VARCHAR(36) PRIMARY KEY,
      treatment_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(100),
      INDEX idx_nm_treatment (treatment_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medication_schedules (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      medication_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100),
      take_time VARCHAR(10) NOT NULL,
      period VARCHAR(20),
      color VARCHAR(30),
      has_interaction TINYINT(1) NOT NULL DEFAULT 0,
      INDEX idx_nms_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medication_intakes (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      schedule_id VARCHAR(36) NOT NULL,
      status VARCHAR(20) NOT NULL,
      taken_at VARCHAR(30) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nmi_patient (patient_id),
      INDEX idx_nmi_taken (taken_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_appointments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      starts_at VARCHAR(30) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      specialty VARCHAR(100),
      location VARCHAR(255),
      mode VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL,
      INDEX idx_na_patient (patient_id),
      INDEX idx_na_starts (starts_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_vaccinations (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) NOT NULL,
      injected_at VARCHAR(20),
      status VARCHAR(50),
      next_due_at VARCHAR(20),
      INDEX idx_nvax_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_documents (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      mime_type VARCHAR(100),
      size_bytes INT,
      file_path VARCHAR(500),
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nd_patient (patient_id)
    )
  `);
  // migration : ajouter file_path si table existait déjà sans cette colonne
  await conn.query(`ALTER TABLE nova_documents ADD COLUMN file_path VARCHAR(500)`).catch(() => {});

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_lab_results (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      lab_name VARCHAR(150),
      ordered_by VARCHAR(150),
      performed_at VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      notes TEXT,
      INDEX idx_nlr_patient (patient_id),
      INDEX idx_nlr_performed (performed_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_lab_result_items (
      id VARCHAR(36) PRIMARY KEY,
      lab_result_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      value VARCHAR(50) NOT NULL,
      unit VARCHAR(30),
      ref_min VARCHAR(30),
      ref_max VARCHAR(30),
      status VARCHAR(20) NOT NULL DEFAULT 'normal',
      INDEX idx_nlri_result (lab_result_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medical_profile (
      patient_id VARCHAR(36) PRIMARY KEY,
      allergies JSON NOT NULL,
      chronic_diseases JSON NOT NULL,
      family_history JSON NOT NULL,
      surgical_history JSON NOT NULL,
      updated_at VARCHAR(30) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_conversations (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      doctor_specialty VARCHAR(100),
      unread_count INT NOT NULL DEFAULT 0,
      last_message TEXT,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_nc_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      sender_role VARCHAR(20) NOT NULL,
      body TEXT NOT NULL,
      attachment_name VARCHAR(255),
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nmsg_conv (conversation_id),
      INDEX idx_nmsg_created (created_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medical_history (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      occurred_at VARCHAR(30) NOT NULL,
      doctor_name VARCHAR(150),
      INDEX idx_nmh_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_prescriptions (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      doctor_specialty VARCHAR(100),
      issued_at VARCHAR(30) NOT NULL,
      valid_until VARCHAR(30),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      notes TEXT,
      INDEX idx_np_patient (patient_id),
      INDEX idx_np_issued (issued_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_prescription_items (
      id VARCHAR(36) PRIMARY KEY,
      prescription_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(150),
      duration VARCHAR(100),
      instructions TEXT,
      INDEX idx_npi_prescription (prescription_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_notes (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      color VARCHAR(30) NOT NULL DEFAULT 'amber',
      pinned TINYINT(1) NOT NULL DEFAULT 0,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_nn_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_patient_settings (
      patient_id VARCHAR(36) PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at VARCHAR(30) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_wellness_goals (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      target FLOAT NOT NULL,
      current_value FLOAT NOT NULL DEFAULT 0,
      unit VARCHAR(30),
      icon VARCHAR(50),
      color VARCHAR(30) NOT NULL DEFAULT 'emerald',
      completed TINYINT(1) NOT NULL DEFAULT 0,
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_nwg_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_doctors (
      id VARCHAR(36) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      specialty VARCHAR(100) NOT NULL,
      sub_specialty VARCHAR(100),
      city VARCHAR(100) NOT NULL DEFAULT 'Abidjan',
      address VARCHAR(255),
      phone VARCHAR(30),
      email VARCHAR(191),
      rating FLOAT NOT NULL DEFAULT 4.5,
      reviews_count INT NOT NULL DEFAULT 0,
      experience_years INT NOT NULL DEFAULT 5,
      languages VARCHAR(255) NOT NULL DEFAULT 'Français',
      bio TEXT,
      avatar_initials VARCHAR(4),
      avatar_color VARCHAR(30) NOT NULL DEFAULT 'red',
      consultation_fee INT NOT NULL DEFAULT 15000,
      accepts_cmu TINYINT(1) NOT NULL DEFAULT 1,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      INDEX idx_nd_specialty (specialty),
      INDEX idx_nd_city (city)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_doctor_slots (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      slot_date VARCHAR(20) NOT NULL,
      slot_time VARCHAR(10) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      patient_id VARCHAR(36),
      INDEX idx_nds_doctor (doctor_id),
      INDEX idx_nds_date (slot_date),
      UNIQUE KEY uq_slot (doctor_id, slot_date, slot_time)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_notifications (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      link_page VARCHAR(50),
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nnot_patient (patient_id),
      INDEX idx_nnot_created (created_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_users (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      code_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'patient',
      patient_id VARCHAR(36),
      name VARCHAR(200),
      avatar VARCHAR(10),
      created_at VARCHAR(30) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_insurance (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      provider VARCHAR(150) NOT NULL,
      policy_number VARCHAR(100),
      holder_name VARCHAR(200),
      coverage_type VARCHAR(100),
      valid_from VARCHAR(20),
      valid_to VARCHAR(20),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      reimbursement_rate INT NOT NULL DEFAULT 70,
      logo_color VARCHAR(20) NOT NULL DEFAULT 'blue',
      INDEX idx_nins_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_pharmacies (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      address VARCHAR(255),
      city VARCHAR(100),
      phone VARCHAR(30),
      is_open TINYINT(1) NOT NULL DEFAULT 1,
      opens_at VARCHAR(10),
      closes_at VARCHAR(10),
      is_duty TINYINT(1) NOT NULL DEFAULT 0,
      distance_km FLOAT,
      INDEX idx_nph_city (city)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_pharmacy_orders (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      pharmacy_id VARCHAR(36) NOT NULL,
      prescription_id VARCHAR(36),
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_npo_patient (patient_id)
    )
  `);

  /* ── Phase 5A : Espace médecin ──────────────────────────────── */

  // Migration : ajouter doctor_id aux rendez-vous et aux utilisateurs
  await conn.query(`ALTER TABLE nova_appointments ADD COLUMN doctor_id VARCHAR(36) DEFAULT NULL`).catch(() => {});
  await conn.query(`ALTER TABLE nova_appointments ADD INDEX idx_na_doctor (doctor_id)`).catch(() => {});
  await conn.query(`ALTER TABLE nova_users ADD COLUMN doctor_id VARCHAR(36) DEFAULT NULL`).catch(() => {});
  await conn.query(`ALTER TABLE nova_users ADD COLUMN pharmacy_id VARCHAR(36) DEFAULT NULL`).catch(() => {});

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_consultations (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36) NOT NULL,
      motif TEXT,
      diagnosis_main VARCHAR(255),
      diagnosis_secondary VARCHAR(255),
      notes TEXT,
      recommendations TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'completed',
      started_at VARCHAR(30) NOT NULL,
      completed_at VARCHAR(30),
      INDEX idx_ncons_patient (patient_id),
      INDEX idx_ncons_doctor (doctor_id),
      INDEX idx_ncons_started (started_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_lab_requests (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36) NOT NULL,
      consultation_id VARCHAR(36),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      notes TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      requested_at VARCHAR(30) NOT NULL,
      INDEX idx_nlreq_patient (patient_id),
      INDEX idx_nlreq_doctor (doctor_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_doctor_reputation (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      consultation_id VARCHAR(36),
      rating FLOAT NOT NULL,
      comment TEXT,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_ndr_doctor (doctor_id)
    )
  `);

  /* ── Phase 5D : Signature + Finances ────────────────────────── */
  await conn.query(`ALTER TABLE nova_doctors ADD COLUMN signature_data TEXT DEFAULT NULL`).catch(() => {});

  /* ── Phase 5B : Ordonnances médecin ─────────────────────────── */
  await conn.query(`ALTER TABLE nova_prescriptions ADD COLUMN doctor_id VARCHAR(36) DEFAULT NULL`).catch(() => {});
  await conn.query(`ALTER TABLE nova_prescriptions ADD INDEX idx_np_doctor_id (doctor_id)`).catch(() => {});

  /* ── Phase 5C : Suivi chroniques + Urgences ──────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_doctor_alerts (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      level VARCHAR(20) NOT NULL DEFAULT 'warning',
      title VARCHAR(255) NOT NULL,
      body TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at VARCHAR(30) NOT NULL,
      resolved_at VARCHAR(30),
      INDEX idx_nda_doctor (doctor_id),
      INDEX idx_nda_patient (patient_id),
      INDEX idx_nda_status (status)
    )
  `);

  /* ── Sécurité : OTP ──────────────────────────────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_otp (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 3,
      expires_at DATETIME NOT NULL,
      verified TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otp_phone (phone),
      INDEX idx_otp_expires (expires_at)
    )
  `);

  /* ── Sécurité : Audit Logs ─────────────────────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_audit_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      user_role VARCHAR(20) NOT NULL,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50),
      resource_id VARCHAR(36),
      details JSON,
      ip_address VARCHAR(45),
      user_agent VARCHAR(500),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_user (user_id),
      INDEX idx_audit_action (action),
      INDEX idx_audit_resource (resource_type, resource_id),
      INDEX idx_audit_created (created_at)
    )
  `);

  /* ── Sécurité : Access Logs (qui a consulté quel dossier) ─── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_access_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      accessor_id VARCHAR(36) NOT NULL,
      accessor_role VARCHAR(20) NOT NULL,
      data_accessed VARCHAR(100) NOT NULL,
      accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_al_patient (patient_id),
      INDEX idx_al_accessor (accessor_id)
    )
  `);

  /* ═══════════════════════════════════════════════════════════
     ÉTAPE 2 — RBAC, Consentements, Pharmacie, Famille, FK
     ═══════════════════════════════════════════════════════════ */

  /* ── RBAC ─────────────────────────────────────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_roles (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_permissions (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255),
      module VARCHAR(50) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_role_permissions (
      role_id VARCHAR(36) NOT NULL,
      permission_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES nova_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES nova_permissions(id) ON DELETE CASCADE
    )
  `);

  /* ── Consentements (accès dossier patient) ────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_consents (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36) NOT NULL,
      status ENUM('pending','granted','revoked') NOT NULL DEFAULT 'pending',
      scope JSON NOT NULL,
      requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      expires_at DATETIME,
      INDEX idx_consent_patient (patient_id),
      INDEX idx_consent_doctor (doctor_id),
      INDEX idx_consent_status (status)
    )
  `);

  /* ── Pharmacie — utilisateurs et délivrances ──────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_pharmacy_users (
      id VARCHAR(36) PRIMARY KEY,
      pharmacy_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      role ENUM('pharmacist','preparer','admin') NOT NULL DEFAULT 'pharmacist',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phu_pharmacy (pharmacy_id),
      INDEX idx_phu_user (user_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_dispenses (
      id VARCHAR(36) PRIMARY KEY,
      prescription_id VARCHAR(36) NOT NULL,
      pharmacy_id VARCHAR(36) NOT NULL,
      pharmacist_user_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      status ENUM('full','partial','refused') NOT NULL,
      notes TEXT,
      dispensed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_disp_prescription (prescription_id),
      INDEX idx_disp_pharmacy (pharmacy_id),
      INDEX idx_disp_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_dispense_items (
      id VARCHAR(36) PRIMARY KEY,
      dispense_id VARCHAR(36) NOT NULL,
      prescription_item_id VARCHAR(36) NOT NULL,
      quantity_dispensed INT NOT NULL DEFAULT 1,
      substituted TINYINT(1) NOT NULL DEFAULT 0,
      substitution_name VARCHAR(200),
      substitution_reason VARCHAR(255),
      INDEX idx_di_dispense (dispense_id),
      INDEX idx_di_item (prescription_item_id)
    )
  `);

  /* ── Dossier familial ─────────────────────────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_family_members (
      id VARCHAR(36) PRIMARY KEY,
      owner_patient_id VARCHAR(36) NOT NULL,
      member_patient_id VARCHAR(36),
      relationship ENUM('child','spouse','parent','sibling','other') NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      birth_date DATE,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fm_owner (owner_patient_id)
    )
  `);

  /* ── Migrations : Ajouter timestamps manquants ────────────── */
  const addColumns = [
    'ALTER TABLE nova_patients ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_patients ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL',
    'ALTER TABLE nova_treatments ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_medications ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_appointments ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_appointments ADD COLUMN updated_at VARCHAR(30)',
    'ALTER TABLE nova_appointments ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL',
    'ALTER TABLE nova_prescriptions ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_prescriptions ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL',
    'ALTER TABLE nova_consultations ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_consultations ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL',
    'ALTER TABLE nova_doctors ADD COLUMN created_at VARCHAR(30)',
    'ALTER TABLE nova_doctors ADD COLUMN updated_at VARCHAR(30)',
    'ALTER TABLE nova_users ADD COLUMN updated_at VARCHAR(30)',
    'ALTER TABLE nova_users ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL',
    'ALTER TABLE nova_users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE nova_pharmacies ADD COLUMN created_at VARCHAR(30)',
  ];
  for (const sql of addColumns) {
    await conn.query(sql).catch(() => {});
  }

  /* ── Normalisation : ajouter doctor_id FK là où manquant ──── */
  const addFKColumns = [
    'ALTER TABLE nova_conversations ADD COLUMN doctor_id VARCHAR(36) DEFAULT NULL',
    'ALTER TABLE nova_lab_results ADD COLUMN doctor_id VARCHAR(36) DEFAULT NULL',
  ];
  for (const sql of addFKColumns) {
    await conn.query(sql).catch(() => {});
  }

  /* ═══════════════════════════════════════════════════════════
     ÉTAPE 5 — Module médecin avancé
     ═══════════════════════════════════════════════════════════ */

  /* ── Templates consultation ───────────────────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_consultation_templates (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) NOT NULL,
      specialty VARCHAR(100),
      motif TEXT,
      diagnosis_main VARCHAR(255),
      notes TEXT,
      recommendations TEXT,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ct_doctor (doctor_id)
    )
  `);

  /* ── Templates ordonnance ─────────────────────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_prescription_templates (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) NOT NULL,
      items JSON NOT NULL,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pt_doctor (doctor_id)
    )
  `);

  /* ── Transferts patient vers spécialiste ───────────────────── */
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_referrals (
      id VARCHAR(36) PRIMARY KEY,
      from_doctor_id VARCHAR(36) NOT NULL,
      to_doctor_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      reason TEXT NOT NULL,
      urgency ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
      notes TEXT,
      shared_data JSON,
      status ENUM('pending','accepted','declined','completed') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      INDEX idx_ref_from (from_doctor_id),
      INDEX idx_ref_to (to_doctor_id),
      INDEX idx_ref_patient (patient_id),
      INDEX idx_ref_status (status)
    )
  `);

  /* ═══════════════════════════════════════════════════════════
     ÉTAPE 7 — Notifications cross-rôle
     ═══════════════════════════════════════════════════════════ */

  // Ajouter user_id + target_role sur notifications pour supporter tous les rôles
  const notifMigrations = [
    'ALTER TABLE nova_notifications ADD COLUMN user_id VARCHAR(36) DEFAULT NULL',
    'ALTER TABLE nova_notifications ADD COLUMN target_role VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE nova_notifications ADD COLUMN source_user_id VARCHAR(36) DEFAULT NULL',
    'ALTER TABLE nova_notifications ADD COLUMN source_role VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE nova_notifications ADD INDEX idx_nnot_user (user_id)',
  ];
  for (const sql of notifMigrations) {
    await conn.query(sql).catch(() => {});
  }

  // Add missing indexes (idempotent via IF NOT EXISTS / IGNORE)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_nms_medication ON nova_medication_schedules (medication_id)',
    'CREATE INDEX IF NOT EXISTS idx_npo_pharmacy ON nova_pharmacy_orders (pharmacy_id)',
    'CREATE INDEX IF NOT EXISTS idx_npo_prescription ON nova_pharmacy_orders (prescription_id)',
    'CREATE INDEX IF NOT EXISTS idx_ndr_patient ON nova_doctor_reputation (patient_id)',
    'CREATE INDEX IF NOT EXISTS idx_npi_prescription ON nova_prescription_items (prescription_id)',
    'CREATE INDEX IF NOT EXISTS idx_nlri_labresult ON nova_lab_result_items (lab_result_id)',
    'CREATE INDEX IF NOT EXISTS idx_nc_doctor ON nova_conversations (doctor_id)',
    'CREATE INDEX IF NOT EXISTS idx_nlr_doctor ON nova_lab_results (doctor_id)',
    'CREATE INDEX IF NOT EXISTS idx_nfm_member ON nova_family_members (member_patient_id)',
  ];
  for (const sql of indexes) {
    await conn.query(sql).catch(() => {});
  }
}

async function seedDemo(conn) {
  const [[existing]] = await conn.query(
    'SELECT id FROM nova_patients WHERE id = ?', ['patient-demo']
  );
  if (existing) return;

  const now = new Date().toISOString();

  await conn.query(`
    INSERT INTO nova_patients
      (id, cmu_number, first_name, last_name, birth_date, sex, blood_type,
       phone, email, address, city, weight_kg, height_cm,
       emergency_name, emergency_relationship, emergency_phone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['patient-demo', 'CI-2024-0847-3692', 'Kouamé', 'Bamba', '1974-03-15', 'M', 'O+',
      '0789452311', 'k.bamba@example.ci', 'Cocody, Rue des Jardins', 'Abidjan',
      78, 175, 'Aya Bamba', 'Épouse', '0700112233', now]);

  await conn.query(`
    INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at) VALUES
    ('vital-1','patient-demo','blood_pressure','Tension','12/8','mmHg','2026-04-28T07:30:00.000Z'),
    ('vital-2','patient-demo','blood_glucose','Glycémie','0.95','g/L','2026-04-28T07:35:00.000Z'),
    ('vital-3','patient-demo','heart_rate','Fréquence','72','bpm','2026-04-28T07:40:00.000Z'),
    ('vital-4','patient-demo','temperature','Température','36.8','°C','2026-04-28T07:45:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_treatments
      (id, patient_id, diagnosis, status, stage, progress, started_at, doctor_name, next_checkup_at) VALUES
    ('treatment-1','patient-demo','Hypertension artérielle','active','Stade 1',75,'2024-01-08','Dr. Aïcha Touré','2026-05-02T14:30:00.000Z'),
    ('treatment-2','patient-demo','Diabète Type 2','controlled','Contrôlé',90,'2023-03-14','Dr. Mariam Bamba','2026-05-15T09:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_medications (id, treatment_id, name, dosage, frequency) VALUES
    ('med-1','treatment-1','Amlodipine','5mg','1x/j'),
    ('med-2','treatment-1','Aspirine','100mg','1x/j'),
    ('med-3','treatment-2','Metformine','500mg','2x/j')
  `);

  await conn.query(`
    INSERT INTO nova_medication_schedules
      (id, patient_id, medication_id, name, dosage, take_time, period, color, has_interaction) VALUES
    ('schedule-1','patient-demo','med-1','Amlodipine','5mg','08:00','Matin','blue',0),
    ('schedule-2','patient-demo','med-3','Metformine','500mg','08:00','Matin','emerald',0),
    ('schedule-3','patient-demo','med-2','Aspirine','100mg','12:30','Midi','red',1),
    ('schedule-4','patient-demo','med-3','Metformine','500mg','20:00','Soir','emerald',0)
  `);

  await conn.query(`
    INSERT INTO nova_appointments
      (id, patient_id, starts_at, doctor_name, specialty, location, mode, status) VALUES
    ('apt-1','patient-demo','2026-05-02T14:30:00.000Z','Dr. Aïcha Touré','Cardiologie','CHU Treichville','onsite','confirmed'),
    ('apt-2','patient-demo','2026-05-15T09:00:00.000Z','Dr. Yao Konan','Médecine générale','Téléconsultation','video','confirmed'),
    ('apt-3','patient-demo','2026-05-28T11:00:00.000Z','Dr. Mariam Bamba','Endocrinologie','PISAM Cocody','onsite','confirmed')
  `);

  await conn.query(`
    INSERT INTO nova_vaccinations (id, patient_id, name, injected_at, status, next_due_at) VALUES
    ('vax-1','patient-demo','Tétanos','2026-04-02','up_to_date','2036-04-02'),
    ('vax-2','patient-demo','Hépatite B','2024-01-15','up_to_date',NULL),
    ('vax-3','patient-demo','Fièvre jaune','2020-06-20','up_to_date',NULL),
    ('vax-4','patient-demo','Méningite','2023-02-10','due_soon','2026-02-10')
  `);

  await conn.query(`
    INSERT INTO nova_documents (id, patient_id, title, category, mime_type, size_bytes, created_at) VALUES
    ('doc-1','patient-demo','Ordonnance cardiologie','prescription','application/pdf',245760,'2026-04-20T10:00:00.000Z'),
    ('doc-2','patient-demo','Analyse glycémie','lab','application/pdf',180224,'2026-04-18T08:00:00.000Z'),
    ('doc-3','patient-demo','Carnet vaccination','vaccine','application/pdf',98221,'2026-04-02T12:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_conversations (id, patient_id, doctor_name, doctor_specialty, unread_count, last_message, updated_at) VALUES
    ('conv-1','patient-demo','Dr. Aïcha Touré','Cardiologie',2,'Merci de surveiller votre tension.','2026-04-28T09:00:00.000Z'),
    ('conv-2','patient-demo','Dr. Yao Konan','Médecine générale',1,'Votre rendez-vous est confirmé pour le 15 mai.','2026-04-27T15:10:00.000Z'),
    ('conv-3','patient-demo','Dr. Mariam Bamba','Endocrinologie',0,'À bientôt pour le suivi.','2026-04-20T11:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_messages (id, conversation_id, sender_role, body, is_read, created_at) VALUES
    ('msg-1','conv-1','patient','Bonjour Docteur, j'ai mesuré ma tension ce matin : 14/9. Est-ce que c'est inquiétant ?',1,'2026-04-28T07:45:00.000Z'),
    ('msg-2','conv-1','doctor','Bonjour Kouamé. Cette valeur est légèrement élevée. Avez-vous bien pris votre Amlodipine ce matin ?',1,'2026-04-28T08:15:00.000Z'),
    ('msg-3','conv-1','patient','Oui, je l'ai prise à 8h comme d'habitude.',1,'2026-04-28T08:30:00.000Z'),
    ('msg-4','conv-1','doctor','Très bien. Surveillez votre tension ce soir. Si elle dépasse 16/10, contactez-moi immédiatement.',0,'2026-04-28T08:45:00.000Z'),
    ('msg-5','conv-1','doctor','Merci de surveiller votre tension.',0,'2026-04-28T09:00:00.000Z'),
    ('msg-6','conv-2','doctor','Bonjour, je confirme votre rendez-vous du 15 mai à 9h00 pour votre bilan de santé.',1,'2026-04-27T14:00:00.000Z'),
    ('msg-7','conv-2','patient','Merci Docteur, je serai présent.',1,'2026-04-27T14:30:00.000Z'),
    ('msg-8','conv-2','doctor','Votre rendez-vous est confirmé pour le 15 mai. Pensez à venir à jeun pour les analyses.',0,'2026-04-27T15:10:00.000Z'),
    ('msg-9','conv-3','patient','Docteur, est-ce que je dois modifier ma dose de Metformine ? Ma glycémie était à 1.10 hier.',1,'2026-04-20T10:30:00.000Z'),
    ('msg-10','conv-3','doctor','Non, ne modifiez pas la dose sans consultation. Continuez à 500mg et notez vos mesures. À bientôt pour le suivi.',1,'2026-04-20T11:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_medical_history (id, patient_id, type, title, occurred_at, doctor_name) VALUES
    ('history-1','patient-demo','consultation','Consultation cardiologie','2026-04-20T09:30:00.000Z','Dr. Aïcha Touré'),
    ('history-2','patient-demo','lab','Bilan sanguin','2026-04-18T07:45:00.000Z','Laboratoire PISAM')
  `);

  await conn.query(`
    INSERT INTO nova_lab_results (id, patient_id, title, lab_name, ordered_by, performed_at, status, notes) VALUES
    ('lr-1','patient-demo','Bilan métabolique complet','Laboratoire PISAM','Dr. Mariam Bamba','2026-04-18T07:45:00.000Z','available','Prélèvement à jeun depuis 12h.'),
    ('lr-2','patient-demo','Numération formule sanguine (NFS)','Laboratoire PISAM','Dr. Aïcha Touré','2026-03-10T08:00:00.000Z','reviewed','Résultats normaux dans l''ensemble.'),
    ('lr-3','patient-demo','Bilan lipidique','Laboratoire CHU Treichville','Dr. Yao Konan','2026-01-22T07:30:00.000Z','reviewed',NULL)
  `);

  await conn.query(`
    INSERT INTO nova_lab_result_items (id, lab_result_id, name, value, unit, ref_min, ref_max, status) VALUES
    ('lri-1','lr-1','Glycémie à jeun','1.10','g/L','0.70','1.10','high'),
    ('lri-2','lr-1','Créatinine','9.2','mg/L','6.0','11.0','normal'),
    ('lri-3','lr-1','Acide urique','65','mg/L','35','70','normal'),
    ('lri-4','lr-1','ALAT (TGP)','42','UI/L','0','40','high'),
    ('lri-5','lr-1','ASAT (TGO)','35','UI/L','0','40','normal'),
    ('lri-6','lr-2','Hémoglobine','13.8','g/dL','13.0','17.0','normal'),
    ('lri-7','lr-2','Globules blancs','7.2','10³/µL','4.0','10.0','normal'),
    ('lri-8','lr-2','Plaquettes','285','10³/µL','150','400','normal'),
    ('lri-9','lr-2','Hématocrite','41','%','40','52','normal'),
    ('lri-10','lr-3','Cholestérol total','2.10','g/L','0','2.00','high'),
    ('lri-11','lr-3','LDL Cholestérol','1.35','g/L','0','1.30','high'),
    ('lri-12','lr-3','HDL Cholestérol','0.48','g/L','0.45','0','normal'),
    ('lri-13','lr-3','Triglycérides','1.85','g/L','0','1.50','high')
  `);

  await conn.query(`
    INSERT INTO nova_medical_profile (patient_id, allergies, chronic_diseases, family_history, surgical_history, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, ['patient-demo',
    JSON.stringify([
      { id: 'al-1', name: 'Pénicilline', severity: 'severe', reaction: 'Choc anaphylactique' },
      { id: 'al-2', name: 'Aspirine', severity: 'moderate', reaction: 'Urticaire, difficultés respiratoires' },
      { id: 'al-3', name: 'Arachides', severity: 'mild', reaction: 'Éruption cutanée' },
    ]),
    JSON.stringify([
      { id: 'cd-1', name: 'Hypertension artérielle', diagnosedAt: '2024-01-08', status: 'active', doctor: 'Dr. Aïcha Touré' },
      { id: 'cd-2', name: 'Diabète de type 2', diagnosedAt: '2023-03-14', status: 'controlled', doctor: 'Dr. Mariam Bamba' },
    ]),
    JSON.stringify([
      { id: 'fh-1', relation: 'Père', condition: 'Hypertension artérielle, AVC à 68 ans' },
      { id: 'fh-2', relation: 'Mère', condition: 'Diabète de type 2' },
      { id: 'fh-3', relation: 'Frère aîné', condition: 'Hypercholestérolémie' },
    ]),
    JSON.stringify([
      { id: 'sh-1', procedure: 'Appendicectomie', date: '2005-07-12', hospital: 'CHU de Treichville', notes: 'Sans complication' },
    ]),
    new Date().toISOString()
  ]);

  await conn.query(`
    INSERT INTO nova_prescriptions (id, patient_id, doctor_name, doctor_specialty, issued_at, valid_until, status, notes) VALUES
    ('presc-1','patient-demo','Dr. Aïcha Touré','Cardiologie','2026-04-20T09:30:00.000Z','2026-07-20T00:00:00.000Z','active','Renouvellement possible après bilan de contrôle.'),
    ('presc-2','patient-demo','Dr. Mariam Bamba','Endocrinologie','2026-03-14T10:00:00.000Z','2026-06-14T00:00:00.000Z','active','Contrôle glycémie mensuel obligatoire.'),
    ('presc-3','patient-demo','Dr. Yao Konan','Médecine générale','2026-01-10T08:00:00.000Z','2026-02-10T00:00:00.000Z','expired','Traitement terminé, symptômes résolus.')
  `);

  await conn.query(`
    INSERT INTO nova_prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions) VALUES
    ('pi-1','presc-1','Amlodipine','5 mg','1 comprimé le matin','3 mois','Prendre avec un verre d''eau, éviter le jus de pamplemousse.'),
    ('pi-2','presc-1','Aspirine','100 mg','1 comprimé le soir','3 mois','À prendre après le repas du soir.'),
    ('pi-3','presc-2','Metformine','500 mg','2 comprimés par jour (matin et soir)','3 mois','Prendre pendant le repas pour éviter les troubles digestifs.'),
    ('pi-4','presc-2','Vitamine D3','1000 UI','1 capsule le matin','3 mois','Avec un repas contenant des graisses.'),
    ('pi-5','presc-3','Amoxicilline','500 mg','3 comprimés par jour','7 jours','Finir le traitement complet même si amélioration avant la fin.'),
    ('pi-6','presc-3','Ibuprofène','400 mg','1 comprimé toutes les 8h si douleur','7 jours','Ne pas dépasser 3 comprimés par jour. Prendre après repas.')
  `);

  await conn.query(`
    INSERT INTO nova_notes (id, patient_id, title, content, color, pinned, updated_at) VALUES
    ('note-1','patient-demo','Questions cardiologue','Parler des palpitations matinales.','amber',1,'2026-04-28T08:00:00.000Z'),
    ('note-2','patient-demo','Alimentation','Réduire le sel cette semaine.','emerald',0,'2026-04-27T16:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_patient_settings (patient_id, settings_json, updated_at) VALUES (?, ?, ?)
  `, ['patient-demo', JSON.stringify({
    notifications: { appointments: true, medications: true, messages: true },
    privacy: { emergencyQr: true, shareWithDoctors: true },
    display: { language: 'fr', density: 'comfortable' },
  }), now]);
}

async function seedVitalHistory(conn) {
  // 30 days of vitals history (April 22 → May 21, 2026)
  const bpValues    = ['12/8','13/8','12/8','12/7','13/9','13/8','12/8','14/9','13/8','12/8','12/7','13/8','12/8','13/8','12/7','12/8','13/8','12/8','14/8','13/8','12/8','13/9','12/8','12/8','13/8','12/7','12/8','13/8','12/8','12/8'];
  const glucoseVals = [1.10,1.05,1.00,0.98,0.97,0.96,1.02,1.05,1.00,0.99,0.97,0.98,1.01,1.03,0.99,0.97,0.96,1.00,1.04,1.02,0.99,0.98,0.97,0.96,1.00,1.01,0.99,0.98,0.97,0.96];
  const hrValues    = [70,72,71,73,72,71,74,73,72,71,70,72,71,73,74,72,71,70,73,72,71,70,72,74,73,72,71,70,71,72];
  const tempValues  = [36.7,36.8,36.9,36.8,36.7,36.8,36.7,36.9,36.8,36.7,36.8,36.7,36.9,36.8,36.7,36.8,36.7,36.9,37.0,36.8,36.7,36.8,36.9,36.8,36.7,36.8,36.7,36.8,36.9,36.8];

  const vitals = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date('2026-04-22T00:00:00.000Z');
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10).replace(/-/g, '');
    const iso = d.toISOString();
    vitals.push([`vital-bp-${ds}`,     'patient-demo','blood_pressure','Tension artérielle', bpValues[i],          'mmHg', iso.replace('T00', 'T07').replace('.000Z', ':30:00.000Z')]);
    vitals.push([`vital-gl-${ds}`,     'patient-demo','blood_glucose',  'Glycémie',           String(glucoseVals[i]),'g/L',  iso.replace('T00', 'T07').replace('.000Z', ':35:00.000Z')]);
    vitals.push([`vital-hr-${ds}`,     'patient-demo','heart_rate',     'Fréquence cardiaque',String(hrValues[i]),   'bpm',  iso.replace('T00', 'T07').replace('.000Z', ':40:00.000Z')]);
    vitals.push([`vital-tmp-${ds}`,    'patient-demo','temperature',    'Température',        String(tempValues[i]), '°C',   iso.replace('T00', 'T07').replace('.000Z', ':45:00.000Z')]);
  }

  for (const row of vitals) {
    await conn.query(
      `INSERT IGNORE INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at) VALUES (?,?,?,?,?,?,?)`,
      row
    );
  }
}

async function seedDoctors(conn) {
  const [[existing]] = await conn.query('SELECT id FROM nova_doctors LIMIT 1');
  if (existing) return;

  const doctors = [
    ['doc-001','Abdoulaye','Koné','Cardiologie','Cardiologie interventionnelle','Abidjan - Plateau','Immeuble Médical, Av. Terrasson de Fougères','+225 27 20 31 00 01',4.9,127,18,'fr',6,'Spécialiste en maladies cardiovasculaires avec 18 ans d\'expérience. Ancien interne à l\'Hôpital de Paris.','AK','red',25000,1],
    ['doc-002','Mariam','Touré','Gynécologie-Obstétrique','Grossesse à risque','Abidjan - Cocody','Clinique Sainte Marie, Cocody','+225 27 22 44 33 00',4.8,98,12,'fr',4,'Gynécologue obstétricienne dédiée à la santé maternelle et féminine.','MT','purple',20000,1],
    ['doc-003','Sékou','Bamba','Médecine générale',null,'Abidjan - Yopougon','Centre de Santé de Yopougon','+225 27 23 55 66 77',4.7,203,8,'fr',3,'Médecin généraliste de proximité, prise en charge globale du patient.','SB','blue',10000,1],
    ['doc-004','Ibrahim','Coulibaly','Endocrinologie','Diabétologie','Abidjan - Deux-Plateaux','Clinique les 2 Plateaux','+225 27 22 41 00 30',4.8,76,15,'fr',5,'Expert en diabète et maladies métaboliques. Formé à l\'Université de Bordeaux.','IC','orange',22000,1],
    ['doc-005','Fatou','Ouattara','Pédiatrie','Néonatologie','Abidjan - Treichville','CHU de Treichville, Pédiatrie','+225 27 21 75 12 12',4.9,154,10,'fr',3,'Pédiatre passionnée par le suivi de l\'enfant de la naissance à l\'adolescence.','FO','emerald',15000,1],
    ['doc-006','Amadou','Diallo','Neurologie',null,'Abidjan - Marcory','Clinique Marcory','+225 27 21 26 00 90',4.6,45,20,'fr,en',6,'Neurologue spécialisé dans les AVC, l\'épilepsie et les céphalées chroniques.','AD','indigo',30000,0],
    ['doc-007','Paul','N\'Goran','Dermatologie','Dermatologie esthétique','Abidjan - Cocody','Dermacos, Riviera 2','+225 27 22 49 17 17',4.7,89,14,'fr',4,'Dermatologue expert en maladies cutanées et en dermatologie esthétique.','PN','pink',18000,1],
    ['doc-008','Marie-Hélène','Koffi','Ophtalmologie',null,'Abidjan - Plateau','Cabinet Ophtalmologique du Plateau','+225 27 20 32 44 55',4.8,112,16,'fr',5,'Ophtalmologue spécialiste des troubles de la vision et de la chirurgie oculaire.','MK','cyan',20000,1],
  ];

  for (const [id,fn,ln,sp,subsp,city,addr,ph,rat,rev,exp,lang,fee_k,bio,init,color,fee,cmu] of doctors) {
    await conn.query(
      `INSERT IGNORE INTO nova_doctors (id,first_name,last_name,specialty,sub_specialty,city,address,phone,rating,reviews_count,experience_years,languages,bio,avatar_initials,avatar_color,consultation_fee,accepts_cmu,is_available)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,fn,ln,sp,subsp,city,addr,ph,rat,rev,exp,lang,bio,init,color,fee,cmu,1]
    );
  }

  // Generate slots for next 14 days for each doctor
  const times = ['08:00','08:30','09:00','09:30','10:00','10:30','14:00','14:30','15:00','15:30','16:00','16:30'];
  const docIds = doctors.map(d => d[0]);
  const today = new Date('2026-05-29T00:00:00.000Z');

  for (const docId of docIds) {
    for (let d = 1; d <= 14; d++) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      const dow = dt.getDay();
      if (dow === 0) continue; // skip Sunday
      const dateStr = dt.toISOString().slice(0, 10);
      const dayTimes = dow === 6 ? times.slice(0, 6) : times; // Saturday: morning only
      for (const t of dayTimes) {
        const slotId = `slot-${docId}-${dateStr}-${t.replace(':', '')}`;
        await conn.query(
          `INSERT IGNORE INTO nova_doctor_slots (id, doctor_id, slot_date, slot_time, status) VALUES (?,?,?,?,'available')`,
          [slotId, docId, dateStr, t]
        );
      }
    }
  }
}

async function seedNotifications(conn) {
  const [[existing]] = await conn.query('SELECT id FROM nova_notifications LIMIT 1');
  if (existing) return;

  const now = new Date();
  const notifs = [
    ['notif-001','patient-demo','appointment','RDV demain à 10h00','Dr. Koné Abdoulaye – Cardiologie – Clinique du Plateau','rdv', '2026-05-28T08:00:00.000Z'],
    ['notif-002','patient-demo','medication','Médicament manqué','Vous n\'avez pas pris votre Metformine ce soir.','pilulier', '2026-05-28T21:00:00.000Z'],
    ['notif-003','patient-demo','vaccine','Vaccin à renouveler','Votre vaccin contre la fièvre typhoïde arrive à expiration dans 30 jours.','vaccinations', '2026-05-27T09:00:00.000Z'],
    ['notif-004','patient-demo','message','Nouveau message','Dr. Coulibaly Ibrahim vous a répondu.','messages', '2026-05-27T14:30:00.000Z'],
    ['notif-005','patient-demo','result','Résultats disponibles','Votre bilan lipidique du 25/05/2026 est prêt.','labresults', '2026-05-25T16:00:00.000Z'],
  ];

  for (const [id, pid, type, title, body, link, created_at] of notifs) {
    await conn.query(
      `INSERT IGNORE INTO nova_notifications (id,patient_id,type,title,body,link_page,is_read,created_at) VALUES (?,?,?,?,?,?,0,?)`,
      [id, pid, type, title, body, link, created_at]
    );
  }
}

async function seedWellnessGoals(conn) {
  const [[existing]] = await conn.query('SELECT id FROM nova_wellness_goals LIMIT 1');
  if (existing) return;

  const now = new Date().toISOString();
  const goals = [
    ['wg-001','patient-demo','steps',       'Pas quotidiens',      10000, 6200, 'pas',   'Activity', 'blue',    0, now, now],
    ['wg-002','patient-demo','water',        'Hydratation',         2500,  1800, 'mL',    'Droplet',  'cyan',    0, now, now],
    ['wg-003','patient-demo','sleep',        'Sommeil',             8,     6.5,  'h',     'Moon',     'indigo',  0, now, now],
    ['wg-004','patient-demo','weight',       'Objectif poids',      80,    86,   'kg',    'Scale',    'amber',   0, now, now],
    ['wg-005','patient-demo','blood_pressure','Tension cible',      13,    12.5, 'cmHg',  'HeartPulse','red',   0, now, now],
  ];

  for (const [id,pid,type,title,target,current,unit,icon,color,completed,created_at,updated_at] of goals) {
    await conn.query(
      `INSERT IGNORE INTO nova_wellness_goals (id,patient_id,type,title,target,current_value,unit,icon,color,completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,pid,type,title,target,current,unit,icon,color,completed,created_at,updated_at]
    );
  }
}

async function seedUsers(conn) {
  const codeHash = await bcrypt.hash('0000', 10);
  const now = new Date().toISOString();
  const users = [
    ['user-001', '0789452311', 'patient', 'patient-demo', 'Kouamé Bamba', 'KB'],
    ['user-002', '0102030405', 'patient', 'patient-demo', 'Adjoua Koné',  'AK'],
  ];
  for (const [id, phone, role, patientId, name, avatar] of users) {
    await conn.query(
      `INSERT INTO nova_users (id, phone, code_hash, role, patient_id, name, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), name = VALUES(name), avatar = VALUES(avatar)`,
      [id, phone, codeHash, role, patientId, name, avatar, now]
    );
  }
}

async function seedInsurance(conn) {
  const [[existing]] = await conn.query('SELECT id FROM nova_insurance LIMIT 1');
  if (existing) return;

  const insurances = [
    ['ins-001', 'patient-demo', 'MUGEFCI',  'MUG-2024-0098723',    'BAMBA Kouamé', 'Hospitalisation + Consultations',      '2024-01-01', '2026-12-31', 'active', 80, 'blue'],
    ['ins-002', 'patient-demo', 'CNAMGS',   'CMU-CI-2024-0847-3692','BAMBA Kouamé', 'CMU – Couverture Maladie Universelle',  '2024-03-15', '2027-03-15', 'active', 70, 'emerald'],
  ];
  for (const [id, pid, provider, policy, holder, coverage, from, to, status, rate, color] of insurances) {
    await conn.query(
      `INSERT IGNORE INTO nova_insurance (id,patient_id,provider,policy_number,holder_name,coverage_type,valid_from,valid_to,status,reimbursement_rate,logo_color) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, pid, provider, policy, holder, coverage, from, to, status, rate, color]
    );
  }
}

async function seedPharmacies(conn) {
  const [[existing]] = await conn.query('SELECT id FROM nova_pharmacies LIMIT 1');
  if (existing) return;

  const pharmacies = [
    ['ph-001','Pharmacie du Plateau',         'Avenue Botreau-Roussel, Plateau',         'Abidjan - Plateau',       '+225 27 20 31 47 00',1,'07:30','21:00',1,1.2],
    ['ph-002','Pharmacie Princesse',           'Rue des Jardins, Cocody',                 'Abidjan - Cocody',        '+225 27 22 44 08 08',1,'08:00','22:00',0,2.8],
    ['ph-003','Pharmacie PISAM',               'Bd Latrille, en face du PISAM',           'Abidjan - Cocody',        '+225 27 22 41 19 60',1,'07:00','23:00',0,3.1],
    ['ph-004','Pharmacie de Yopougon-Maroc',   'Quartier Maroc, Yopougon',                'Abidjan - Yopougon',      '+225 27 23 51 43 43',1,'08:00','21:00',0,7.4],
    ['ph-005','Pharmacie Sainte Famille',      'Rue 12, Treichville',                     'Abidjan - Treichville',   '+225 27 21 24 07 07',0,'08:30','20:00',0,5.0],
    ['ph-006','Pharmacie Abobo Centre',        'Avenue principale, Abobo-Gare',           'Abidjan - Abobo',         '+225 27 23 80 10 10',1,'07:30','21:30',0,9.2],
    ['ph-007','Pharmacie Marcory Santé',       'Carrefour Marcory, Bd VGE',               'Abidjan - Marcory',       '+225 27 21 26 55 55',1,'08:00','22:00',0,4.6],
    ['ph-008','Pharmacie Deux-Plateaux',       'Rue des Combattants, Deux-Plateaux',      'Abidjan - Deux-Plateaux', '+225 27 22 41 77 88',1,'08:00','20:30',0,3.9],
  ];
  for (const [id,name,address,city,phone,isOpen,opens,closes,isDuty,dist] of pharmacies) {
    await conn.query(
      `INSERT IGNORE INTO nova_pharmacies (id,name,address,city,phone,is_open,opens_at,closes_at,is_duty,distance_km) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id,name,address,city,phone,isOpen,opens,closes,isDuty,dist]
    );
  }
}

async function seedDoctorUser(conn) {
  const codeHash = await bcrypt.hash('0000', 10);
  const now = new Date().toISOString();
  await conn.query(
    `INSERT INTO nova_users (id,phone,code_hash,role,patient_id,doctor_id,name,avatar,created_at) VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), name = VALUES(name), avatar = VALUES(avatar)`,
    ['user-doc-001','0601234567',codeHash,'doctor',null,'doc-001','Dr. Aïcha Touré','AT',now]
  );
  await conn.query(
    `INSERT INTO nova_users (id,phone,code_hash,role,patient_id,doctor_id,pharmacy_id,name,avatar,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), pharmacy_id = VALUES(pharmacy_id), name = VALUES(name), avatar = VALUES(avatar)`,
    ['user-ph-001','0700000002',codeHash,'pharmacist',null,null,'ph-001','Pharmacie du Plateau','PH',now]
  );
  await conn.query(
    `INSERT INTO nova_users (id,phone,code_hash,role,patient_id,doctor_id,pharmacy_id,name,avatar,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), name = VALUES(name), avatar = VALUES(avatar)`,
    ['user-admin-001','0700000001',codeHash,'admin',null,null,null,'Admin Système','AS',now]
  );
  await conn.query(`UPDATE nova_users SET password_hash = ? WHERE id = 'user-doc-001'`, [codeHash]);
  await conn.query(`UPDATE nova_doctors SET email = COALESCE(email, 'aicha.toure@nova.ci') WHERE id = 'doc-001'`);
}

async function seedDoctorData(conn) {
  const [[existing]] = await conn.query(`SELECT id FROM nova_consultations LIMIT 1`);
  if (existing) return;

  // Lier les rendez-vous existants au médecin doc-001
  await conn.query(`UPDATE nova_appointments SET doctor_id = 'doc-001' WHERE id = 'apt-1'`);
  await conn.query(`UPDATE nova_appointments SET doctor_id = 'doc-001' WHERE id = 'apt-3' AND doctor_id IS NULL`);

  // Ajouter des RDV supplémentaires pour doc-001 avec patient-demo
  const now = new Date();
  const tomorrow  = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek  = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

  const appts = [
    ['apt-doc-1','patient-demo',tomorrow.toISOString().replace(/T.*/, 'T09:00:00.000Z'),'Dr. Aïcha Touré','Cardiologie','CHU Treichville','onsite','confirmed','doc-001'],
    ['apt-doc-2','patient-demo',tomorrow.toISOString().replace(/T.*/, 'T10:30:00.000Z'),'Dr. Aïcha Touré','Cardiologie','Téléconsultation','video','confirmed','doc-001'],
    ['apt-doc-3','patient-demo',nextWeek.toISOString().replace(/T.*/, 'T14:00:00.000Z'),'Dr. Aïcha Touré','Cardiologie','CHU Treichville','onsite','requested','doc-001'],
    ['apt-doc-4','patient-demo',yesterday.toISOString().replace(/T.*/, 'T09:30:00.000Z'),'Dr. Aïcha Touré','Cardiologie','CHU Treichville','onsite','confirmed','doc-001'],
  ];
  for (const [id,pid,sat,dn,sp,loc,mode,status,docId] of appts) {
    await conn.query(
      `INSERT IGNORE INTO nova_appointments (id,patient_id,starts_at,doctor_name,specialty,location,mode,status,doctor_id) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id,pid,sat,dn,sp,loc,mode,status,docId]
    );
  }

  // Consultations démo pour doc-001
  const consultations = [
    ['cons-001','patient-demo','doc-001',
     'Suivi hypertension artérielle – palpitations matinales signalées',
     'Hypertension artérielle stade 1','Troubles du rythme légers',
     'PA mesurée à 145/92 mmHg. Patient sous Amlodipine 5mg. Bonne compliance thérapeutique.',
     'Continuer le traitement actuel. Réduire sel <5g/j. Contrôle dans 4 semaines.',
     'completed', yesterday.toISOString().replace(/T.*/, 'T09:30:00.000Z'), yesterday.toISOString().replace(/T.*/, 'T10:00:00.000Z')],
    ['cons-002','patient-demo','doc-001',
     'Bilan cardiaque annuel',
     'Cardiomyopathie hypertensive légère',null,
     'ECG normal. Échographie cardiaque : FE 62%. Légère hypertrophie du VG.',
     'Maintenir traitement antihypertenseur. ECG de contrôle à 6 mois.',
     'completed','2026-04-20T09:30:00.000Z','2026-04-20T10:15:00.000Z'],
    ['cons-003','patient-demo','doc-001',
     'Douleurs thoraciques atypiques',
     'Douleurs thoraciques fonctionnelles',null,
     'Douleurs non coronariennes à l\'effort. Troponines normales. ECG de repos normal.',
     'Épreuve d\'effort programmée. Éviter le stress. Paracétamol si douleur.',
     'completed','2026-03-05T14:00:00.000Z','2026-03-05T14:45:00.000Z'],
  ];
  for (const [id,pid,did,motif,dm,ds,notes,reco,status,started,completed] of consultations) {
    await conn.query(
      `INSERT IGNORE INTO nova_consultations (id,patient_id,doctor_id,motif,diagnosis_main,diagnosis_secondary,notes,recommendations,status,started_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id,pid,did,motif,dm,ds,notes,reco,status,started,completed]
    );
  }

  // Réputation
  const ratings = [
    ['rep-001','doc-001','patient-demo','cons-002',4.9,'Excellent médecin, très à l\'écoute.','2026-04-21T08:00:00.000Z'],
    ['rep-002','doc-001','patient-demo','cons-003',4.7,'Diagnostic rapide et précis.','2026-03-06T10:00:00.000Z'],
  ];
  for (const [id,did,pid,cid,rating,comment,created] of ratings) {
    await conn.query(
      `INSERT IGNORE INTO nova_doctor_reputation (id,doctor_id,patient_id,consultation_id,rating,comment,created_at) VALUES (?,?,?,?,?,?,?)`,
      [id,did,pid,cid,rating,comment,created]
    );
  }
}

/* ═══════════════════════════════════════════════════════════════
   SEED RBAC — Rôles et Permissions
   ═══════════════════════════════════════════════════════════════ */
async function seedRbac(conn) {
  const [[existing]] = await conn.query('SELECT id FROM nova_roles LIMIT 1');
  if (existing) return;

  // Rôles
  const roles = [
    ['role-patient',    'patient',    'Accès espace patient'],
    ['role-doctor',     'doctor',     'Accès espace médecin'],
    ['role-pharmacist', 'pharmacist', 'Accès espace pharmacie'],
    ['role-admin',      'admin',      'Accès complet administration'],
  ];
  for (const [id, name, desc] of roles) {
    await conn.query('INSERT IGNORE INTO nova_roles (id, name, description) VALUES (?, ?, ?)', [id, name, desc]);
  }

  // Permissions
  const permissions = [
    // Patient
    ['perm-p-dashboard',   'patient.dashboard',        'Voir tableau de bord patient',     'patient'],
    ['perm-p-profile',     'patient.profile',           'Voir/modifier profil',             'patient'],
    ['perm-p-vitals',      'patient.vitals',            'Voir/ajouter constantes',          'patient'],
    ['perm-p-appointments','patient.appointments',      'Gérer rendez-vous',                'patient'],
    ['perm-p-prescriptions','patient.prescriptions',    'Voir ordonnances',                 'patient'],
    ['perm-p-documents',   'patient.documents',         'Gérer documents',                  'patient'],
    ['perm-p-messages',    'patient.messages',          'Messagerie',                       'patient'],
    ['perm-p-labresults',  'patient.lab_results',       'Voir résultats labo',              'patient'],
    ['perm-p-consents',    'patient.consents',          'Gérer consentements accès',        'patient'],
    ['perm-p-family',      'patient.family',            'Gérer dossier familial',           'patient'],
    // Doctor
    ['perm-d-dashboard',   'doctor.dashboard',          'Voir tableau de bord médecin',     'doctor'],
    ['perm-d-patients',    'doctor.patients',           'Voir patients autorisés',          'doctor'],
    ['perm-d-patients-c',  'doctor.patients.create',    'Créer un patient',                 'doctor'],
    ['perm-d-consult',     'doctor.consultations',      'Gérer consultations',              'doctor'],
    ['perm-d-prescribe',   'doctor.prescriptions',      'Créer ordonnances',                'doctor'],
    ['perm-d-lab',         'doctor.lab_requests',       'Prescrire examens',                'doctor'],
    ['perm-d-alerts',      'doctor.alerts',             'Gérer alertes',                    'doctor'],
    ['perm-d-consents',    'doctor.consents.request',   'Demander accès dossier',           'doctor'],
    // Pharmacy
    ['perm-ph-verify',     'pharmacy.verify',           'Vérifier ordonnance QR',           'pharmacy'],
    ['perm-ph-dispense',   'pharmacy.dispense',         'Délivrer ordonnance',              'pharmacy'],
    ['perm-ph-history',    'pharmacy.history',          'Voir historique délivrances',      'pharmacy'],
    // Admin
    ['perm-a-users',       'admin.users',               'Gérer utilisateurs',               'admin'],
    ['perm-a-doctors',     'admin.doctors.validate',    'Valider médecins',                 'admin'],
    ['perm-a-pharmacies',  'admin.pharmacies',          'Gérer pharmacies',                 'admin'],
    ['perm-a-roles',       'admin.roles',               'Gérer rôles/permissions',          'admin'],
    ['perm-a-audit',       'admin.audit_logs',          'Voir audit logs',                  'admin'],
    ['perm-a-stats',       'admin.stats',               'Voir statistiques plateforme',     'admin'],
  ];
  for (const [id, code, desc, module] of permissions) {
    await conn.query('INSERT IGNORE INTO nova_permissions (id, code, description, module) VALUES (?, ?, ?, ?)', [id, code, desc, module]);
  }

  // Associations rôle ↔ permissions
  const rolePerms = {
    'role-patient':    permissions.filter(p => p[3] === 'patient').map(p => p[0]),
    'role-doctor':     permissions.filter(p => p[3] === 'doctor').map(p => p[0]),
    'role-pharmacist': permissions.filter(p => p[3] === 'pharmacy').map(p => p[0]),
    'role-admin':      permissions.map(p => p[0]), // Admin a TOUTES les permissions
  };
  for (const [roleId, permIds] of Object.entries(rolePerms)) {
    for (const permId of permIds) {
      await conn.query(
        'INSERT IGNORE INTO nova_role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permId]
      );
    }
  }
}

async function addForeignKeys(conn) {
  const foreignKeys = [
    `ALTER TABLE nova_vitals ADD CONSTRAINT fk_nv_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_treatments ADD CONSTRAINT fk_nt_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_medication_schedules ADD CONSTRAINT fk_nms_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_appointments ADD CONSTRAINT fk_na_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_appointments ADD CONSTRAINT fk_na_doctor FOREIGN KEY (doctor_id) REFERENCES nova_doctors(id) ON DELETE SET NULL`,
    `ALTER TABLE nova_users ADD CONSTRAINT fk_nu_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE SET NULL`,
    `ALTER TABLE nova_users ADD CONSTRAINT fk_nu_doctor FOREIGN KEY (doctor_id) REFERENCES nova_doctors(id) ON DELETE SET NULL`,
    `ALTER TABLE nova_users ADD CONSTRAINT fk_nu_pharmacy FOREIGN KEY (pharmacy_id) REFERENCES nova_pharmacies(id) ON DELETE SET NULL`,
    `ALTER TABLE nova_consultations ADD CONSTRAINT fk_ncons_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_consultations ADD CONSTRAINT fk_ncons_doctor FOREIGN KEY (doctor_id) REFERENCES nova_doctors(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_prescriptions ADD CONSTRAINT fk_np_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_prescriptions ADD CONSTRAINT fk_np_doctor FOREIGN KEY (doctor_id) REFERENCES nova_doctors(id) ON DELETE SET NULL`,
    `ALTER TABLE nova_lab_requests ADD CONSTRAINT fk_nlrq_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_lab_requests ADD CONSTRAINT fk_nlrq_doctor FOREIGN KEY (doctor_id) REFERENCES nova_doctors(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_pharmacy_orders ADD CONSTRAINT fk_npo_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_pharmacy_orders ADD CONSTRAINT fk_npo_pharmacy FOREIGN KEY (pharmacy_id) REFERENCES nova_pharmacies(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_dispenses ADD CONSTRAINT fk_ndisp_patient FOREIGN KEY (patient_id) REFERENCES nova_patients(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_dispenses ADD CONSTRAINT fk_ndisp_pharmacy FOREIGN KEY (pharmacy_id) REFERENCES nova_pharmacies(id) ON DELETE CASCADE`,
    `ALTER TABLE nova_dispenses ADD CONSTRAINT fk_ndisp_prescription FOREIGN KEY (prescription_id) REFERENCES nova_prescriptions(id) ON DELETE CASCADE`,
  ];

  for (const sql of foreignKeys) {
    await conn.query(sql).catch(() => {});
  }
}
