import { Request, Response, NextFunction } from 'express';
import { athleteService } from '../../services/athleteService';
import { blockchainService } from '../../services/blockchainService';
import { 
  APIResponse, 
  AthleteProfile, 
  NotFoundError, 
  ValidationError,
  PaginationOptions,
  FilterOptions 
} from '../../types';
import { logger } from '../../utils/logger';

class AthleteController {
  /**
   * Get all athletes with pagination and filtering
   */
  async getAthletes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paginationOptions: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const filterOptions: FilterOptions = {
        sport: req.query.sport as string,
        school: req.query.school as string,
        eligibilityStatus: req.query.eligibilityStatus as string,
        kycStatus: req.query.kycStatus as string,
        search: req.query.search as string,
      };

      const result = await athleteService.getAthletes(paginationOptions, filterOptions);

      const response: APIResponse<AthleteProfile[]> = {
        success: true,
        data: result.athletes,
        pagination: {
          page: paginationOptions.page!,
          limit: paginationOptions.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / paginationOptions.limit!),
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete by ID
   */
  async getAthleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const athlete = await athleteService.getAthleteById(id);

      if (!athlete) {
        throw new NotFoundError('Athlete not found');
      }

      const response: APIResponse<AthleteProfile> = {
        success: true,
        data: athlete,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new athlete profile
   */
  async createAthlete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const athleteData = req.body;
      
      // Deploy NIL vault on blockchain
      logger.info(`Deploying NIL vault for athlete: ${athleteData.name}`);
      const vaultAddress = await blockchainService.deployNILVault(athleteData);
      
      // Create athlete profile with vault address
      const athlete = await athleteService.createAthlete({
        ...athleteData,
        vaultAddress,
      });

      const response: APIResponse<AthleteProfile> = {
        success: true,
        data: athlete,
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create athlete:', error);
      next(error);
    }
  }

  /**
   * Update athlete profile
   */
  async updateAthlete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const athlete = await athleteService.updateAthlete(id, updates);

      if (!athlete) {
        throw new NotFoundError('Athlete not found');
      }

      const response: APIResponse<AthleteProfile> = {
        success: true,
        data: athlete,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete athlete profile
   */
  async deleteAthlete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await athleteService.deleteAthlete(id);

      if (!deleted) {
        throw new NotFoundError('Athlete not found');
      }

      const response: APIResponse<void> = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      res.status(204).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete's vault information
   */
  async getAthleteVault(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const athlete = await athleteService.getAthleteById(id);

      if (!athlete) {
        throw new NotFoundError('Athlete not found');
      }

      const vaultInfo = await blockchainService.getVaultInfo(athlete.vaultAddress);

      const response: APIResponse = {
        success: true,
        data: {
          address: athlete.vaultAddress,
          ...vaultInfo,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete's deals
   */
  async getAthleteDeals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const paginationOptions: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const filterOptions: FilterOptions = {
        status: req.query.status as string,
        platformSource: req.query.platformSource as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await athleteService.getAthleteDeals(id, paginationOptions, filterOptions);

      const response: APIResponse = {
        success: true,
        data: result.deals,
        pagination: {
          page: paginationOptions.page!,
          limit: paginationOptions.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / paginationOptions.limit!),
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete's transaction history
   */
  async getAthleteTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const paginationOptions: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const filterOptions: FilterOptions = {
        type: req.query.type as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await athleteService.getAthleteTransactions(id, paginationOptions, filterOptions);

      const response: APIResponse = {
        success: true,
        data: result.transactions,
        pagination: {
          page: paginationOptions.page!,
          limit: paginationOptions.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / paginationOptions.limit!),
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete's earnings summary
   */
  async getAthleteEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const period = req.query.period as string || '30d';
      
      const earnings = await athleteService.getAthleteEarnings(id, period);

      const response: APIResponse = {
        success: true,
        data: earnings,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete's compliance status
   */
  async getAthleteCompliance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const compliance = await athleteService.getAthleteCompliance(id);

      const response: APIResponse = {
        success: true,
        data: compliance,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update athlete's KYC information
   */
  async updateAthleteKYC(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const kycData = req.body;

      const athlete = await athleteService.getAthleteById(id);
      if (!athlete) {
        throw new NotFoundError('Athlete not found');
      }

      // Update KYC on blockchain
      await blockchainService.updateKYC(athlete.vaultAddress, kycData);

      // Update athlete record
      const updatedAthlete = await athleteService.updateAthleteKYC(id, kycData);

      const response: APIResponse = {
        success: true,
        data: updatedAthlete,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Authorize platform to create deals for athlete
   */
  async authorizePlatform(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { platformAddress } = req.body;

      const athlete = await athleteService.getAthleteById(id);
      if (!athlete) {
        throw new NotFoundError('Athlete not found');
      }

      await blockchainService.authorizePlatform(athlete.vaultAddress, platformAddress);

      const response: APIResponse = {
        success: true,
        data: { message: 'Platform authorized successfully' },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove platform authorization
   */
  async deauthorizePlatform(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, platformId } = req.params;

      const athlete = await athleteService.getAthleteById(id);
      if (!athlete) {
        throw new NotFoundError('Athlete not found');
      }

      await blockchainService.deauthorizePlatform(athlete.vaultAddress, platformId);

      const response: APIResponse = {
        success: true,
        data: { message: 'Platform authorization removed successfully' },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const athleteController = new AthleteController();