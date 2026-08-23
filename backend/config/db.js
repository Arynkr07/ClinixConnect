import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
  const options = {
    autoIndex: env.IS_DEV,
    serverSelectionTimeoutMS: 10000,
  };

  try {
    const connection = await mongoose.connect(env.MONGODB_URI, options);
    console.log(
      `[db] MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );
    return connection;
  } catch (error) {
    console.error('\n======================================================');
    console.error('[db] MongoDB Atlas Authentication Failed!');
    console.error('Reason:', error.message);
    console.error('Action Needed: Update MONGODB_URI in backend/.env with correct Atlas username/password.');
    console.error('======================================================\n');

    const fallbackUri = 'mongodb://127.0.0.1:27017/jeevandoot';
    if (env.MONGODB_URI !== fallbackUri) {
      console.warn(`[db] Falling back to local MongoDB (${fallbackUri})...`);
      try {
        const fallbackConn = await mongoose.connect(fallbackUri, options);
        console.log(`[db] Local MongoDB connected: ${fallbackConn.connection.host}/${fallbackConn.connection.name}`);
        return fallbackConn;
      } catch (localErr) {
        console.error('[db] Local MongoDB fallback failed:', localErr.message);
      }
    }
    throw error;
  }
};

mongoose.connection.on('error', (error) => {
  console.error('[db] MongoDB runtime error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

export default connectDB;
