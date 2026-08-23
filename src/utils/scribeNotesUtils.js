const STORAGE_KEY = 'savedScribeNotes';

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function saveScribeNotes({ consultationId, patientId, doctorId, notes }) {
  try {
    const entries = readAll();
    const entry = {
      consultationId,
      patientId,
      doctorId,
      notes,
      savedAt: new Date().toISOString(),
    };

    const index = entries.findIndex((e) => e.consultationId === consultationId);
    if (index >= 0) {
      entries[index] = { ...entries[index], ...entry };
    } else {
      entries.push(entry);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return { success: true, entry, updated: index >= 0 };
  } catch (error) {
    return { success: false, error };
  }
}

export function loadScribeNotes(consultationId) {
  try {
    const entries = readAll();
    const match = entries.find((e) => e.consultationId === consultationId);
    return match ? match.notes : '';
  } catch {
    return '';
  }
}
