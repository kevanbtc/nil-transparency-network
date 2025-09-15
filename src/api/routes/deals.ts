import { Router } from 'express';
import { dealController } from '../controllers/dealController';
import { requireRole, requireOwnership } from '../../middleware/authentication';
import { validateRequest } from '../../middleware/validation';
import { 
  createDealSchema,
  updateDealSchema,
  uuidParamSchema,
  paginationSchema,
  dateRangeSchema
} from '../../schemas/athleteSchemas';

const router = Router();

/**
 * @route GET /api/v1/deals
 * @desc Get all deals with pagination and filtering
 * @access Admin, School, Compliance
 */
router.get(
  '/',
  requireRole(['admin', 'school', 'compliance']),
  validateRequest({ 
    query: paginationSchema.keys({
      status: require('joi').string().valid('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled').optional(),
      platformSource: require('joi').string().valid('opendorse', 'inflcr', 'basepath', 'silo', 'direct').optional(),
      athleteId: require('joi').string().uuid().optional(),
      ...dateRangeSchema.describe().keys
    })
  }),
  dealController.getDeals
);

/**
 * @route GET /api/v1/deals/:id
 * @desc Get deal by ID
 * @access Admin, School, Compliance, Owner (Athlete)
 */
router.get(
  '/:id',
  validateRequest({ params: uuidParamSchema }),
  dealController.getDealById
);

/**
 * @route POST /api/v1/deals
 * @desc Create new NIL deal
 * @access Admin, Authorized Platforms
 */
router.post(
  '/',
  requireRole(['admin', 'platform']),
  validateRequest({ body: createDealSchema }),
  dealController.createDeal
);

/**
 * @route PUT /api/v1/deals/:id
 * @desc Update deal status or details
 * @access Admin, Compliance
 */
router.put(
  '/:id',
  requireRole(['admin', 'compliance']),
  validateRequest({ 
    params: uuidParamSchema,
    body: updateDealSchema 
  }),
  dealController.updateDeal
);

/**
 * @route DELETE /api/v1/deals/:id
 * @desc Cancel/delete deal
 * @access Admin
 */
router.delete(
  '/:id',
  requireRole(['admin']),
  validateRequest({ params: uuidParamSchema }),
  dealController.deleteDeal
);

/**
 * @route POST /api/v1/deals/:id/execute
 * @desc Execute approved deal on blockchain
 * @access Admin, Compliance
 */
router.post(
  '/:id/execute',
  requireRole(['admin', 'compliance']),
  validateRequest({ params: uuidParamSchema }),
  dealController.executeDeal
);

/**
 * @route GET /api/v1/deals/:id/compliance
 * @desc Get deal compliance status
 * @access Admin, Compliance, Owner (Athlete)
 */
router.get(
  '/:id/compliance',
  validateRequest({ params: uuidParamSchema }),
  dealController.getDealCompliance
);

/**
 * @route POST /api/v1/deals/:id/compliance
 * @desc Update deal compliance status
 * @access Admin, Compliance
 */
router.post(
  '/:id/compliance',
  requireRole(['admin', 'compliance']),
  validateRequest({ params: uuidParamSchema }),
  dealController.updateDealCompliance
);

/**
 * @route GET /api/v1/deals/analytics/overview
 * @desc Get deals analytics overview
 * @access Admin, School
 */
router.get(
  '/analytics/overview',
  requireRole(['admin', 'school']),
  dealController.getDealsAnalytics
);

export { router as dealRoutes };