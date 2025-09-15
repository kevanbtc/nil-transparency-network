import { Router } from 'express';
import { athleteController } from '../controllers/athleteController';
import { requireRole, requireOwnership } from '../../middleware/authentication';
import { validateRequest } from '../../middleware/validation';
import { 
  createAthleteSchema,
  updateAthleteSchema,
  queryAthleteSchema 
} from '../../schemas/athleteSchemas';

const router = Router();

/**
 * @route GET /api/v1/athletes
 * @desc Get all athletes with pagination and filtering
 * @access Admin, School
 */
router.get(
  '/',
  requireRole(['admin', 'school']),
  validateRequest({ query: queryAthleteSchema }),
  athleteController.getAthletes
);

/**
 * @route GET /api/v1/athletes/:id
 * @desc Get athlete by ID
 * @access Admin, School, Owner (Athlete)
 */
router.get(
  '/:id',
  requireOwnership('id'),
  athleteController.getAthleteById
);

/**
 * @route POST /api/v1/athletes
 * @desc Create new athlete profile
 * @access Admin, School
 */
router.post(
  '/',
  requireRole(['admin', 'school']),
  validateRequest({ body: createAthleteSchema }),
  athleteController.createAthlete
);

/**
 * @route PUT /api/v1/athletes/:id
 * @desc Update athlete profile
 * @access Admin, School, Owner (Athlete)
 */
router.put(
  '/:id',
  requireOwnership('id'),
  validateRequest({ body: updateAthleteSchema }),
  athleteController.updateAthlete
);

/**
 * @route DELETE /api/v1/athletes/:id
 * @desc Delete athlete profile
 * @access Admin
 */
router.delete(
  '/:id',
  requireRole(['admin']),
  athleteController.deleteAthlete
);

/**
 * @route GET /api/v1/athletes/:id/vault
 * @desc Get athlete's vault information
 * @access Admin, School, Owner (Athlete)
 */
router.get(
  '/:id/vault',
  requireOwnership('id'),
  athleteController.getAthleteVault
);

/**
 * @route GET /api/v1/athletes/:id/deals
 * @desc Get athlete's deals
 * @access Admin, School, Owner (Athlete)
 */
router.get(
  '/:id/deals',
  requireOwnership('id'),
  athleteController.getAthleteDeals
);

/**
 * @route GET /api/v1/athletes/:id/transactions
 * @desc Get athlete's transaction history
 * @access Admin, School, Owner (Athlete)
 */
router.get(
  '/:id/transactions',
  requireOwnership('id'),
  athleteController.getAthleteTransactions
);

/**
 * @route GET /api/v1/athletes/:id/earnings
 * @desc Get athlete's earnings summary
 * @access Admin, School, Owner (Athlete)
 */
router.get(
  '/:id/earnings',
  requireOwnership('id'),
  athleteController.getAthleteEarnings
);

/**
 * @route GET /api/v1/athletes/:id/compliance
 * @desc Get athlete's compliance status
 * @access Admin, Compliance, Owner (Athlete)
 */
router.get(
  '/:id/compliance',
  requireRole(['admin', 'compliance', 'athlete']),
  requireOwnership('id'),
  athleteController.getAthleteCompliance
);

/**
 * @route PUT /api/v1/athletes/:id/kyc
 * @desc Update athlete's KYC information
 * @access Admin, Compliance
 */
router.put(
  '/:id/kyc',
  requireRole(['admin', 'compliance']),
  athleteController.updateAthleteKYC
);

/**
 * @route POST /api/v1/athletes/:id/authorize-platform
 * @desc Authorize platform to create deals for athlete
 * @access Admin, Owner (Athlete)
 */
router.post(
  '/:id/authorize-platform',
  requireOwnership('id'),
  athleteController.authorizePlatform
);

/**
 * @route DELETE /api/v1/athletes/:id/authorize-platform/:platformId
 * @desc Remove platform authorization
 * @access Admin, Owner (Athlete)
 */
router.delete(
  '/:id/authorize-platform/:platformId',
  requireOwnership('id'),
  athleteController.deauthorizePlatform
);

export { router as athleteRoutes };