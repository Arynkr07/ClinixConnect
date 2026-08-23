import { Notification } from '../models/Notification.js';

/**
 * Creates a notification for a user. Optionally creates for many users at once.
 */
export const notify = async ({ userIds, title, description, type, link, meta }) => {
  const targets = Array.isArray(userIds) ? userIds : [userIds];
  const docs = targets
    .filter(Boolean)
    .map((userId) => ({ user: userId, title, description, type, link, meta }));
  if (docs.length === 0) return [];

  return Notification.insertMany(docs);
};

export const notificationService = { notify };
export default notificationService;
