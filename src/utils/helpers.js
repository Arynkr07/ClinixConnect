export const cx = (...classes) => classes.filter(Boolean).join(' ');

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const truncate = (text = '', length = 40) =>
  text.length > length ? `${text.slice(0, length - 1)}…` : text;

export const capitalize = (text = '') =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const slugify = (text = '') =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const percent = (value, total) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

export const groupBy = (items, key) =>
  items.reduce((acc, item) => {
    const group = item[key];
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {});

export const downloadTextFile = (content, filename, mimeType = 'text/csv') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const escapeCSVField = (value) => {
  const str = value == null ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * Downloads rows as a proper, spreadsheet-editable CSV file.
 * Adds a UTF-8 BOM so Excel opens non-ASCII text correctly and
 * quotes any field containing commas, quotes, or line breaks.
 */
export const downloadCSV = (filename, headers, rows) => {
  const lines = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((row) => row.map(escapeCSVField).join(',')),
  ];
  downloadTextFile(`\uFEFF${lines.join('\r\n')}`, filename, 'text/csv');
};
