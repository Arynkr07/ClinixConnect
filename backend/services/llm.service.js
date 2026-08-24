import env from '../config/env.js';

/**
 * Call Google Gemini REST API directly using fetch
 */
async function callGeminiApi(prompt, model = 'gemini-1.5-flash') {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API returned HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

/**
 * Robust fallback clinical triage generator
 */
function fallbackPreVisitAnalysis(symptoms = '', severity = 'Moderate') {
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

  let chiefComplaint = symptoms.slice(0, 120).trim();
  if (chiefComplaint.length > 0 && !chiefComplaint.endsWith('.')) {
    chiefComplaint += '.';
  }

  const suggestedQuestions = [];
  if (text.includes('pain') || text.includes('ache')) {
    suggestedQuestions.push('Can you describe whether the pain is sharp, dull, or radiating to other regions?');
  } else {
    suggestedQuestions.push('What specific activities or times of day worsen or relieve these symptoms?');
  }

  if (text.includes('fever') || text.includes('cough')) {
    suggestedQuestions.push('How many days has the fever persisted, and have you experienced chills or body aches?');
  } else {
    suggestedQuestions.push('Have you noticed any changes in your appetite, energy levels, or sleep?');
  }

  suggestedQuestions.push('Have you taken any over-the-counter medications or home remedies for temporary relief?');

  return {
    urgency,
    chiefComplaint: chiefComplaint || 'Patient consultation for reported symptoms.',
    suggestedQuestions: suggestedQuestions.slice(0, 3),
    rawSymptoms: symptoms,
    generatedAt: new Date().toISOString(),
    engine: 'ClinixConnect Clinical Engine (Standard Fallback)',
  };
}

/**
 * Robust fallback post-visit summary generator
 */
function fallbackPostVisitSummary(notes = '', medicines = []) {
  const noteText = String(notes).trim();

  const medLines = (medicines || []).map((m) => {
    const times = [];
    if (m.schedule?.morning) times.push('Morning');
    if (m.schedule?.afternoon) times.push('Afternoon');
    if (m.schedule?.night) times.push('Night');
    const timeStr = times.length ? `(${times.join(', ')})` : '';
    return `• ${m.medicineName}: ${m.dosage || '1 dose'} ${m.frequency || 'as advised'} ${timeStr} for ${m.duration || 'duration prescribed'}.`;
  });

  const medBlock = medLines.length
    ? `MEDICATION SCHEDULE:\n${medLines.join('\n')}`
    : 'MEDICATION SCHEDULE:\nFollow standard hydration, nutrition, and lifestyle recommendations.';

  return `CONSULTATION SUMMARY:
${noteText || 'The doctor reviewed your condition and prescribed a comprehensive care plan.'}

${medBlock}

FOLLOW-UP STEPS:
1. Adhere strictly to the dosage schedule with meals as directed.
2. Rest and stay well hydrated.
3. Schedule a follow-up consultation in 7 days or seek immediate care if red-flag symptoms occur.`;
}

export const llmService = {
  /**
   * PDF Prompt: "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
   */
  async generatePreVisitSummary({ symptoms, severity = 'Moderate' }) {
    if (env.GEMINI_API_KEY) {
      try {
        const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}

Return ONLY valid JSON format:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "A concise summary of the primary complaint.",
  "suggestedQuestions": [
    "First question for doctor",
    "Second question for doctor",
    "Third question for doctor"
  ]
}`;

        const rawResult = await callGeminiApi(prompt);
        if (rawResult) {
          const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              urgency: ['Low', 'Medium', 'High'].includes(parsed.urgency) ? parsed.urgency : 'Medium',
              chiefComplaint: parsed.chiefComplaint || symptoms.slice(0, 100),
              suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : [],
              rawSymptoms: symptoms,
              generatedAt: new Date().toISOString(),
              engine: 'Google Gemini 1.5 Flash (Live AI)',
            };
          }
        }
      } catch (err) {
        console.warn('[llmService] Gemini API call failed, using graceful fallback:', err.message);
      }
    }

    return fallbackPreVisitAnalysis(symptoms, severity);
  },

  /**
   * PDF Prompt: "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"
   */
  async generatePostVisitSummary({ clinicalNotes, medicines = [] }) {
    if (env.GEMINI_API_KEY) {
      try {
        const medSummary = (medicines || []).map((m) => `${m.medicineName} (${m.dosage}, ${m.frequency})`).join(', ');
        const notesPayload = `${clinicalNotes}. Prescribed Medicines: ${medSummary || 'None'}`;
        const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notesPayload}`;

        const geminiOutput = await callGeminiApi(prompt);
        if (geminiOutput) {
          return {
            patientFriendlySummary: geminiOutput.trim(),
            generatedAt: new Date().toISOString(),
            engine: 'Google Gemini 1.5 Flash (Live AI)',
          };
        }
      } catch (err) {
        console.warn('[llmService] Gemini post-visit summary failed, using graceful fallback:', err.message);
      }
    }

    return {
      patientFriendlySummary: fallbackPostVisitSummary(clinicalNotes, medicines),
      generatedAt: new Date().toISOString(),
      engine: 'ClinixConnect Clinical Engine (Standard Fallback)',
    };
  },
};

export default llmService;
