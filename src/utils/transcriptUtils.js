/*
 * transcriptUtils.js
 * Live consultation transcript + AI scribe section generation.
 *
 * CLOUD-READY:
 * In the current build the live transcript and scribe sections are simulated
 * from the conversation. Swap `SIMULATED_TRANSCRIPT` / `createScribeSections`
 * for real STT (speech-to-text) + LLM section extraction later. Keep the
 * exported shapes unchanged so the UI only depends on these exports.
 */

export const SPEAKER_META = {
  patient: { label: 'Patient', color: 'bg-secondary-container text-on-secondary-container' },
  doctor: { label: 'Doctor', color: 'bg-primary text-on-primary' },
  ai: { label: 'AI Scribe', color: 'bg-tertiary-fixed-dim text-tertiary' },
};

export const SCRIBE_SECTIONS = [
  { id: 'chiefComplaint', title: 'Chief Complaint', icon: 'sick' },
  { id: 'historyOfPresentIllness', title: 'History of Present Illness', icon: 'history' },
  { id: 'symptoms', title: 'Symptoms', icon: 'monitor_heart' },
  { id: 'vitalsDiscussed', title: 'Vitals Discussed', icon: 'speed' },
  { id: 'assessment', title: 'Assessment', icon: 'fact_check' },
  { id: 'plan', title: 'Plan', icon: 'assignment_turned_in' },
  { id: 'medicationAdvice', title: 'Medication Advice', icon: 'medication' },
  { id: 'followUp', title: 'Follow-up Recommendation', icon: 'event_repeat' },
];

export const SIMULATED_TRANSCRIPT = [
  { id: 't1', speaker: 'patient', text: 'Doctor, the pain in my chest has not gone since two days. It increases when I take a deep breath.', time: '00:12' },
  { id: 't2', speaker: 'patient', text: 'I also feel breathless when I walk to the fields.', time: '00:28' },
  { id: 't3', speaker: 'doctor', text: 'I can see the ECG now. ST elevation in leads II, III and aVF is concerning.', time: '00:47' },
  { id: 't4', speaker: 'doctor', text: 'Vitals: BP 96/58, HR 112. Administer Aspirin 300mg chewable immediately.', time: '01:05' },
  { id: 't5', speaker: 'doctor', text: 'Check for contraindications before Nitroglycerin. I am arranging an ambulance to the CHC.', time: '01:22' },
  { id: 't6', speaker: 'ai', text: 'Scribe: Inferior wall MI suspected. Emergency referral to CHC recommended.', time: '01:30' },
];

export const splitSentences = (text = '') =>
  String(text)
    .trim()
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]*/g) || [];

const findSentence = (sentences, words) =>
  sentences.find((s) => words.some((w) => s.toLowerCase().includes(w))) || '';

/**
 * Mock AI extraction of structured scribe sections from a conversation string.
 * @param {string} text - raw conversation / scribe notes
 * @returns {{ id: string, content: string }[]} - one entry per SCRIBE_SECTION
 */
export const createScribeSections = (text = '') => {
  const sentences = splitSentences(text);
  const lower = String(text).toLowerCase();
  const has = (words) => words.some((w) => lower.includes(w));

  const content = {
    chiefComplaint:
      findSentence(sentences, ['chest pain', 'pain', 'fever', 'shortness of breath', 'complaint']) ||
      sentences[0] ||
      '',
    historyOfPresentIllness: sentences.slice(0, Math.min(3, sentences.length)).join(' ') || '',
    symptoms: [
      findSentence(sentences, ['pain']),
      findSentence(sentences, ['breath', 'breathless']),
      findSentence(sentences, ['fever', 'nausea', 'vomit', 'cough', 'sweat', 'dizzy']),
    ]
      .filter(Boolean)
      .join(' '),
    vitalsDiscussed: has(['bp', 'blood pressure', 'heart rate', 'pulse', 'spo2', 'oxygen', 'temperature'])
      ? findSentence(sentences, ['bp', 'blood pressure', 'heart rate', 'pulse', 'spo2', 'oxygen', 'temperature'])
      : '',
    assessment: findSentence(sentences, ['suspected', 'likely', 'diagnosis', 'infarction', 'mi', 'hypertension']),
    plan: findSentence(sentences, ['administer', 'aspirin', 'nitroglycerin', 'refer', 'admit', 'arrange', 'monitor', 'ecg', 'ambulance']),
    medicationAdvice: findSentence(sentences, ['aspirin', 'nitroglycerin', 'medicine', 'medication', 'dose']),
    followUp: findSentence(sentences, ['follow up', 'follow-up', 'review', 'ambulance', 'emergency']),
  };

  return SCRIBE_SECTIONS.map(({ id, title, icon }) => ({
    id,
    title,
    icon,
    content: content[id] || '',
  }));
};

/** Join structured sections back into plain scribe text. */
export const sectionsToText = (sections = []) =>
  sections
    .map((section) => section.content)
    .filter((content) => String(content).trim())
    .join('\n\n');
