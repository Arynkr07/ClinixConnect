import 'dotenv/config';

const bool = (value, fallback = false) =>
  value === undefined ? fallback : String(value).toLowerCase() === 'true';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinixconnect',
  JWT_SECRET: process.env.JWT_SECRET || 'clinixconnect-dev-secret-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS) || 10,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  MAX_UPLOAD_SIZE_MB: Number(process.env.MAX_UPLOAD_SIZE_MB) || 5,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  SMTP_SERVER: process.env.SMTP_SERVER || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_EMAIL: process.env.SMTP_EMAIL || 'projectwork1709@gmail.com',
  SMTP_APP_PASSWORD: process.env.SMTP_APP_PASSWORD || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEV: process.env.NODE_ENV !== 'production',
  IS_MOCK: bool(process.env.ENABLE_MOCK_AUTH, false),
};

export default env;
