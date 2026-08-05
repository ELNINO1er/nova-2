import { beforeAll, describe, expect, it } from 'vitest';
import { initDb, pool } from '../db/database.js';
import { answerDoctorAssistant, answerPatientAssistant } from '../services/ai.service.js';
import { buildPatientSummaryPdf } from '../services/export.service.js';

beforeAll(async () => {
  await initDb();
});

describe('NOVA guarded assistant', () => {
  it('escalates emergency terms for patients', () => {
    const reply = answerPatientAssistant('douleur poitrine et essoufflement');
    expect(reply.risk).toBe('emergency');
    expect(reply.answer).toContain('urgence');
  });

  it('refuses patient prescription decisions', () => {
    const reply = answerPatientAssistant('quelle dose antibiotique dois-je prendre');
    expect(reply.risk).toBe('warning');
    expect(reply.answer).toContain('diagnostic');
  });

  it('keeps doctor assistant as decision support', () => {
    const reply = answerDoctorAssistant('protocole hypertension');
    expect(reply.disclaimer).toContain('responsable');
    expect(reply.source).toBe('nova_local_knowledge_base');
  });
});

describe('NOVA secure PDF export', () => {
  it('creates a valid minimal PDF buffer for existing seed patient', async () => {
    const [[patient]] = await pool.execute('SELECT id FROM nova_patients LIMIT 1');
    const pdf = await buildPatientSummaryPdf(patient.id);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
