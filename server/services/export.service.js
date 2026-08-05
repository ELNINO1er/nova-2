import { pool } from '../db/database.js';

export async function buildPatientSummaryPdf(patientId) {
  const [[patient]] = await pool.execute('SELECT * FROM nova_patients WHERE id = ?', [patientId]);
  if (!patient) return null;

  const [appointments] = await pool.execute(
    'SELECT starts_at, doctor_name, specialty, status FROM nova_appointments WHERE patient_id = ? ORDER BY starts_at DESC LIMIT 5',
    [patientId]
  );
  const [prescriptions] = await pool.execute(
    'SELECT doctor_name, issued_at, valid_until, status FROM nova_prescriptions WHERE patient_id = ? ORDER BY issued_at DESC LIMIT 5',
    [patientId]
  );

  const lines = [
    'NOVA - Export patient securise',
    `Genere le ${new Date().toLocaleString('fr-FR')}`,
    '',
    `Patient: ${patient.first_name} ${patient.last_name}`,
    `CMU: ${mask(patient.cmu_number)}`,
    `Ville: ${patient.city || '-'}`,
    '',
    'Derniers rendez-vous:',
    ...appointments.map(a => `- ${a.starts_at || '-'} | ${a.doctor_name || '-'} | ${a.specialty || '-'} | ${a.status || '-'}`),
    '',
    'Dernieres ordonnances:',
    ...prescriptions.map(p => `- ${p.issued_at || '-'} | ${p.doctor_name || '-'} | statut ${p.status || '-'}`),
    '',
    'Ce document est personnel. Ne le partagez qu avec un professionnel de sante autorise.',
  ];

  return createSimplePdf(lines);
}

function createSimplePdf(lines) {
  const escapedLines = lines.map(escapePdfText);
  const content = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    ...escapedLines.flatMap((line, index) => [
      index === 0 ? '' : '0 -16 Td',
      `(${line}) Tj`,
    ]).filter(Boolean),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function escapePdfText(value) {
  return String(value || '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function mask(value) {
  const raw = String(value || '');
  if (!raw) return '-';
  return `${'*'.repeat(Math.max(4, raw.length - 4))}${raw.slice(-4)}`;
}
