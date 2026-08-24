/*
 * recordingUtils.js
 * IndexedDB-backed storage for consultation video recordings.
 *
 * CLOUD-READY:
 * This module is the single abstraction point for recording persistence.
 * To move recordings to the cloud later, replace the IndexedDB implementation
 * below with Supabase Storage / Firebase Storage / AWS S3 while keeping the
 * SAME exported API — the UI (RecordingPlayer, ConsultationHistory) only
 * depends on these exports:
 *
 *   saveRecording(recording)   -> upload object to cloud bucket
 *   getRecording(id)           -> download object (or fetch signed URL)
 *   getAllRecordings()         -> list bucket objects
 *   deleteRecording(id)        -> delete bucket object
 *   downloadRecording(id)      -> download from bucket
 */

const DB_NAME = 'clinixconnect-media';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let dbPromise = null;

export const isStorageSupported = () =>
  typeof window !== 'undefined' && 'indexedDB' in window;

const openDB = () => {
  if (!isStorageSupported()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const withStore = async (mode, fn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

/**
 * Save (insert or replace by id) a recording.
 * @param {object} recording
 *   { id, consultationId, patientId, doctorId, recordingName, duration, recordingDate, videoBlob, mimeType }
 * @returns {Promise<{ success: boolean, recording?: object, error?: Error }>}
 */
export const saveRecording = async (recording) => {
  if (!recording || !recording.id) {
    return { success: false, error: new Error('A recording id is required.') };
  }
  try {
    await withStore('readwrite', (store) => store.put(recording));
    return { success: true, recording };
  } catch (error) {
    return { success: false, error };
  }
};

export const getRecording = async (id) => {
  if (!id) return null;
  try {
    const value = await withStore('readonly', (store) => store.get(id));
    return value || null;
  } catch {
    return null;
  }
};

export const getAllRecordings = async () => {
  try {
    const values = await withStore('readonly', (store) => store.getAll());
    return Array.isArray(values) ? values : [];
  } catch {
    return [];
  }
};

export const deleteRecording = async (id) => {
  try {
    await withStore('readwrite', (store) => store.delete(id));
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/** Create an object URL from a Blob (remember to revoke with revokeBlobUrl). */
export const createBlobUrl = (blob) => (blob ? URL.createObjectURL(blob) : null);

export const revokeBlobUrl = (url) => {
  if (url) URL.revokeObjectURL(url);
};

/** Download a Blob to the user's device. */
export const downloadBlob = (blob, filename) => {
  if (!blob) return;
  const url = createBlobUrl(blob);
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'consultation-recording.webm';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => revokeBlobUrl(url), 2000);
};

/**
 * Convenience: load a recording from IndexedDB and trigger a download.
 */
export const downloadRecording = async (id, filename) => {
  const recording = await getRecording(id);
  if (!recording || !recording.videoBlob) return { success: false, error: 'Recording not found.' };
  downloadBlob(recording.videoBlob, filename || recording.recordingName || `recording-${id}.webm`);
  return { success: true };
};

export const sanitizeRecordingName = (value) =>
  String(value || 'recording')
    .replace(/[^a-zA-Z0-9 _-]+/g, '-')
    .replace(/\s+/g, '_') || 'recording';
