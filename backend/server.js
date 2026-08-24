import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { serveUploads } from './middleware/upload.js';

const app = express();

// --- Global middleware ---
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.IS_DEV) app.use(morgan('dev'));

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Static uploads
serveUploads(app);

// API routes
app.use('/api/v1', routes);

// Serve production frontend build if available
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

// --- Start ---
const start = async () => {
  try {
    await connectDB();
    const { ensureDefaultUsers } = await import('./seed/autoSeed.js');
    await ensureDefaultUsers();
    const { reminderService } = await import('./services/reminder.service.js');
    reminderService.start();
    app.listen(env.PORT, () => {
      console.log(`[server] API listening on http://localhost:${env.PORT}/api/v1`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error);
    process.exit(1);
  }
};

start();

export default app;
