import { Router } from 'express';
import { complianceController } from '../controllers/complianceController';
import { requireRole } from '../../middleware/authentication';
import { validateRequest } from '../../middleware/validation';
import { 
  kycVerificationSchema,
  complianceCheckSchema,
  uuidParamSchema,
  paginationSchema,
  analyticsQuerySchema
} from '../../schemas/athleteSchemas';

const router = Router();

/**
 * @route GET /api/v1/compliance/records
 * @desc Get all compliance records
 * @access Admin, Compliance
 */
router.get(
  '/records',
  requireRole(['admin', 'compliance']),
  validateRequest({ 
    query: paginationSchema.keys({
      checkType: require('joi').string().valid('kyc', 'aml', 'sanctions', 'deal_compliance').optional(),
      status: require('joi').string().valid('pending', 'approved', 'flagged').optional(),
      jurisdiction: require('joi').string().length(2).optional(),
    })
  }),
  complianceController.getComplianceRecords
);

/**
 * @route POST /api/v1/compliance/kyc/verify
 * @desc Verify KYC for an entity
 * @access Admin, Compliance
 */
router.post(
  '/kyc/verify',
  requireRole(['admin', 'compliance']),
  validateRequest({ body: kycVerificationSchema }),
  complianceController.verifyKYC
);

/**
 * @route POST /api/v1/compliance/deal/check
 * @desc Check deal compliance
 * @access Admin, Compliance, Automated Systems
 */
router.post(
  '/deal/check',
  requireRole(['admin', 'compliance', 'system']),
  validateRequest({ body: complianceCheckSchema }),
  complianceController.checkDealCompliance
);

/**
 * @route GET /api/v1/compliance/sanctions/:address
 * @desc Check sanctions status for address
 * @access Admin, Compliance
 */
router.get(
  '/sanctions/:address',
  requireRole(['admin', 'compliance']),
  validateRequest({ 
    params: require('joi').object({
      address: require('joi').string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
    })
  }),
  complianceController.checkSanctions
);

/**
 * @route POST /api/v1/compliance/sanctions/add
 * @desc Add entity to sanctions list
 * @access Admin, Compliance
 */
router.post(
  '/sanctions/add',
  requireRole(['admin', 'compliance']),
  validateRequest({ 
    body: require('joi').object({
      entityAddress: require('joi').string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      listName: require('joi').string().max(255).required(),
      reason: require('joi').string().max(1000).required(),
      evidenceHash: require('joi').string().pattern(/^0x[a-fA-F0-9]{64}$/).optional()
    })
  }),
  complianceController.addToSanctionsList
);

/**
 * @route GET /api/v1/compliance/thresholds
 * @desc Get compliance thresholds
 * @access Admin, Compliance
 */
router.get(
  '/thresholds',
  requireRole(['admin', 'compliance']),
  complianceController.getThresholds
);

/**
 * @route PUT /api/v1/compliance/thresholds
 * @desc Update compliance thresholds
 * @access Admin, Compliance
 */
router.put(
  '/thresholds',
  requireRole(['admin', 'compliance']),
  validateRequest({ 
    body: require('joi').object({
      basicKYCLimit: require('joi').number().positive().optional(),
      enhancedKYCLimit: require('joi').number().positive().optional(),
      institutionalLimit: require('joi').number().positive().optional(),
      dailyLimit: require('joi').number().positive().optional(),
      monthlyLimit: require('joi').number().positive().optional(),
    })
  }),
  complianceController.updateThresholds
);

/**
 * @route GET /api/v1/compliance/reports
 * @desc Get compliance reports
 * @access Admin, Compliance, Auditor
 */
router.get(
  '/reports',
  requireRole(['admin', 'compliance', 'auditor']),
  validateRequest({ query: analyticsQuerySchema }),
  complianceController.getComplianceReports
);

/**
 * @route POST /api/v1/compliance/reports/generate
 * @desc Generate compliance report
 * @access Admin, Compliance, Auditor
 */
router.post(
  '/reports/generate',
  requireRole(['admin', 'compliance', 'auditor']),
  validateRequest({ 
    body: require('joi').object({
      athleteId: require('joi').string().uuid().optional(),
      startDate: require('joi').date().iso().required(),
      endDate: require('joi').date().iso().min(require('joi').ref('startDate')).required(),
      reportType: require('joi').string().valid('kyc', 'transactions', 'deals', 'comprehensive').required(),
      format: require('joi').string().valid('json', 'pdf', 'csv').default('json')
    })
  }),
  complianceController.generateReport
);

/**
 * @route GET /api/v1/compliance/analytics
 * @desc Get compliance analytics
 * @access Admin, Compliance
 */
router.get(
  '/analytics',
  requireRole(['admin', 'compliance']),
  validateRequest({ query: analyticsQuerySchema }),
  complianceController.getComplianceAnalytics
);

/**
 * @route GET /api/v1/compliance/jurisdictions
 * @desc Get approved jurisdictions
 * @access Admin, Compliance
 */
router.get(
  '/jurisdictions',
  requireRole(['admin', 'compliance']),
  complianceController.getApprovedJurisdictions
);

/**
 * @route POST /api/v1/compliance/jurisdictions
 * @desc Add approved jurisdiction
 * @access Admin, Compliance
 */
router.post(
  '/jurisdictions',
  requireRole(['admin', 'compliance']),
  validateRequest({ 
    body: require('joi').object({
      jurisdiction: require('joi').string().length(2).uppercase().required(),
      name: require('joi').string().max(255).required(),
      regulations: require('joi').array().items(require('joi').string()).optional()
    })
  }),
  complianceController.addApprovedJurisdiction
);

export { router as complianceRoutes };