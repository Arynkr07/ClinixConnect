/**
 * Consistent response envelope so the frontend can do
 * `const { data } = await api.get(...)` everywhere.
 *
 * success:
 *   { data, meta? }
 *
 * error (handled by errorHandler):
 *   { success: false, message, details? }
 */
export const success = (res, data, meta = undefined, status = 200) => {
  const body = { data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
};

export const created = (res, data, meta) => success(res, data, meta, 201);

export const noContent = (res) => res.status(204).end();

export const ok = success;

export default { success, created, noContent, ok };
