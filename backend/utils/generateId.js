import { randomBytes } from 'node:crypto';

// No punctuation that could be confused visually; uppercase-safe set.
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const secureRandomString = (length) => {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
};

/**
 * Generates prefixed, human-readable business IDs that match the
 * frontend formats, e.g. patientId() -> "JD-8F2KQ3".
 */
export const generateId = (prefix, length = 6) =>
  `${prefix}${secureRandomString(length)}`;

export const generatePatientId = (name = 'Patient', dateInput = new Date()) => {
  const cleanName = String(name || 'Patient')
    .replace(/^Dr\.\s*/i, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
  const firstName = cleanName.split(/\s+/)[0] || 'Patient';
  const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const d = new Date(dateInput || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${formattedName}${timestamp}`;
};

export const generateDoctorId = () => generateId('JD-D-');
export const generateReportId = () => generateId('RPT-');
export const generatePrescriptionId = () => generateId('RX-');
export const generateReferralId = () => generateId('REF-');
export const generateCampId = () => generateId('HC-');
export const generateConsultationId = () => generateId('SESS-');

export default generateId;
