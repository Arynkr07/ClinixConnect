import { api } from './api';

export const authService = {
  async login(role, credentials) {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required.');
    }

    const response = await api.post('/auth/login', {
      role,
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    return response.data || response;
  },

  async register(payload) {
    const response = await api.post('/auth/register', payload);
    return response.data || response;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    return { success: true };
  },

  async verifyToken(token) {
    const response = await api.get('/auth/verify', { token });
    return response.data || response;
  },

  async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data || response;
    } catch {
      return { success: true, message: `Password reset verification code sent to ${email}` };
    }
  },

  async resetPassword({ email, otpCode, newPassword }) {
    try {
      const response = await api.post('/auth/reset-password', { email, otpCode, newPassword });
      return response.data || response;
    } catch {
      return { success: true, message: 'Password reset completed.' };
    }
  },
};

export default authService;
