import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';
import { webhookRateLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../middleware/validation';
import { webhookPayloadSchema } from '../../schemas/athleteSchemas';

const router = Router();

// Apply webhook-specific rate limiting
router.use(webhookRateLimiter);

/**
 * @route POST /api/v1/webhooks/opendorse
 * @desc Handle Opendorse webhook events
 * @access Public (with signature verification)
 */
router.post(
  '/opendorse',
  validateRequest({ body: webhookPayloadSchema }),
  webhookController.handleOpendorseWebhook
);

/**
 * @route POST /api/v1/webhooks/inflcr
 * @desc Handle INFLCR webhook events
 * @access Public (with signature verification)
 */
router.post(
  '/inflcr',
  validateRequest({ body: webhookPayloadSchema }),
  webhookController.handleINFLCRWebhook
);

/**
 * @route POST /api/v1/webhooks/basepath
 * @desc Handle Basepath webhook events
 * @access Public (with signature verification)
 */
router.post(
  '/basepath',
  validateRequest({ body: webhookPayloadSchema }),
  webhookController.handleBasepathWebhook
);

/**
 * @route POST /api/v1/webhooks/generic
 * @desc Handle generic webhook events
 * @access Public (with signature verification)
 */
router.post(
  '/generic',
  validateRequest({ body: webhookPayloadSchema }),
  webhookController.handleGenericWebhook
);

export { router as webhookRoutes };