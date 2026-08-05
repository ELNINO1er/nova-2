const EMERGENCY_TERMS = [
  'douleur poitrine', 'douleur thoracique', 'essoufflement', 'paralysie',
  'avc', 'suicide', 'perte de connaissance', 'convulsion', 'saignement abondant',
  'detresse respiratoire', 'détresse respiratoire',
];

const BLOCKED_CLINICAL_ACTIONS = [
  'diagnostic', 'diagnostiquer', 'prescris', 'prescrire', 'ordonnance',
  'posologie', 'dose', 'antibiotique', 'arreter mon traitement', 'arrêter mon traitement',
];

const PATIENT_ADVICE = [
  {
    tags: ['medicament', 'médicament', 'pilulier', 'comprime', 'comprimé', 'matin', 'soir'],
    answer: "Consultez votre pilulier NOVA pour les horaires de prise du jour. Ne modifiez jamais une dose et n'arretez pas un traitement sans avis medical. En cas d'oubli repete, contactez votre medecin ou votre pharmacien.",
  },
  {
    tags: ['glycemie', 'glycémie', 'glucose', 'diabete', 'diabète'],
    answer: "Pour la glycemie, notez l'heure de mesure, le contexte (a jeun ou apres repas) et vos symptomes eventuels. Une valeur isolee ne suffit pas pour conclure. Demandez une interpretation a votre medecin, surtout si les valeurs sont souvent hautes ou basses.",
  },
  {
    tags: ['tension', 'hypertension', 'pression'],
    answer: "Pour l'hypertension, mesurez votre tension au repos, bras pose, puis notez les valeurs dans NOVA. Limitez le sel, evitez l'automedication anti-inflammatoire et gardez vos rendez-vous de suivi.",
  },
  {
    tags: ['rendez-vous', 'rdv', 'consultation'],
    answer: "Vos rendez-vous sont visibles dans la section Rendez-vous. Si vos symptomes s'aggravent, avancez le rendez-vous ou contactez directement votre medecin.",
  },
  {
    tags: ['analyse', 'resultat', 'résultat', 'labo', 'laboratoire'],
    answer: "Les resultats de laboratoire doivent etre interpretes avec votre contexte clinique, vos traitements et les seuils du laboratoire. NOVA peut vous aider a retrouver le document, mais l'interpretation revient a un professionnel de sante.",
  },
  {
    tags: ['alimentation', 'manger', 'sel', 'sport', 'activité', 'activite'],
    answer: "Conseil prevention general : privilegiez legumes, fruits, proteines maigres, hydratation suffisante et activite physique adaptee. Reduisez sel, alcool, tabac et aliments ultra-transformes.",
  },
];

const DOCTOR_ADVICE = [
  {
    tags: ['hypertension', 'tension'],
    answer: "Aide-memoire hypertension : confirmer les mesures, evaluer observance et facteurs de risque, rechercher atteinte d'organes cibles, planifier bilan renal/lipidique selon contexte et documenter les objectifs de suivi.",
  },
  {
    tags: ['diabete', 'diabète', 'glycemie', 'glycémie', 'hba1c'],
    answer: "Aide-memoire diabete : verifier HbA1c selon equilibre, bilan renal, examen des pieds, fond d'oeil, risque cardio-vasculaire et education therapeutique. Adapter selon recommandations locales et profil patient.",
  },
  {
    tags: ['patient risque', 'risque', 'chronique'],
    answer: "Priorisation suivi : patients chroniques sans visite recente, alertes non resolues, resultats anormaux et faible observance doivent etre revus en premier. Utilisez les alertes NOVA pour tracer la decision.",
  },
  {
    tags: ['prescription', 'ordonnance'],
    answer: "Controle ordonnance : identite patient, date, medicament, dosage, frequence, duree, contre-indications connues, allergies, interactions et signature doivent etre verifies avant validation.",
  },
];

export function answerPatientAssistant(question) {
  return answerFromKnowledge(question, PATIENT_ADVICE, 'patient');
}

export function answerDoctorAssistant(question, context = {}) {
  const base = answerFromKnowledge(question, DOCTOR_ADVICE, 'doctor');
  if (base.risk !== 'info') return base;

  const highRiskCount = Number(context.highRiskCount || 0);
  if (normalize(question).includes('risque') && highRiskCount > 0) {
    return withDisclaimer({
      risk: 'warning',
      answer: `Vous avez ${highRiskCount} patient(s) marque(s) a risque eleve dans NOVA. Priorisez une revue clinique, puis documentez l'action dans les alertes ou consultations.`,
    }, 'doctor');
  }
  return base;
}

function answerFromKnowledge(question, knowledge, audience) {
  const q = normalize(question);
  if (!q || q.length < 2) {
    return withDisclaimer({ risk: 'info', answer: 'Posez une question courte et precise pour recevoir un conseil general.' }, audience);
  }

  if (EMERGENCY_TERMS.some(term => q.includes(normalize(term)))) {
    return {
      risk: 'emergency',
      answer: "Ces signes peuvent relever d'une urgence. Appelez immediatement les urgences locales ou rendez-vous au service d'urgence le plus proche. NOVA ne remplace pas une prise en charge urgente.",
      disclaimer: emergencyDisclaimer(),
    };
  }

  if (audience === 'patient' && BLOCKED_CLINICAL_ACTIONS.some(term => q.includes(normalize(term)))) {
    return withDisclaimer({
      risk: 'warning',
      answer: "Je ne peux pas poser de diagnostic, choisir un traitement, modifier une dose ou remplacer une consultation. Contactez votre medecin pour une decision adaptee a votre dossier.",
    }, audience);
  }

  const hit = knowledge.find(item => item.tags.some(tag => q.includes(normalize(tag))));
  if (hit) return withDisclaimer({ risk: 'info', answer: hit.answer }, audience);

  return withDisclaimer({
    risk: 'info',
    answer: "Je peux fournir des conseils generaux de prevention et vous orienter dans NOVA. Pour une decision clinique personnalisee, contactez votre professionnel de sante.",
  }, audience);
}

function withDisclaimer(payload, audience) {
  return {
    ...payload,
    source: 'nova_local_knowledge_base',
    disclaimer: audience === 'doctor'
      ? "Aide a la decision uniquement. Le medecin reste responsable de l'evaluation clinique, de la prescription et du suivi."
      : "Information generale uniquement. Ne remplace pas un avis medical. En cas d'urgence, contactez les urgences.",
  };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function emergencyDisclaimer() {
  return 'Urgence potentielle : demandez une aide medicale immediate.';
}
