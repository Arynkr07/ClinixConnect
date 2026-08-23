import { sleep } from '../utils/helpers';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const USE_MOCK = import.meta.env.VITE_ENABLE_MOCK_API === 'true';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const authHeaders = () => {
  try {
    const stored = localStorage.getItem('jd_user');
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {
    /* ignore storage errors */
  }
  return {};
};

export const api = {
  async request(path, { method = 'GET', body, params } = {}) {
    const query = params
      ? `?${new URLSearchParams(params).toString()}`
      : '';

    try {
      const response = await fetch(`${BASE_URL}${path}${query}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let message = `Request failed: ${response.statusText}`;
        try {
          const payload = await response.json();
          if (payload && payload.message) message = payload.message;
        } catch {
          /* keep default message */
        }
        throw new ApiError(response.status, message);
      }

      return response.json();
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      // If network connection failed or server is offline, fallback if mock mode is permitted
      if (USE_MOCK) {
        await sleep(300);
        return { data: null, meta: { path, method, params } };
      }
      throw new ApiError(503, err.message || 'Cannot reach API server. Please ensure backend server is running.');
    }
  },

  get(path, params) {
    return this.request(path, { params });
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },

  put(path, body) {
    return this.request(path, { method: 'PUT', body });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },
};

export const isMockMode = () => USE_MOCK;
export default api;
