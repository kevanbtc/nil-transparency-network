import { Router } from 'express';
import { platformController } from '../controllers/platformController';
import { requireRole } from '../../middleware/authentication';
import { validateRequest } from '../../middleware/validation';

const router = Router();

/**
 * @route GET /api/v1/platforms
 * @desc Get all platforms
 * @access Admin
 */
router.get(
  '/',
  requireRole(['admin']),
  platformController.getPlatforms
);

/**
 * @route POST /api/v1/platforms
 * @desc Register new platform
 * @access Admin
 */
router.post(
  '/',
  requireRole(['admin']),
  validateRequest({
    body: require('joi').object({
      name: require('joi').string().max(255).required(),
      type: require('joi').string().valid('nil_platform', 'social_media', 'marketplace', 'collective').required(),
      apiBaseUrl: require('joi').string().uri().required(),
      authType: require('joi').string().valid('api_key', 'oauth', 'webhook').required(),
      webhookUrl: require('joi').string().uri().optional(),
      requestsPerMinute: require('joi').number().integer().min(1).default(60),
      burstLimit: require('joi').number().integer().min(1).default(100),
      supportedFeatures: require('joi').object({
        dealCreation: require('joi').boolean().default(false),
        contentMonetization: require('joi').boolean().default(false),
        fanEngagement: require('joi').boolean().default(false),
        analytics: require('joi').boolean().default(false),
      }).required(),
      feeStructure: require('joi').object({
        platformFee: require('joi').number().min(0).max(10000).default(0),
        transactionFee: require('joi').number().min(0).max(10000).default(0),
      }).required(),
    })
  }),
  platformController.createPlatform
);

/**
 * @route PUT /api/v1/platforms/:id
 * @desc Update platform
 * @access Admin
 */
router.put(
  '/:id',
  requireRole(['admin']),
  validateRequest({ 
    params: require('joi').object({ id: require('joi').string().uuid().required() }) 
  }),
  platformController.updatePlatform
);

/**
 * @route DELETE /api/v1/platforms/:id
 * @desc Delete platform
 * @access Admin
 */
router.delete(
  '/:id',
  requireRole(['admin']),
  validateRequest({ 
    params: require('joi').object({ id: require('joi').string().uuid().required() }) 
  }),
  platformController.deletePlatform
);

export { router as platformRoutes };