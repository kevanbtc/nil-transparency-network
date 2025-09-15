import { database } from '../database/connection';
import { 
  AthleteProfile, 
  NILDeal, 
  PaginationOptions, 
  FilterOptions,
  ServiceResponse 
} from '../types';
import { logger } from '../utils/logger';

class AthleteService {
  /**
   * Get all athletes with pagination and filtering
   */
  async getAthletes(
    pagination: PaginationOptions,
    filters: FilterOptions
  ): Promise<ServiceResponse<{ athletes: AthleteProfile[]; total: number }>> {
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];

      // Build filter conditions
      if (filters.sport) {
        queryParams.push(filters.sport);
        whereClause += ` AND LOWER(a.sport) = LOWER($${queryParams.length})`;
      }

      if (filters.school) {
        queryParams.push(filters.school);
        whereClause += ` AND LOWER(s.name) = LOWER($${queryParams.length})`;
      }

      if (filters.eligibilityStatus) {
        queryParams.push(filters.eligibilityStatus);
        whereClause += ` AND a.eligibility_status = $${queryParams.length}`;
      }

      if (filters.kycStatus) {
        queryParams.push(filters.kycStatus);
        whereClause += ` AND a.kyc_status = $${queryParams.length}`;
      }

      if (filters.search) {
        queryParams.push(`%${filters.search}%`);
        whereClause += ` AND (LOWER(a.name) LIKE LOWER($${queryParams.length}) OR LOWER(s.name) LIKE LOWER($${queryParams.length}))`;
      }

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM athletes a
        LEFT JOIN schools s ON a.school_id = s.id
        ${whereClause}
      `;

      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const offset = (pagination.page! - 1) * pagination.limit!;
      queryParams.push(pagination.limit, offset);

      const dataQuery = `
        SELECT 
          a.id,
          a.name,
          a.sport,
          a.school_id,
          s.name as school,
          a.vault_address,
          a.eligibility_status,
          a.kyc_status,
          a.wallet_address,
          a.nil_subdomain,
          a.total_earnings,
          a.active_deals,
          a.twitter_handle,
          a.instagram_handle,
          a.tiktok_handle,
          a.linkedin_handle,
          a.created_at,
          a.updated_at
        FROM athletes a
        LEFT JOIN schools s ON a.school_id = s.id
        ${whereClause}
        ORDER BY ${pagination.sortBy} ${pagination.sortOrder}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;

      const dataResult = await database.query(dataQuery, queryParams);
      
      const athletes: AthleteProfile[] = dataResult.rows.map(this.mapRowToAthlete);

      return {
        success: true,
        data: { athletes, total },
      };
    } catch (error) {
      logger.error('Error getting athletes:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Get athlete by ID
   */
  async getAthleteById(id: string): Promise<AthleteProfile | null> {
    try {
      const query = `
        SELECT 
          a.id,
          a.name,
          a.sport,
          a.school_id,
          s.name as school,
          a.vault_address,
          a.eligibility_status,
          a.kyc_status,
          a.wallet_address,
          a.nil_subdomain,
          a.total_earnings,
          a.active_deals,
          a.twitter_handle,
          a.instagram_handle,
          a.tiktok_handle,
          a.linkedin_handle,
          a.created_at,
          a.updated_at
        FROM athletes a
        LEFT JOIN schools s ON a.school_id = s.id
        WHERE a.id = $1
      `;

      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAthlete(result.rows[0]);
    } catch (error) {
      logger.error('Error getting athlete by ID:', error);
      throw error;
    }
  }

  /**
   * Create new athlete
   */
  async createAthlete(athleteData: Partial<AthleteProfile>): Promise<AthleteProfile> {
    try {
      const query = `
        INSERT INTO athletes (
          name, sport, school_id, vault_address, wallet_address, 
          nil_subdomain, twitter_handle, instagram_handle, 
          tiktok_handle, linkedin_handle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        athleteData.name,
        athleteData.sport,
        athleteData.schoolId,
        athleteData.vaultAddress,
        athleteData.walletAddress,
        athleteData.nilSubdomain,
        athleteData.socialHandles?.twitter,
        athleteData.socialHandles?.instagram,
        athleteData.socialHandles?.tiktok,
        athleteData.socialHandles?.linkedin,
      ];

      const result = await database.query(query, values);
      
      // Get full athlete data with school info
      const createdAthlete = await this.getAthleteById(result.rows[0].id);
      return createdAthlete!;
    } catch (error) {
      logger.error('Error creating athlete:', error);
      throw error;
    }
  }

  /**
   * Update athlete
   */
  async updateAthlete(id: string, updates: Partial<AthleteProfile>): Promise<AthleteProfile | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      // Build dynamic update query
      if (updates.name) {
        setClauses.push(`name = $${values.length + 1}`);
        values.push(updates.name);
      }

      if (updates.sport) {
        setClauses.push(`sport = $${values.length + 1}`);
        values.push(updates.sport);
      }

      if (updates.eligibilityStatus) {
        setClauses.push(`eligibility_status = $${values.length + 1}`);
        values.push(updates.eligibilityStatus);
      }

      if (updates.kycStatus) {
        setClauses.push(`kyc_status = $${values.length + 1}`);
        values.push(updates.kycStatus);
      }

      if (updates.nilSubdomain) {
        setClauses.push(`nil_subdomain = $${values.length + 1}`);
        values.push(updates.nilSubdomain);
      }

      if (updates.socialHandles?.twitter !== undefined) {
        setClauses.push(`twitter_handle = $${values.length + 1}`);
        values.push(updates.socialHandles.twitter);
      }

      if (updates.socialHandles?.instagram !== undefined) {
        setClauses.push(`instagram_handle = $${values.length + 1}`);
        values.push(updates.socialHandles.instagram);
      }

      if (updates.socialHandles?.tiktok !== undefined) {
        setClauses.push(`tiktok_handle = $${values.length + 1}`);
        values.push(updates.socialHandles.tiktok);
      }

      if (updates.socialHandles?.linkedin !== undefined) {
        setClauses.push(`linkedin_handle = $${values.length + 1}`);
        values.push(updates.socialHandles.linkedin);
      }

      if (setClauses.length === 0) {
        return await this.getAthleteById(id);
      }

      values.push(id);
      const query = `
        UPDATE athletes 
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return await this.getAthleteById(id);
    } catch (error) {
      logger.error('Error updating athlete:', error);
      throw error;
    }
  }

  /**
   * Delete athlete
   */
  async deleteAthlete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM athletes WHERE id = $1';
      const result = await database.query(query, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting athlete:', error);
      throw error;
    }
  }

  /**
   * Get athlete's deals
   */
  async getAthleteDeals(
    athleteId: string, 
    pagination: PaginationOptions, 
    filters: FilterOptions
  ): Promise<{ deals: NILDeal[]; total: number }> {
    try {
      let whereClause = 'WHERE athlete_id = $1';
      const queryParams: any[] = [athleteId];

      if (filters.status) {
        queryParams.push(filters.status);
        whereClause += ` AND status = $${queryParams.length}`;
      }

      if (filters.platformSource) {
        queryParams.push(filters.platformSource);
        whereClause += ` AND platform_source = $${queryParams.length}`;
      }

      if (filters.startDate) {
        queryParams.push(filters.startDate);
        whereClause += ` AND created_at >= $${queryParams.length}`;
      }

      if (filters.endDate) {
        queryParams.push(filters.endDate);
        whereClause += ` AND created_at <= $${queryParams.length}`;
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM nil_deals ${whereClause}`;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated data
      const offset = (pagination.page! - 1) * pagination.limit!;
      queryParams.push(pagination.limit, offset);

      const dataQuery = `
        SELECT * FROM nil_deals
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;

      const dataResult = await database.query(dataQuery, queryParams);
      const deals = dataResult.rows.map(this.mapRowToDeal);

      return { deals, total };
    } catch (error) {
      logger.error('Error getting athlete deals:', error);
      throw error;
    }
  }

  /**
   * Get athlete's transactions
   */
  async getAthleteTransactions(
    athleteId: string, 
    pagination: PaginationOptions, 
    filters: FilterOptions
  ): Promise<{ transactions: any[]; total: number }> {
    try {
      let whereClause = 'WHERE to_athlete = $1';
      const queryParams: any[] = [athleteId];

      if (filters.type) {
        queryParams.push(filters.type);
        whereClause += ` AND type = $${queryParams.length}`;
      }

      if (filters.startDate) {
        queryParams.push(filters.startDate);
        whereClause += ` AND created_at >= $${queryParams.length}`;
      }

      if (filters.endDate) {
        queryParams.push(filters.endDate);
        whereClause += ` AND created_at <= $${queryParams.length}`;
      }

      // Count and fetch similar to deals
      const countQuery = `SELECT COUNT(*) as total FROM transactions ${whereClause}`;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const offset = (pagination.page! - 1) * pagination.limit!;
      queryParams.push(pagination.limit, offset);

      const dataQuery = `
        SELECT * FROM transactions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;

      const dataResult = await database.query(dataQuery, queryParams);
      const transactions = dataResult.rows;

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting athlete transactions:', error);
      throw error;
    }
  }

  /**
   * Get athlete earnings summary
   */
  async getAthleteEarnings(athleteId: string, period: string): Promise<any> {
    try {
      // Calculate date range based on period
      let dateCondition = '';
      if (period === '7d') {
        dateCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
      } else if (period === '30d') {
        dateCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
      } else if (period === '90d') {
        dateCondition = "AND created_at >= NOW() - INTERVAL '90 days'";
      }

      const query = `
        SELECT 
          SUM(amount) as total_earnings,
          COUNT(*) as total_transactions,
          AVG(amount) as average_amount,
          SUM(CASE WHEN type = 'tip' THEN amount ELSE 0 END) as tips_earnings,
          SUM(CASE WHEN type = 'deal_payout' THEN amount ELSE 0 END) as deals_earnings,
          SUM(CASE WHEN type = 'subscription' THEN amount ELSE 0 END) as subscription_earnings
        FROM transactions 
        WHERE to_athlete = $1 ${dateCondition}
      `;

      const result = await database.query(query, [athleteId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting athlete earnings:', error);
      throw error;
    }
  }

  /**
   * Get athlete compliance status
   */
  async getAthleteCompliance(athleteId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          check_type,
          status,
          verification_level,
          jurisdiction,
          expires_at,
          checked_at
        FROM compliance_records 
        WHERE athlete_id = $1 
        ORDER BY checked_at DESC
      `;

      const result = await database.query(query, [athleteId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting athlete compliance:', error);
      throw error;
    }
  }

  /**
   * Update athlete KYC
   */
  async updateAthleteKYC(athleteId: string, kycData: any): Promise<AthleteProfile | null> {
    try {
      await database.transaction(async (client) => {
        // Update athlete KYC status
        await client.query(
          'UPDATE athletes SET kyc_status = $1 WHERE id = $2',
          [kycData.status, athleteId]
        );

        // Insert compliance record
        await client.query(`
          INSERT INTO compliance_records (
            athlete_id, entity_address, check_type, status, 
            verification_level, jurisdiction, document_hash, 
            checked_by, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          athleteId,
          kycData.entityAddress,
          'kyc',
          kycData.status,
          kycData.verificationLevel,
          kycData.jurisdiction,
          kycData.documentHash,
          kycData.checkedBy,
          kycData.expiresAt
        ]);
      });

      return await this.getAthleteById(athleteId);
    } catch (error) {
      logger.error('Error updating athlete KYC:', error);
      throw error;
    }
  }

  // Helper methods
  private mapRowToAthlete(row: any): AthleteProfile {
    return {
      id: row.id,
      name: row.name,
      sport: row.sport,
      school: row.school,
      schoolId: row.school_id,
      vaultAddress: row.vault_address,
      eligibilityStatus: row.eligibility_status,
      kycStatus: row.kyc_status,
      socialHandles: {
        twitter: row.twitter_handle,
        instagram: row.instagram_handle,
        tiktok: row.tiktok_handle,
        linkedin: row.linkedin_handle,
      },
      nilSubdomain: row.nil_subdomain,
      walletAddress: row.wallet_address,
      totalEarnings: parseInt(row.total_earnings),
      activeDeals: row.active_deals,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToDeal(row: any): NILDeal {
    return {
      id: row.id,
      dealId: row.deal_id,
      athleteId: row.athlete_id,
      brandName: row.brand_name,
      brandAddress: row.brand_address,
      amount: parseInt(row.amount),
      currency: row.currency,
      deliverables: row.deliverables,
      platformSource: row.platform_source,
      status: row.status,
      revenueSplits: {
        athlete: row.athlete_split,
        school: row.school_split,
        collective: row.collective_split,
        platform: row.platform_split,
      },
      beneficiaries: row.beneficiaries,
      termsIPFS: row.terms_ipfs,
      complianceApproved: row.compliance_approved,
      complianceNotes: row.compliance_notes,
      executedAt: row.executed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const athleteService = new AthleteService();