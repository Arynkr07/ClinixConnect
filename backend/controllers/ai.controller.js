import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { llmService } from '../services/llm.service.js';

/**
 * POST /ai/pre-visit-summary
 * Body: { symptoms, severity }
 */
export const getPreVisitSummary = asyncHandler(async (req, res) => {
  const { symptoms, severity } = req.body || {};
  const summary = await llmService.generatePreVisitSummary({ symptoms, severity });
  return success(res, summary);
});

/**
 * POST /ai/post-visit-summary
 * Body: { clinicalNotes, medicines }
 */
export const getPostVisitSummary = asyncHandler(async (req, res) => {
  const { clinicalNotes, medicines } = req.body || {};
  const summary = await llmService.generatePostVisitSummary({ clinicalNotes, medicines });
  return success(res, summary);
});

export const aiController = {
  getPreVisitSummary,
  getPostVisitSummary,
};

export default aiController;
