export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isPhone = (value) => /^(\+?\d{1,3}[- ]?)?\d{10}$/.test(value);

export const isAadhaar = (value) => /^\d{12}$/.test(value);

export const isDoctorId = (value) => /^JD-\d{4}(-\d{3})?$/.test(value);

export const isPatientId = (value) => /^JD-\d{4}$/.test(value);

export const isStrongPassword = (value) =>
  value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);

export const required = (value) =>
  value !== undefined && value !== null && String(value).trim().length > 0;

export const minLength = (min) => (value) =>
  String(value ?? '').length >= min;

export const maxLength = (max) => (value) =>
  String(value ?? '').length <= max;

export const inRange = (min, max) => (value) => {
  const num = Number(value);
  return !Number.isNaN(num) && num >= min && num <= max;
};

export const isValidAge = (value) => inRange(0, 120)(value);

export const validateField = (value, rules) =>
  rules.reduce((error, rule) => error || rule(value) || null, null);
