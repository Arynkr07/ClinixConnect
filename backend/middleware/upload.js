import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { static as expressStatic } from 'express';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

const UPLOAD_DIR = path.resolve('uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  // Documents
  '.pdf', '.doc', '.docx',
  // Reports / data
  '.csv', '.xlsx',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }
  return cb(new ApiError(400, `File type not allowed: ${ext || 'unknown'}`));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 5,
  },
});

/** Mounts the /uploads static route (call once from server.js). */
export const serveUploads = (app) => {
  app.use('/uploads', expressStatic(UPLOAD_DIR));
};

export default upload;
