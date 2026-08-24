import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';

const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.GEMINI_API_KEY ||
  '';

/**
 * Direct Gemini API call from client with fallback across flash and pro models
 */
async function callDirectGemini(prompt) {
  if (!GEMINI_API_KEY) return null;

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.warn(`[aiService] Gemini ${model} request error:`, e.message);
    }
  }

  return null;
}

/**
 * Robust rule-based fallback analyzer for Pre-Visit Symptoms
 */
export function generateLocalPreVisitSummary(symptoms = '', severity = 'Moderate') {
  const text = String(symptoms).toLowerCase();
  
  let urgency = 'Low';
  if (
    text.includes('chest pain') ||
    text.includes('difficulty breathing') ||
    text.includes('shortness of breath') ||
    text.includes('severe') ||
    text.includes('unconscious') ||
    text.includes('bleeding') ||
    severity === 'Severe'
  ) {
    urgency = 'High';
  } else if (
    text.includes('fever') ||
    text.includes('vomiting') ||
    text.includes('pain') ||
    text.includes('dizziness') ||
    text.includes('infection') ||
    severity === 'Moderate'
  ) {
    urgency = 'Medium';
  }

  let chiefComplaint = symptoms.slice(0, 100).trim();
  if (chiefComplaint.length > 0 && !chiefComplaint.endsWith('.')) {
    chiefComplaint += '.';
  }

  const suggestedQuestions = [];
  if (text.includes('pain') || text.includes('ache')) {
    suggestedQuestions.push('Can you pinpoint the exact location and describe if the pain radiates or worsens with specific movements?');
  } else {
    suggestedQuestions.push('What specific time of day or activity triggers or worsens your primary symptom?');
  }

  if (text.includes('fever') || text.includes('chills') || text.includes('sweat')) {
    suggestedQuestions.push('Have you measured your highest temperature, and are there associated chills, cough, or body aches?');
  } else {
    suggestedQuestions.push('Have you noticed any related secondary symptoms such as fatigue, nausea, or sleep disturbances?');
  }

  suggestedQuestions.push('Are you currently taking any over-the-counter medications, home remedies, or supplements for relief?');

  return {
    urgency,
    chiefComplaint: chiefComplaint || 'Patient-reported general health consultation',
    suggestedQuestions: suggestedQuestions.slice(0, 3),
    rawSymptoms: symptoms,
    generatedAt: new Date().toISOString(),
    provider: 'ClinixConnect Clinical AI Engine',
  };
}

/**
 * Robust rule-based fallback for Post-Visit Notes
 */
export function generateLocalPostVisitSummary(clinicalNotes = '', medicines = []) {
  const notes = String(clinicalNotes).trim();

  const medicationLines = (medicines || []).map((m) => {
    const times = [];
    if (m.schedule?.morning) times.push('Morning');
    if (m.schedule?.afternoon) times.push('Afternoon');
    if (m.schedule?.night) times.push('Night');
    const timeStr = times.length ? `(${times.join(', ')})` : '';
    return `• **${m.medicineName}**: Take ${m.dosage || '1 dose'} ${m.frequency || 'as prescribed'} ${timeStr} for ${m.duration || 'prescribed duration'}.`;
  });

  const medSection = medicationLines.length
    ? `### 💊 Your Prescribed Medication Schedule:\n${medicationLines.join('\n')}`
    : '### 💊 Medication Schedule:\nNo specific oral medications prescribed. Follow general hydration and wellness guidelines.';

  const patientFriendly = `
### 🩺 Doctor's Consultation Summary:
${notes || 'The doctor evaluated your current symptoms and formulated a treatment plan aimed at rapid symptom relief.'}

${medSection}

### 📋 Recommended Follow-up Steps:
• Rest adequately, maintain good hydration, and monitor your symptoms daily.
• Take all medications strictly on schedule with meals as instructed.
• Schedule a follow-up visit or contact emergency care immediately if you experience worsening fever, severe pain, or shortness of breath.
`.trim();

  return {
    patientFriendlySummary: patientFriendly,
    medicationSchedule: medicines,
    followUpSteps: [
      'Take prescribed medications regularly as scheduled',
      'Maintain adequate hydration and balanced nutrition',
      'Book a follow-up consultation in 7 days or if symptoms persist',
      'Seek immediate medical care if red-flag symptoms develop',
    ],
    generatedAt: new Date().toISOString(),
  };
}

export const aiService = {
  /**
   * Pre-visit summary generation
   */
  async generatePreVisitSummary(symptoms, severity = 'Moderate') {
    // 1. Try backend API first (which uses secure server-side LLM & fallback)
    if (!isMockMode()) {
      try {
        const { data } = await api.post('/ai/pre-visit-summary', { symptoms, severity });
        if (data && (data.urgency || data.chiefComplaint)) return data;
      } catch (err) {
        console.warn('[aiService] backend AI call warning:', err.message);
      }
    }

    // 2. Direct client Gemini call if API key present
    if (GEMINI_API_KEY) {
      try {
        const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}

Return ONLY valid JSON format:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "Description",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
}`;
        const raw = await callDirectGemini(prompt);
        if (raw) {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            return {
              urgency: ['Low', 'Medium', 'High'].includes(parsed.urgency) ? parsed.urgency : 'Medium',
              chiefComplaint: parsed.chiefComplaint || symptoms.slice(0, 100),
              suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : [],
              rawSymptoms: symptoms,
              generatedAt: new Date().toISOString(),
              provider: 'Google Gemini (Live AI)',
            };
          }
        }
      } catch {
        /* ignore */
      }
    }

    // 3. Guaranteed local clinical triage fallback
    await sleep(200);
    return generateLocalPreVisitSummary(symptoms, severity);
  },

  /**
   * Post-visit summary generation
   */
  async generatePostVisitSummary(clinicalNotes, medicines = []) {
    if (GEMINI_API_KEY) {
      try {
        const medSummary = (medicines || []).map((m) => `${m.medicineName} (${m.dosage}, ${m.frequency})`).join(', ');
        const notesPayload = `${clinicalNotes}. Prescribed Medicines: ${medSummary || 'None'}`;
        const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notesPayload}`;
        const raw = await callDirectGemini(prompt);
        if (raw) {
          return {
            patientFriendlySummary: raw.trim(),
            generatedAt: new Date().toISOString(),
            provider: 'Google Gemini 1.5 Flash (Live AI)',
          };
        }
      } catch (e) {
        console.warn('Direct Gemini post-visit call failed:', e);
      }
    }

    if (!isMockMode()) {
      try {
        const { data } = await api.post('/ai/post-visit-summary', { clinicalNotes, medicines });
        if (data) return data;
      } catch (err) {
        console.warn('[aiService] backend API call failed:', err.message);
      }
    }

    await sleep(400);
    return generateLocalPostVisitSummary(clinicalNotes, medicines);
  },
};

export default aiService;
