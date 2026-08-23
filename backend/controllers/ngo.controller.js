import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created, noContent } from '../utils/response.js';
import { NGO, HealthCamp } from '../models/index.js';
import { dashboardService } from '../services/dashboard.service.js';

/**
 * GET /ngo/dashboard
 * Role: ngo
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ user: req.user._id }).lean();
  if (!ngo) throw new ApiError(404, 'NGO profile not found.');

  const dashboard = await dashboardService.buildNGODashboard({ ngoId: ngo._id });
  const upcomingCamps = await HealthCamp.find({ ngo: ngo._id })
    .sort({ date: 1 })
    .limit(4)
    .lean();

  return success(res, { ngo, ...dashboard, upcomingCamps });
});

/**
 * GET /ngo/camps
 * Query: { search, status, page, limit }
 */
export const getCamps = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ user: req.user._id }).lean();
  if (!ngo) throw new ApiError(404, 'NGO profile not found.');

  const { search, status, page = 1, limit = 20 } = req.query;
  const query = { ngo: ngo._id };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { village: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    HealthCamp.find(query)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    HealthCamp.countDocuments(query),
  ]);

  return success(
    res,
    items,
    { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  );
});

/**
 * POST /ngo/camps
 */
export const createCamp = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ user: req.user._id }).lean();
  if (!ngo) throw new ApiError(404, 'NGO profile not found.');

  const { name, location, date, ...rest } = req.body || {};
  if (!name || !location || !date) {
    throw new ApiError(400, 'Camp name, location and date are required.');
  }

  const camp = await HealthCamp.create({ ngo: ngo._id, name, location, date, ...rest });
  return created(res, camp);
});

/**
 * PUT /ngo/camps/:id
 */
export const updateCamp = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ user: req.user._id }).lean();
  if (!ngo) throw new ApiError(404, 'NGO profile not found.');

  const camp = await HealthCamp.findOneAndUpdate(
    { _id: req.params.id, ngo: ngo._id },
    { ...(req.body || {}) },
    { new: true, runValidators: true }
  );
  if (!camp) throw new ApiError(404, 'Camp not found.');
  return success(res, camp);
});

/**
 * DELETE /ngo/camps/:id
 */
export const deleteCamp = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ user: req.user._id }).lean();
  if (!ngo) throw new ApiError(404, 'NGO profile not found.');

  const camp = await HealthCamp.findOneAndDelete({ _id: req.params.id, ngo: ngo._id });
  if (!camp) throw new ApiError(404, 'Camp not found.');
  return noContent(res);
});

/**
 * GET /ngo/impact
 * Aggregates beneficiaries by camp for impact reports.
 */
export const getImpact = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ user: req.user._id }).lean();
  if (!ngo) throw new ApiError(404, 'NGO profile not found.');

  const [camps, serviceSplit] = await Promise.all([
    HealthCamp.find({ ngo: ngo._id }).sort({ date: 1 }).lean(),
    HealthCamp.aggregate([
      { $match: { ngo: ngo._id } },
      { $unwind: '$services' },
      { $group: { _id: '$services', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const stats = {
    patientsReached: camps.reduce((sum, c) => sum + (c.beneficiaries || 0), 0),
    villagesCovered: new Set(camps.map((c) => c.village || c.location).filter(Boolean)).size,
    vaccinations: camps.filter((c) => c.services?.includes('vaccination')).length,
    trainingSessions: camps.filter((c) => c.services?.includes('awareness')).length,
  };

  return success(res, { stats, camps, serviceSplit });
});

export const ngoController = {
  getDashboard,
  getCamps,
  createCamp,
  updateCamp,
  deleteCamp,
  getImpact,
};

export default ngoController;
