import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { requireRole } from '../../middleware/authentication';
import { validateRequest } from '../../middleware/validation';
import { analyticsQuerySchema } from '../../schemas/athleteSchemas';

const router = Router();

/**
 * @route GET /api/v1/analytics/overview
 * @desc Get system overview analytics
 * @access Admin, School
 */
router.get(
  '/overview',
  requireRole(['admin', 'school']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getSystemOverview
);

/**
 * @route GET /api/v1/analytics/athletes
 * @desc Get athlete analytics
 * @access Admin, School
 */
router.get(
  '/athletes',
  requireRole(['admin', 'school']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getAthleteAnalytics
);

/**
 * @route GET /api/v1/analytics/deals
 * @desc Get deal analytics
 * @access Admin, School
 */
router.get(
  '/deals',
  requireRole(['admin', 'school']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getDealAnalytics
);

/**
 * @route GET /api/v1/analytics/platforms
 * @desc Get platform analytics
 * @access Admin
 */
router.get(
  '/platforms',
  requireRole(['admin']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getPlatformAnalytics
);

/**
 * @route GET /api/v1/analytics/compliance
 * @desc Get compliance analytics
 * @access Admin, Compliance
 */
router.get(
  '/compliance',
  requireRole(['admin', 'compliance']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getComplianceAnalytics
);

/**
 * @route GET /api/v1/analytics/revenue
 * @desc Get revenue analytics
 * @access Admin, School
 */
router.get(
  '/revenue',
  requireRole(['admin', 'school']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getRevenueAnalytics
);

/**
 * @route GET /api/v1/analytics/trends
 * @desc Get trend analytics
 * @access Admin, School
 */
router.get(
  '/trends',
  requireRole(['admin', 'school']),
  validateRequest({ query: analyticsQuerySchema }),
  analyticsController.getTrendAnalytics
);

export { router as analyticsRoutes };