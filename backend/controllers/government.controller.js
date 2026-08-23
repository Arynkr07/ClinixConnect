import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { Government } from '../models/index.js';
import { dashboardService } from '../services/dashboard.service.js';

/**
 * GET /government/dashboard
 * Role: government
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const govt = await Government.findOne({ user: req.user._id }).lean();
  if (!govt) throw new ApiError(404, 'Government profile not found.');

  const dashboard = await dashboardService.buildGovernmentDashboard({
    district: govt.district,
  });

  return success(res, { government: govt, ...dashboard });
});

/**
 * GET /government/schemes
 * Static catalogue of national health schemes. Stored as config data
 * (no dedicated model); extendable to a Scheme collection later.
 */
export const getSchemes = asyncHandler(async (_req, res) => {
  const schemes = [
    {
      code: 'pmjay',
      name: 'Ayushman Bharat PM-JAY',
      shortName: 'PM-JAY',
      department: 'National Health Authority',
      description:
        'Health assurance of up to ₹5 lakh per family per year for secondary and tertiary care.',
      eligibility: 'Economically vulnerable families (SECC database)',
    },
    {
      code: 'nhm',
      name: 'National Health Mission',
      shortName: 'NHM',
      department: 'Ministry of Health & Family Welfare',
      description:
        'Strengthening public health systems, maternal and child health, and disease control.',
      eligibility: 'Rural and urban poor populations',
    },
    {
      code: 'mi',
      name: 'Mission Indradhanush',
      shortName: 'MI',
      department: 'National Health Mission',
      description: 'Immunization drive targeting children and pregnant women.',
      eligibility: 'Children under 2 years, pregnant women',
    },
    {
      code: 'pmmvy',
      name: 'Pradhan Mantri Matru Vandana Yojana',
      shortName: 'PMMVY',
      department: 'Ministry of Women & Child Development',
      description: 'Cash incentive for first-time mothers during pregnancy and lactation.',
      eligibility: 'First live birth, mother aged 19+',
    },
    {
      code: 'npcdcs',
      name: 'National Programme for Prevention & Control of Non-Communicable Diseases',
      shortName: 'NPCDCS',
      department: 'National Health Mission',
      description: 'Screening and management of diabetes, hypertension, CVDs and cancer.',
      eligibility: 'Population above 30 years, high-risk groups',
    },
    {
      code: 'rbsk',
      name: 'Rashtriya Bal Swasthya Karyakram',
      shortName: 'RBSK',
      department: 'National Health Mission',
      description: 'Health screening of children for 4 Ds — Defects, Diseases, Deficiencies, Delays.',
      eligibility: 'Children aged 0–18 years',
    },
    {
      code: 'pmsma',
      name: 'Pradhan Mantri Surakshit Matritva Abhiyan',
      shortName: 'PMSMA',
      department: 'Ministry of Health & Family Welfare',
      description: 'Free antenatal check-ups for pregnant women on the 9th of every month.',
      eligibility: 'Pregnant women',
    },
  ];

  return success(res, schemes);
});

/**
 * GET /government/queries
 * Public queries + official replies (demo dataset).
 */
export const getPublicQueries = asyncHandler(async (_req, res) => {
  const queries = [
    {
      id: 'Q-1042',
      citizen: 'Ramesh Yadav',
      village: 'Amroli',
      topic: 'PMMVY Eligibility',
      question: 'Am I eligible for PMMVY if I already have one child?',
      status: 'answered',
      askedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      reply: {
        official: 'District Health Office',
        text: 'PMMVY provides benefits for the first live birth of the family. Please visit your nearest Anganwadi centre to register.',
        repliedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      },
    },
    {
      id: 'Q-1043',
      citizen: 'Sunita Kumari',
      village: 'Devgram',
      topic: 'RBSK Screening',
      question: 'When is the next RBSK screening camp in Devgram?',
      status: 'pending',
      askedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    {
      id: 'Q-1044',
      citizen: 'Mohan Lal',
      village: 'Palia',
      topic: 'PM-JAY Hospital List',
      question: 'Which hospitals near Palia are empanelled under PM-JAY?',
      status: 'answered',
      askedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
      reply: {
        official: 'District Health Office',
        text: 'Palia has two empanelled hospitals — Palia Community Health Centre and Dhamtari District Hospital.',
        repliedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      },
    },
  ];

  return success(res, queries);
});

export const governmentController = {
  getDashboard,
  getSchemes,
  getPublicQueries,
};

export default governmentController;
