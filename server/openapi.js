const patientProfileExample = {
  id: 'patient-demo',
  cmuNumber: 'CI-2024-0847-3692',
  firstName: 'Kouamé',
  lastName: 'Bamba',
  birthDate: '1974-03-15',
  sex: 'M',
  bloodType: 'O+',
  phone: '0789452311',
  email: 'k.bamba@example.ci',
  address: 'Cocody, Rue des Jardins',
  city: 'Abidjan',
  weightKg: 78,
  heightCm: 175,
};

const treatmentExample = {
  id: 'treatment-1',
  diagnosis: 'Hypertension artérielle',
  status: 'active',
  stage: 'Stade 1',
  progress: 75,
  doctorName: 'Dr. Aïcha Touré',
};

const medicationScheduleExample = {
  id: 'schedule-1',
  medicationId: 'med-1',
  name: 'Amlodipine',
  dosage: '5mg',
  time: '08:00',
  period: 'Matin',
  color: 'blue',
  interaction: false,
};

const appointmentExample = {
  id: 'apt-1',
  startsAt: '2026-05-02T14:30:00.000Z',
  doctorName: 'Dr. Aïcha Touré',
  specialty: 'Cardiologie',
  location: 'CHU Treichville',
  mode: 'onsite',
  status: 'confirmed',
};

const noteExample = {
  id: 'note-1',
  title: 'Questions cardiologue',
  content: 'Parler des palpitations matinales.',
  color: 'amber',
  pinned: true,
  updatedAt: '2026-04-28T08:00:00.000Z',
};

const settingsExample = {
  notifications: { appointments: true, medications: true, messages: true },
  privacy: { emergencyQr: true, shareWithDoctors: true },
  display: { language: 'fr', density: 'comfortable' },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NOVA API — Carnet Santé Ivoirien',
    version: '1.0.0',
    description: 'API complète de la plateforme NOVA. Espaces : Patient, Médecin, Pharmacie, Admin.',
  },
  servers: [
    { url: 'http://localhost:4001/api', description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Vérification état API' },
    { name: 'Auth', description: 'Authentification, OTP, tokens' },
    { name: 'Patient', description: 'Espace patient — dossier médical, RDV, ordonnances' },
    { name: 'Doctor', description: 'Espace médecin — consultations, prescriptions, patients' },
    { name: 'Pharmacy', description: 'Espace pharmacie — vérification et délivrance ordonnances' },
    { name: 'Admin', description: 'Administration — utilisateurs, rôles, audit' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasMore: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Vérifier que l’API fonctionne',
        responses: {
          200: {
            description: 'API disponible',
            content: {
              'application/json': {
                example: { ok: true, service: 'nova-api' },
              },
            },
          },
        },
      },
    },
    '/patient/me/dashboard': {
      get: {
        tags: ['Patient'],
        summary: 'Résumé complet du tableau de bord patient',
        responses: {
          200: {
            description: 'Dashboard patient',
            content: {
              'application/json': {
                example: {
                  profile: patientProfileExample,
                  healthScore: 82,
                  latestVitals: [
                    { id: 'vital-1', type: 'blood_pressure', label: 'Tension', value: '12/8', unit: 'mmHg', measuredAt: '2026-04-28T07:30:00.000Z' },
                    { id: 'vital-2', type: 'blood_glucose', label: 'Glycémie', value: 0.95, unit: 'g/L', measuredAt: '2026-04-28T07:35:00.000Z' },
                  ],
                  nextAppointment: appointmentExample,
                  todayMedications: [medicationScheduleExample],
                  unreadMessages: 3,
                  documentsCount: 3,
                },
              },
            },
          },
        },
      },
    },
    '/patient/me/profile': {
      get: {
        tags: ['Patient'],
        summary: 'Lire le profil patient connecté',
        responses: {
          200: {
            description: 'Profil patient',
            content: { 'application/json': { example: patientProfileExample } },
          },
        },
      },
      patch: {
        tags: ['Patient'],
        summary: 'Modifier le profil patient connecté',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                phone: '0789452311',
                email: 'kouame.bamba@example.ci',
                address: 'Cocody, Rue des Jardins',
                city: 'Abidjan',
                weightKg: 78,
                heightCm: 175,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profil mis à jour',
            content: { 'application/json': { example: patientProfileExample } },
          },
          422: { description: 'Erreur de validation' },
        },
      },
    },
    '/patient/me/vitals': {
      get: {
        tags: ['Patient'],
        summary: 'Lister les constantes médicales',
        parameters: [
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature'] },
          },
        ],
        responses: {
          200: {
            description: 'Constantes',
            content: {
              'application/json': {
                example: [
                  { id: 'vital-1', type: 'blood_pressure', label: 'Tension', value: '12/8', unit: 'mmHg', measuredAt: '2026-04-28T07:30:00.000Z' },
                ],
              },
            },
          },
        },
      },
    },
    '/patient/me/treatments': listEndpoint('Patient', 'Lister les traitements actifs', [treatmentExample]),
    '/patient/me/medications/today': listEndpoint('Patient', 'Lister les prises de médicaments du jour', [medicationScheduleExample]),
    '/patient/me/medications/{scheduleId}/intakes': {
      post: {
        tags: ['Patient'],
        summary: 'Marquer une prise de médicament',
        parameters: [
          { name: 'scheduleId', in: 'path', required: true, schema: { type: 'string' }, example: 'schedule-1' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { status: 'taken', takenAt: '2026-04-28T08:00:00.000Z' },
            },
          },
        },
        responses: {
          201: {
            description: 'Prise enregistrée',
            content: {
              'application/json': {
                example: { id: 'intake-1', patientId: 'patient-demo', scheduleId: 'schedule-1', status: 'taken', takenAt: '2026-04-28T08:00:00.000Z' },
              },
            },
          },
        },
      },
    },
    '/patient/me/appointments': listEndpoint('Patient', 'Lister les rendez-vous patient', [appointmentExample]),
    '/patient/me/vaccinations': listEndpoint('Patient', 'Lister les vaccins patient', [
      { id: 'vax-1', name: 'Tétanos', injectedAt: '2026-04-02', status: 'up_to_date', nextDueAt: '2036-04-02' },
    ]),
    '/patient/me/history': listEndpoint('Patient', 'Lister l’historique médical patient', [
      { id: 'history-1', type: 'consultation', title: 'Consultation cardiologie', occurredAt: '2026-04-20T09:30:00.000Z', doctorName: 'Dr. Aïcha Touré' },
    ]),
    '/patient/me/documents': {
      get: {
        tags: ['Patient'],
        summary: 'Lister les documents patient',
        parameters: [
          { name: 'category', in: 'query', required: false, schema: { type: 'string' }, example: 'prescription' },
        ],
        responses: {
          200: {
            description: 'Documents',
            content: {
              'application/json': {
                example: [
                  { id: 'doc-1', title: 'Ordonnance cardiologie', category: 'prescription', mimeType: 'application/pdf', sizeBytes: 245760, createdAt: '2026-04-20T10:00:00.000Z' },
                ],
              },
            },
          },
        },
      },
    },
    '/patient/me/conversations': listEndpoint('Patient', 'Lister les conversations patient', [
      { id: 'conv-1', doctorName: 'Dr. Aïcha Touré', unreadCount: 2, lastMessage: 'Merci de surveiller votre tension.', updatedAt: '2026-04-28T09:00:00.000Z' },
    ]),
    '/patient/me/notes': {
      get: {
        tags: ['Patient'],
        summary: 'Lister les notes patient',
        responses: {
          200: {
            description: 'Notes',
            content: { 'application/json': { example: [noteExample] } },
          },
        },
      },
      post: {
        tags: ['Patient'],
        summary: 'Créer une note patient',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { title: 'Questions cardiologue', content: 'Parler des palpitations matinales.', color: 'amber', pinned: true },
            },
          },
        },
        responses: {
          201: {
            description: 'Note créée',
            content: { 'application/json': { example: noteExample } },
          },
        },
      },
    },
    '/patient/me/notes/{id}': {
      patch: {
        tags: ['Patient'],
        summary: 'Modifier une note patient',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'note-1' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { example: { pinned: false, color: 'emerald' } } },
        },
        responses: {
          200: {
            description: 'Note modifiée',
            content: { 'application/json': { example: noteExample } },
          },
        },
      },
      delete: {
        tags: ['Patient'],
        summary: 'Supprimer une note patient',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'note-1' },
        ],
        responses: { 204: { description: 'Note supprimée' } },
      },
    },
    '/patient/me/settings': {
      get: {
        tags: ['Patient'],
        summary: 'Lire les paramètres patient',
        responses: {
          200: {
            description: 'Paramètres',
            content: { 'application/json': { example: settingsExample } },
          },
        },
      },
      patch: {
        tags: ['Patient'],
        summary: 'Modifier les paramètres patient',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { notifications: { medications: false } },
            },
          },
        },
        responses: {
          200: {
            description: 'Paramètres mis à jour',
            content: { 'application/json': { example: settingsExample } },
          },
        },
      },
    },

    // ═══ Auth ═══════════════════════════════════════════════
    '/auth/otp/send': {
      post: {
        tags: ['Auth'], summary: 'Envoyer OTP', security: [],
        requestBody: { required: true, content: { 'application/json': { example: { phone: '0789452311' } } } },
        responses: { 200: { description: 'OTP envoyé', content: { 'application/json': { example: { otpId: 'uuid', expiresIn: 300 } } } } },
      },
    },
    '/auth/otp/verify': {
      post: {
        tags: ['Auth'], summary: 'Vérifier OTP → tokens', security: [],
        requestBody: { required: true, content: { 'application/json': { example: { phone: '0789452311', code: '1234' } } } },
        responses: { 200: { description: 'Tokens JWT', content: { 'application/json': { example: { token: 'jwt...', refreshToken: 'jwt...', user: { id: 'uuid', role: 'patient', name: 'Kouamé Bamba' } } } } } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Renouveler access token',
        requestBody: { required: true, content: { 'application/json': { example: { refreshToken: 'jwt...' } } } },
        responses: { 200: { description: 'Nouveaux tokens', content: { 'application/json': { example: { token: 'jwt...', refreshToken: 'jwt...' } } } } },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Déconnexion (blacklist token)', responses: { 200: { description: 'OK' } } },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Profil + permissions',
        responses: { 200: { description: 'User info', content: { 'application/json': { example: { id: 'uuid', role: 'patient', permissions: ['patient.dashboard', 'patient.profile'] } } } } },
      },
    },

    // ═══ Doctor ═════════════════════════════════════════════
    '/doctor/me/dashboard': { get: { tags: ['Doctor'], summary: 'Tableau de bord médecin', responses: { 200: { description: 'Dashboard data' } } } },
    '/doctor/me/patients': {
      get: { tags: ['Doctor'], summary: 'Liste patients autorisés', responses: { 200: { description: 'Patients' } } },
      post: { tags: ['Doctor'], summary: 'Créer un patient + envoi OTP', requestBody: { required: true, content: { 'application/json': { example: { firstName: 'Aya', lastName: 'Koné', phone: '0701020304' } } } }, responses: { 201: { description: 'Patient créé' } } },
    },
    '/doctor/me/consultations': {
      get: { tags: ['Doctor'], summary: 'Liste consultations', responses: { 200: { description: 'Consultations' } } },
      post: { tags: ['Doctor'], summary: 'Créer consultation', responses: { 201: { description: 'Consultation créée' } } },
    },
    '/doctor/me/prescriptions': {
      get: { tags: ['Doctor'], summary: 'Liste ordonnances', responses: { 200: { description: 'Ordonnances' } } },
      post: { tags: ['Doctor'], summary: 'Créer ordonnance', responses: { 201: { description: 'Ordonnance créée' } } },
    },
    '/doctor/me/referrals': {
      get: { tags: ['Doctor'], summary: 'Transferts envoyés/reçus', responses: { 200: { description: 'Referrals' } } },
      post: { tags: ['Doctor'], summary: 'Transférer patient vers spécialiste', responses: { 201: { description: 'Transfert créé' } } },
    },
    '/doctor/me/consultation-templates': {
      get: { tags: ['Doctor'], summary: 'Templates consultation', responses: { 200: { description: 'Templates' } } },
      post: { tags: ['Doctor'], summary: 'Créer template', responses: { 201: { description: 'Template créé' } } },
    },
    '/doctor/me/notifications': { get: { tags: ['Doctor'], summary: 'Notifications médecin', responses: { 200: { description: 'Notifications' } } } },

    // ═══ Pharmacy ═══════════════════════════════════════════
    '/pharmacy/me/dashboard': { get: { tags: ['Pharmacy'], summary: 'Dashboard pharmacie', responses: { 200: { description: 'KPIs + récent' } } } },
    '/pharmacy/me/verify-prescription': {
      post: { tags: ['Pharmacy'], summary: 'Vérifier ordonnance (scan QR)',
        requestBody: { required: true, content: { 'application/json': { example: { prescriptionId: 'uuid' } } } },
        responses: { 200: { description: 'Vérification : authenticité, expiration, statut délivrance' } },
      },
    },
    '/pharmacy/me/dispense': {
      post: { tags: ['Pharmacy'], summary: 'Délivrer ordonnance (full/partial/refused)',
        requestBody: { required: true, content: { 'application/json': { example: { prescriptionId: 'uuid', status: 'full', items: [{ prescriptionItemId: 'uuid', quantityDispensed: 1 }] } } } },
        responses: { 201: { description: 'Délivrance enregistrée' } },
      },
    },
    '/pharmacy/me/dispenses': { get: { tags: ['Pharmacy'], summary: 'Historique délivrances', responses: { 200: { description: 'Liste paginée' } } } },

    // ═══ Patient new endpoints ══════════════════════════════
    '/patient/me/consents': { get: { tags: ['Patient'], summary: 'Consentements accès dossier', responses: { 200: { description: 'Liste consentements' } } } },
    '/patient/me/access-logs': { get: { tags: ['Patient'], summary: 'Qui a consulté mon dossier', responses: { 200: { description: 'Access logs' } } } },
    '/patient/me/family': {
      get: { tags: ['Patient'], summary: 'Dossier familial', responses: { 200: { description: 'Membres famille' } } },
      post: { tags: ['Patient'], summary: 'Ajouter membre famille', responses: { 201: { description: 'Membre créé' } } },
    },
    '/patient/me/prescriptions/{id}/qr': { get: { tags: ['Patient'], summary: 'QR code ordonnance (JWT signé)', responses: { 200: { description: 'QR data URL + token' } } } },
  },
};

function listEndpoint(tag, summary, example) {
  return {
    get: {
      tags: [tag],
      summary,
      responses: {
        200: {
          description: summary,
          content: {
            'application/json': { example },
          },
        },
      },
    },
  };
}
