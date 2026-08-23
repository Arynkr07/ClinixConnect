import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';

const DR_GP = { name: 'Dr. Rajesh Sharma', specialization: 'General Medicine', facility: 'Amroli PHC' };
const DR_PED = { name: 'Dr. Kavita Nair', specialization: 'Pediatrics', facility: 'Kanker CHC' };

const MOCK_AI_SUMMARIES = {
  'JD-9921': {
    status: 'Priority review recommended',
    triageLevel: 'priority',
    confidence: 0.88,
    doctor: DR_GP,
    referral: {
      destination: 'District Cardiology Center (Specialist Hospital)',
      priority: 'Urgent',
      reason: 'Suspected cardiac event — ECG and specialist review required',
    },
    clinicalSummary:
      'The patient, a 62-year-old woman, reports persistent chest pain of approximately two days duration together with shortness of breath on exertion. The pain is described as non-radiating. Given her age and the combination of symptoms, cardiac causes should be actively evaluated and excluded before considering other explanations.',
    reportedSymptoms: ['Persistent chest pain', 'Shortness of breath on exertion'],
    negativeFindings: ['No fever', 'No cough', 'No radiation of pain to the arm, jaw, or back'],
    differentials: [
      {
        condition: 'Acute coronary syndrome',
        likelihood: 'High',
        note: 'Chest pain with exertional breathlessness in a patient over 60 years requires urgent evaluation to rule out a cardiac event.',
      },
      {
        condition: 'Gastroesophageal reflux disease (GERD)',
        likelihood: 'Moderate',
        note: 'Can present with chest discomfort; it should be considered if cardiac causes are excluded.',
      },
      {
        condition: 'Musculoskeletal chest pain',
        likelihood: 'Low',
        note: 'Less likely given the exertional nature of the pain; can be reconsidered if pain persists without cardiac findings.',
      },
    ],
    warningSigns: [
      {
        finding: 'Chest pain combined with shortness of breath',
        reason: 'This combination may indicate an evolving cardiac event and requires immediate assessment.',
      },
      {
        finding: 'Age above 60 years with new chest symptoms',
        reason: 'Advancing age increases the likelihood of serious cardiovascular disease and warrants prompt evaluation.',
      },
    ],
    followupQuestions: [
      'Does the pain radiate to the left arm or jaw?',
      'Is the pain relieved by rest or by medication?',
      'Has there been any episode of sweating, nausea, or fainting?',
    ],
    nextStep:
      'Recommend an ECG and urgent cardiology consultation. The patient should be advised to present for review without delay if the pain recurs or worsens.',
  },
  'JD-8432': {
    status: 'Standard review recommended',
    triageLevel: 'standard',
    confidence: 0.84,
    doctor: DR_GP,
    referral: null,
    clinicalSummary:
      'The patient, a 45-year-old man, presents with a high-grade fever of 102°F and generalized body aches for three days. No rash or bleeding tendency has been reported. The presentation is most consistent with a viral febrile illness, while malaria and dengue remain within the differential given the current seasonal context.',
    reportedSymptoms: ['High-grade fever (102°F)', 'Generalized body aches', 'Fatigue'],
    negativeFindings: ['No rash', 'No bleeding tendency'],
    differentials: [
      {
        condition: 'Viral febrile illness',
        likelihood: 'High',
        note: 'A common seasonal presentation with fever and muscle aches; it is usually self-limiting.',
      },
      {
        condition: 'Malaria',
        likelihood: 'Moderate',
        note: 'Consider in the current season; confirmation requires a blood smear or rapid test.',
      },
      {
        condition: 'Dengue',
        likelihood: 'Moderate',
        note: 'Consider given the fever pattern; monitor platelet counts and warning signs.',
      },
    ],
    warningSigns: [
      {
        finding: 'Fever above 101.5°F persisting beyond three days',
        reason: 'Prolonged high fever increases the risk of complications such as dehydration and may indicate a treatable cause that needs investigation.',
      },
    ],
    followupQuestions: [
      'Have you noticed bleeding gums or small skin spots (petechiae)?',
      'Have you travelled to any high-transmission area recently?',
      'Is the fever continuous or does it come and go?',
    ],
    nextStep:
      'Recommend a malaria / dengue panel and antipyretics with adequate hydration. Advise the patient to return immediately for bleeding, severe headache, or abdominal pain.',
  },
  'JD-7721': {
    status: 'Routine — continue planned antenatal care',
    triageLevel: 'routine',
    confidence: 0.92,
    doctor: DR_GP,
    referral: null,
    clinicalSummary:
      'The patient, a 29-year-old woman, is attending a routine antenatal follow-up with no acute complaints. Her vital signs are within the expected range for her stage of pregnancy. The findings are consistent with normal pregnancy progression, and scheduled antenatal care should continue as planned.',
    reportedSymptoms: ['Routine antenatal follow-up', 'No acute complaints'],
    negativeFindings: ['Vital signs within the expected range for the gestational stage'],
    differentials: [
      {
        condition: 'Normal pregnancy progression',
        likelihood: 'High',
        note: 'Consistent with the absence of acute complaints and with reassuring vital signs.',
      },
    ],
    warningSigns: [
      {
        finding: 'None identified',
        reason: 'No warning signs were identified from the available information.',
      },
    ],
    followupQuestions: [
      'Are you feeling regular fetal movements?',
      'Have you noticed any swelling of the hands or face?',
      'Any headache, blurred vision, or bleeding?',
    ],
    nextStep:
      'Schedule the next routine antenatal care visit. Advise the patient about the warning symptoms of pregnancy, including bleeding, severe headache, and reduced fetal movements, and to seek review promptly if any of these occur.',
  },
  'JD-1209': {
    status: 'Priority review recommended',
    triageLevel: 'priority',
    confidence: 0.86,
    doctor: DR_GP,
    referral: null,
    clinicalSummary:
      'The patient, a 78-year-old man, presents with acute abdominal pain and repeated vomiting of one day duration. His age and presentation raise concern for dehydration and for surgical or vascular causes. Abdominal imaging is needed to exclude obstruction, and vascular causes should be considered given his age.',
    reportedSymptoms: ['Acute abdominal pain', 'Repeated vomiting'],
    negativeFindings: [],
    differentials: [
      {
        condition: 'Acute gastroenteritis',
        likelihood: 'High',
        note: 'A common cause of acute abdominal pain with vomiting; reassess after hydration.',
      },
      {
        condition: 'Intestinal obstruction',
        likelihood: 'Moderate',
        note: 'Consider given vomiting with abdominal pain; abdominal imaging is needed to exclude this.',
      },
      {
        condition: 'Mesenteric ischemia',
        likelihood: 'Low',
        note: 'A serious vascular cause that is more likely in the elderly; it requires imaging and clinical correlation.',
      },
    ],
    warningSigns: [
      {
        finding: 'Age above 75 years with acute abdominal pain',
        reason: 'Older patients are at higher risk of serious abdominal conditions and tolerate deterioration poorly.',
      },
      {
        finding: 'Vomiting with abdominal pain',
        reason: 'May indicate obstruction or an acute abdomen and can lead to dehydration and electrolyte imbalance.',
      },
      {
        finding: 'Possible dehydration',
        reason: 'Repeated vomiting in an elderly patient can lead to significant fluid loss; hydration status should be assessed.',
      },
    ],
    followupQuestions: [
      'When was your last bowel movement?',
      'Is the pain constant or crampy?',
      'Have you passed gas today?',
    ],
    nextStep:
      'Recommend IV hydration and abdominal imaging, such as ultrasound or X-ray, to exclude obstruction. Clinically reassess for signs of an acute abdomen and consider surgical consultation if the findings are concerning.',
  },
  'JD-4439': {
    status: 'Standard review recommended',
    triageLevel: 'standard',
    confidence: 0.83,
    doctor: DR_PED,
    referral: null,
    clinicalSummary:
      'The patient, a 12-year-old boy, presents with a sudden-onset skin rash and hives consistent with an allergic reaction. No respiratory distress or facial swelling was reported at intake. He should be monitored for progression of the rash and for any respiratory symptoms, and observed for response to antihistamines.',
    reportedSymptoms: ['Sudden-onset skin rash with hives'],
    negativeFindings: ['No respiratory distress', 'No facial swelling'],
    differentials: [
      {
        condition: 'Urticaria',
        likelihood: 'High',
        note: 'A common cause of sudden hives; it usually responds to antihistamines.',
      },
      {
        condition: 'Drug allergy',
        likelihood: 'Moderate',
        note: 'Consider if there was recent exposure to a new medication.',
      },
      {
        condition: 'Insect bite reaction',
        likelihood: 'Low',
        note: 'Can cause localized hives; consider if a bite was reported.',
      },
    ],
    warningSigns: [
      {
        finding: 'Rash spreading or worsening',
        reason: 'Progression of the rash may indicate a more severe reaction requiring treatment.',
      },
      {
        finding: 'Any airway involvement',
        reason: 'None reported at intake, but swelling of the lips, tongue, or throat requires emergency care if it develops.',
      },
    ],
    followupQuestions: [
      'Did the rash start after any new medication or food?',
      'At any point, have you felt wheezing or tightness in the throat?',
    ],
    nextStep:
      'Recommend an antihistamine with observation. Advise the patient to seek urgent care immediately for difficulty breathing, swelling of the lips or tongue, or fainting.',
  },
};

const buildFallback = (patient) => {
  const risk = patient?.risk ?? 'Unknown';
  const complaint = patient?.complaint ?? 'Presenting complaint not recorded';
  const isPriority = risk === 'Critical' || risk === 'High';
  const isModerate = risk === 'Moderate';
  return {
    status: isPriority ? 'Priority review recommended' : isModerate ? 'Standard review recommended' : 'Routine review',
    triageLevel: isPriority ? 'priority' : isModerate ? 'standard' : 'routine',
    confidence: 0.8,
    doctor: null,
    referral: isPriority
      ? {
          destination: 'District Hospital (AGH)',
          priority: 'High',
          reason: 'High-risk case requiring specialist review',
        }
      : null,
    clinicalSummary: `The patient presented with "${complaint}". The triage risk has been assessed as ${risk}. The vital signs recorded at check-in should be reviewed alongside this assessment, and a complete clinical evaluation is recommended.`,
    reportedSymptoms: complaint
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    negativeFindings: [],
    differentials: [
      {
        condition: 'Pending clinician review',
        likelihood: 'High',
        note: 'A complete clinical evaluation is required to establish a working assessment.',
      },
    ],
    warningSigns: isPriority
      ? [
          {
            finding: 'High triage flag',
            reason: 'The patient was flagged as high or critical risk at check-in and requires prompt review.',
          },
        ]
      : [
          {
            finding: 'None identified',
            reason: 'No warning signs were identified from the available information.',
          },
        ],
    followupQuestions: [
      'Have the symptoms changed since check-in?',
      'Is there any history of similar episodes?',
    ],
    nextStep: isPriority
      ? 'Recommend a priority clinical review and urgent assessment of the patient in person.'
      : 'Recommend a standard clinical review together with appropriate advice and reassurance.',
  };
};

const buildAiSummary = (patient) => ({
  ...(MOCK_AI_SUMMARIES[patient?.id] ?? buildFallback(patient)),
  complaint: patient?.complaint ?? '',
});

export const caseFileService = {
  /**
   * Fetches the stored AI-assisted clinical case report for a patient.
   * Real mode reads the persisted CaseFile from the existing backend; if no
   * case has been stored yet, the report is generated and persisted first so
   * every later request reads from the database instead of temporary data.
   */
  async getAiSummary(patient) {
    if (isMockMode()) {
      await sleep(700);
      return { ...buildAiSummary(patient), generatedAt: new Date().toISOString() };
    }
    const patientRef = patient?.id ?? patient?.patientId;
    try {
      const { data } = await api.get(`/cases/patient/${patientRef}`);
      return data;
    } catch (error) {
      if (error?.status === 404) {
        const generated = buildAiSummary(patient);
        return this.submitCase({
          patientId: patient?.patientId || patientRef,
          ...generated,
          source: 'ai',
        });
      }
      throw error;
    }
  },

  /**
   * Persists a submitted clinical case (symptoms, triage result, AI clinical
   * summary, possible conditions, warning signs, recommendation, confidence
   * and timestamps) into the existing database via POST /cases.
   */
  async submitCase(payload) {
    if (isMockMode()) {
      await sleep(500);
      return {
        ...payload,
        caseId: `CASE-${Math.floor(Math.random() * 900000) + 100000}`,
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
      };
    }
    const { data } = await api.post('/cases', payload);
    return data;
  },

  /**
   * Persists a doctor-approved AI-assisted consultation summary onto the
   * patient's existing stored case file via
   * POST /cases/patient/:id/consultation-summary. In mock mode the summary
   * is acknowledged locally without a backend call.
   */
  async saveApprovedSummary(patient, payload) {
    if (isMockMode()) {
      await sleep(500);
      const base = buildAiSummary(patient);
      return {
        ...base,
        id: `case-${Math.floor(Math.random() * 900000) + 100000}`,
        caseId: `CASE-${Math.floor(Math.random() * 900000) + 100000}`,
        ...payload,
        consultationApproved: true,
        approvedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
      };
    }
    const patientRef = patient?.id ?? patient?.patientId;
    const { data } = await api.post(
      `/cases/patient/${patientRef}/consultation-summary`,
      payload
    );
    return data;
  },

  async getCases(params) {
    if (isMockMode()) {
      await sleep(500);
      return Object.values(MOCK_AI_SUMMARIES).map((s) => ({
        ...s,
        caseId: `CASE-${Math.floor(Math.random() * 900000) + 100000}`,
        generatedAt: new Date().toISOString(),
      }));
    }
    const { data } = await api.get('/cases', params);
    return data;
  },

  async getCaseAnalytics() {
    if (isMockMode()) {
      await sleep(600);
      return {
        totalCases: 2410,
        resolved: 1940,
        escalated: 320,
        inFollowUp: 150,
        diagnosisTrends: {
          labels: ['Malaria', 'Fever', 'Prenatal', 'Chronic', 'Respiratory', 'Other'],
          data: [540, 480, 390, 350, 260, 390],
        },
        triageAccuracy: 91,
        referralRate: 13,
        riskDistribution: { low: 1200, moderate: 640, high: 210, critical: 60 },
        byRegion: [
          { region: 'Amroli', total: 320, resolved: 282, escalated: 38 },
          { region: 'Palia', total: 280, resolved: 246, escalated: 34 },
          { region: 'Devgram', total: 195, resolved: 171, escalated: 24 },
          { region: 'Kanker', total: 240, resolved: 214, escalated: 26 },
          { region: 'Bijapur', total: 150, resolved: 131, escalated: 19 },
        ],
      };
    }
    const { data } = await api.get('/cases/analytics');
    return data;
  },
};
