// Common Types and Interfaces

export interface AthleteProfile {
  id: string;
  name: string;
  sport: string;
  school: string;
  schoolId: string;
  vaultAddress: string;
  eligibilityStatus: 'active' | 'inactive' | 'graduated';
  kycStatus: 'pending' | 'verified' | 'expired' | 'rejected';
  socialHandles: {
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
  nilSubdomain: string;
  walletAddress: string;
  totalEarnings: number;
  activeDeals: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NILDeal {
  id: string;
  dealId: string; // Blockchain deal ID
  athleteId: string;
  brandName: string;
  brandAddress: string;
  amount: number;
  currency: string;
  deliverables: string[];
  platformSource: 'opendorse' | 'inflcr' | 'basepath' | 'silo' | 'direct';
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'cancelled';
  revenueSplits: {
    athlete: number;
    school: number;
    collective: number;
    platform: number;
  };
  beneficiaries: string[];
  termsIPFS?: string;
  complianceApproved: boolean;
  complianceNotes?: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceRecord {
  id: string;
  dealId?: string;
  athleteId?: string;
  entityAddress: string;
  checkType: 'kyc' | 'aml' | 'sanctions' | 'deal_compliance';
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  verificationLevel?: 'basic' | 'enhanced' | 'institutional';
  jurisdiction: string;
  reason?: string;
  documentHash?: string;
  checkedBy: string;
  checkedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'tip' | 'subscription' | 'merch_purchase' | 'nft_purchase' | 'deal_payout' | 'revenue_split';
  fromUser?: string;
  toAthlete: string;
  dealId?: string;
  amount: number;
  currency: string;
  nilTokens?: number;
  transactionHash?: string;
  blockNumber?: number;
  platformFee: number;
  complianceStatus: 'pending' | 'approved' | 'flagged';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface School {
  id: string;
  name: string;
  division: 'D1' | 'D2' | 'D3' | 'NAIA' | 'NJCAA';
  conference?: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  walletAddress: string;
  complianceSettings: {
    requiresApproval: boolean;
    maxDealAmount: number;
    revenueSharePercentage: number;
    approvers: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Platform {
  id: string;
  name: string;
  type: 'nil_platform' | 'social_media' | 'marketplace' | 'collective';
  apiConfig: {
    baseUrl: string;
    authType: 'api_key' | 'oauth' | 'webhook';
    webhookUrl?: string;
    rateLimits: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  integrationStatus: 'active' | 'inactive' | 'pending' | 'error';
  supportedFeatures: {
    dealCreation: boolean;
    contentMonetization: boolean;
    fanEngagement: boolean;
    analytics: boolean;
  };
  feeStructure: {
    platformFee: number;
    transactionFee: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  type?: string;
  [key: string]: any;
}

// Webhook Types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  source: string;
  signature?: string;
}

export interface OpendorseWebhook extends WebhookPayload {
  event: 'deal.created' | 'deal.updated' | 'deal.completed' | 'deal.cancelled';
  data: {
    dealId: string;
    athleteId: string;
    brandId: string;
    amount: number;
    deliverables: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface INFLCRWebhook extends WebhookPayload {
  event: 'content.posted' | 'engagement.updated' | 'monetization.earned';
  data: {
    contentId: string;
    athleteId: string;
    platform: 'instagram' | 'twitter' | 'tiktok' | 'facebook';
    engagementMetrics: {
      likes: number;
      comments: number;
      shares: number;
      views: number;
    };
    monetizationAmount?: number;
  };
}

// Service Layer Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface BlockchainTransaction {
  hash: string;
  blockNumber: number;
  gasUsed: number;
  status: 'success' | 'failed';
  events: any[];
}

export interface ContractCallOptions {
  gasLimit?: number;
  gasPrice?: string;
  value?: string;
}

// Analytics Types
export interface AnalyticsMetrics {
  totalDeals: number;
  totalValue: number;
  averageDealValue: number;
  topAthletes: Array<{
    athleteId: string;
    name: string;
    totalEarnings: number;
    dealCount: number;
  }>;
  topBrands: Array<{
    brandName: string;
    totalSpent: number;
    dealCount: number;
  }>;
  platformDistribution: Array<{
    platform: string;
    dealCount: number;
    totalValue: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    dealCount: number;
    totalValue: number;
  }>;
}

export interface ComplianceMetrics {
  totalChecks: number;
  approvalRate: number;
  averageProcessingTime: number;
  flaggedTransactions: number;
  kycVerifications: {
    total: number;
    pending: number;
    verified: number;
    expired: number;
  };
}

// Error Types
export class APIError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}