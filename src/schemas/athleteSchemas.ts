import Joi from 'joi';

// Athlete validation schemas
export const createAthleteSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  sport: Joi.string().min(2).max(100).required(),
  schoolId: Joi.string().uuid().optional(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  nilSubdomain: Joi.string().alphanum().min(3).max(50).optional(),
  socialHandles: Joi.object({
    twitter: Joi.string().max(255).optional(),
    instagram: Joi.string().max(255).optional(),
    tiktok: Joi.string().max(255).optional(),
    linkedin: Joi.string().max(255).optional(),
  }).optional(),
});

export const updateAthleteSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  sport: Joi.string().min(2).max(100).optional(),
  eligibilityStatus: Joi.string().valid('active', 'inactive', 'graduated').optional(),
  kycStatus: Joi.string().valid('pending', 'verified', 'expired', 'rejected').optional(),
  nilSubdomain: Joi.string().alphanum().min(3).max(50).optional(),
  socialHandles: Joi.object({
    twitter: Joi.string().max(255).allow('').optional(),
    instagram: Joi.string().max(255).allow('').optional(),
    tiktok: Joi.string().max(255).allow('').optional(),
    linkedin: Joi.string().max(255).allow('').optional(),
  }).optional(),
});

export const queryAthleteSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('name', 'sport', 'createdAt', 'totalEarnings').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  sport: Joi.string().optional(),
  school: Joi.string().optional(),
  eligibilityStatus: Joi.string().valid('active', 'inactive', 'graduated').optional(),
  kycStatus: Joi.string().valid('pending', 'verified', 'expired', 'rejected').optional(),
  search: Joi.string().min(2).max(255).optional(),
});

// NIL Deal validation schemas
export const createDealSchema = Joi.object({
  athleteId: Joi.string().uuid().required(),
  brandName: Joi.string().min(2).max(255).required(),
  brandAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().valid('ETH', 'USDC', 'USDT').default('ETH'),
  deliverables: Joi.array().items(Joi.string().max(500)).min(1).required(),
  platformSource: Joi.string().valid('opendorse', 'inflcr', 'basepath', 'silo', 'direct').required(),
  revenueSplits: Joi.object({
    athlete: Joi.number().min(0).max(100).required(),
    school: Joi.number().min(0).max(100).default(0),
    collective: Joi.number().min(0).max(100).default(0),
    platform: Joi.number().min(0).max(100).default(0),
  }).custom((value, helpers) => {
    const total = value.athlete + value.school + value.collective + value.platform;
    if (total !== 100) {
      return helpers.error('splits.total', { total });
    }
    return value;
  }).required(),
  beneficiaries: Joi.array().items(Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/)).min(1).required(),
  termsIPFS: Joi.string().optional(),
}).messages({
  'splits.total': 'Revenue splits must total 100%, got {{#total}}%',
});

export const updateDealSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled').optional(),
  complianceNotes: Joi.string().max(1000).optional(),
});

// Compliance validation schemas
export const kycVerificationSchema = Joi.object({
  entityAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  verificationLevel: Joi.string().valid('basic', 'enhanced', 'institutional').required(),
  jurisdiction: Joi.string().length(2).uppercase().required(),
  documentHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  expiryTimestamp: Joi.number().integer().min(Date.now() / 1000).required(),
  checkedBy: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

export const complianceCheckSchema = Joi.object({
  dealId: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  athleteAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  brandAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  amount: Joi.string().pattern(/^[0-9]+(\.[0-9]+)?$/).required(), // String representation of number
  jurisdiction: Joi.string().length(2).uppercase().required(),
});

// Platform validation schemas
export const platformAuthSchema = Joi.object({
  platformAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

// Webhook validation schemas
export const webhookPayloadSchema = Joi.object({
  event: Joi.string().required(),
  data: Joi.object().required(),
  timestamp: Joi.string().isoDate().required(),
  source: Joi.string().required(),
  signature: Joi.string().optional(),
});

// Analytics validation schemas
export const analyticsQuerySchema = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', '1y', 'all').default('30d'),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day'),
  metrics: Joi.array().items(
    Joi.string().valid('deals', 'volume', 'athletes', 'platforms', 'compliance')
  ).optional(),
});

// Transaction validation schemas
export const transactionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  type: Joi.string().valid('tip', 'subscription', 'merch_purchase', 'nft_purchase', 'deal_payout', 'revenue_split').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  minAmount: Joi.number().positive().optional(),
  maxAmount: Joi.number().positive().min(Joi.ref('minAmount')).optional(),
});

// Generic validation schemas
export const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
});