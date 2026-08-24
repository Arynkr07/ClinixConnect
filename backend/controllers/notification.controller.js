import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { Notification } from '../models/index.js';
import { notificationService } from '../services/notification.service.js';

/**
 * GET /notifications
 * Query: { unreadOnly, page, limit }
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, page = 1, limit = 20 } = req.query;
  const targetUser = req.user?._id;

  if (!targetUser || !mongoose.isValidObjectId(targetUser)) {
    return success(res, [], { page: 1, limit: 20, total: 0, unread: 0, totalPages: 0 });
  }

  const query = { user: targetUser };
  if (unreadOnly === 'true') query.read = false;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total, unread] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, unread, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * POST /notifications/read-all
 */
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );
  return success(res, { modifiedCount: result.modifiedCount });
});

/**
 * POST /notifications
 * Body: { title, description, type?, link?, meta? }
 * Creates a notification for the requesting user (or a target userId).
 */
export const createNotification = asyncHandler(async (req, res) => {
  const { userId, title, description, type, link, meta } = req.body || {};
  if (!title) throw new ApiError(400, 'Notification requires a title.');

  const target = userId || req.user._id;
  const notification = await notificationService.notify({
    userIds: target,
    title,
    description: description || '',
    type: type || 'system',
    link: link || '',
    meta: meta || {},
  });

  return created(res, notification[0] || notification);
});

/**
 * POST /notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found.');
  return success(res, notification);
});

/**
 * DELETE /notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) throw new ApiError(404, 'Notification not found.');
  return noContent(res);
});

export const notificationController = {
  getNotifications,
  markAllRead,
  createNotification,
  markAsRead,
  deleteNotification,
};

export default notificationController;
