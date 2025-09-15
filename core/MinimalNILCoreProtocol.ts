/**
 * Minimal Global NIL Core Protocol
 * The essential primitives that every NIL platform adapter must honor
 * 
 * This represents the "minimal core protocol" that serves as the foundation
 * for all NIL interactions globally, while allowing regional flexibility
 */

export interface CoreNILProtocol {
  // Version of the core protocol
  readonly version: string;
  readonly protocolId: string;
}

/**
 * The Four Essential Primitives for Global NIL Standard
 * These are the minimum required functions every adapter must implement
 */

// Primitive 1: Universal Identity & Verification
export interface NILIdentity {
  // Universal athlete identifier (can be mapped to local IDs)
  readonly globalId: string;
  // Cryptographic proof of athlete identity
  readonly identityProof: string;
  // Jurisdiction-agnostic verification level
  readonly verificationTier: 'unverified' | 'basic' | 'enhanced' | 'institutional';
  // Universal reputation score (0-1000)
  readonly reputationScore: number;
}

// Primitive 2: Universal Deal Structure
export interface NILDeal {
  // Universal deal identifier
  readonly dealId: string;
  // Athlete global ID
  readonly athleteId: string;
  // Deal value in standardized format
  readonly value: {
    amount: number;
    currency: string; // ISO 4217 currency code or 'CRYPTO'
    usdEquivalent: number; // Always provided for comparison
  };
  // Universal deliverable commitment
  readonly commitment: string; // Human-readable commitment description
  // Cryptographic hash of full terms (stored on IPFS/similar)
  readonly termsHash: string;
  // Deal status using universal states
  readonly status: 'proposed' | 'approved' | 'active' | 'fulfilled' | 'disputed' | 'terminated';
}

// Primitive 3: Universal Compliance Status
export interface NILCompliance {
  // Compliance check identifier
  readonly checkId: string;
  // Which deal this compliance applies to
  readonly dealId: string;
  // Universal compliance status
  readonly status: 'pending' | 'approved' | 'rejected' | 'requires_review';
  // Standardized compliance categories checked
  readonly checks: {
    identity_verified: boolean;
    sanctions_cleared: boolean;
    jurisdiction_approved: boolean;
    amount_within_limits: boolean;
    data_protection_compliant: boolean;
  };
  // ISO 3166 jurisdiction codes where deal is compliant
  readonly approvedJurisdictions: string[];
}

// Primitive 4: Universal Audit Trail
export interface NILAuditRecord {
  // Audit record identifier
  readonly recordId: string;
  // What entity/transaction this audits
  readonly subjectId: string; // Can be dealId, athleteId, etc.
  // Type of audit record
  readonly recordType: 'deal_creation' | 'compliance_check' | 'payment_processed' | 'terms_modified' | 'dispute_filed';
  // Timestamp in ISO 8601 format
  readonly timestamp: string;
  // Immutable hash of the record content
  readonly contentHash: string;
  // Digital signature for authenticity
  readonly signature: string;
  // Optional: IPFS hash for detailed record storage
  readonly detailsHash?: string;
}

/**
 * Minimal Core Protocol Interface
 * Every NIL platform adapter MUST implement these methods
 */
export interface MinimalNILCoreProtocol extends CoreNILProtocol {
  
  // Primitive 1: Identity Management
  /**
   * Register or verify athlete identity in the universal system
   * @param identity - NIL identity information
   * @returns Promise resolving to global athlete ID
   */
  registerIdentity(identity: Omit<NILIdentity, 'globalId'>): Promise<string>;
  
  /**
   * Get athlete identity and verification status
   * @param globalId - Universal athlete identifier
   * @returns Promise resolving to identity information
   */
  getIdentity(globalId: string): Promise<NILIdentity>;
  
  // Primitive 2: Deal Management  
  /**
   * Create a new NIL deal in the universal system
   * @param deal - Deal information
   * @returns Promise resolving to deal ID
   */
  createDeal(deal: Omit<NILDeal, 'dealId'>): Promise<string>;
  
  /**
   * Update deal status (only specific state transitions allowed)
   * @param dealId - Deal identifier
   * @param newStatus - New deal status
   * @param evidence - Optional evidence hash for status change
   * @returns Promise resolving to success boolean
   */
  updateDealStatus(dealId: string, newStatus: NILDeal['status'], evidence?: string): Promise<boolean>;
  
  // Primitive 3: Compliance Verification
  /**
   * Perform universal compliance check on a deal
   * @param dealId - Deal to check compliance for
   * @param requestedJurisdictions - Jurisdictions to check compliance in
   * @returns Promise resolving to compliance status
   */
  checkCompliance(dealId: string, requestedJurisdictions: string[]): Promise<NILCompliance>;
  
  // Primitive 4: Audit Trail
  /**
   * Add audit record to immutable trail
   * @param record - Audit record to add
   * @returns Promise resolving to record ID
   */
  addAuditRecord(record: Omit<NILAuditRecord, 'recordId' | 'timestamp' | 'contentHash' | 'signature'>): Promise<string>;
  
  /**
   * Get audit trail for an entity
   * @param subjectId - Entity to get audit trail for
   * @param recordType - Optional filter by record type
   * @returns Promise resolving to array of audit records
   */
  getAuditTrail(subjectId: string, recordType?: NILAuditRecord['recordType']): Promise<NILAuditRecord[]>;
}

/**
 * Optional Extensions for Enhanced Functionality
 * Platforms can implement these for additional features, but they're not required
 */
export interface ExtendedNILProtocol extends MinimalNILCoreProtocol {
  
  // Multi-currency support
  convertCurrency?(from: string, to: string, amount: number): Promise<number>;
  getSupportedCurrencies?(): Promise<string[]>;
  
  // Reputation system
  updateReputation?(globalId: string, score: number, reason: string): Promise<void>;
  getReputationHistory?(globalId: string): Promise<Array<{score: number; timestamp: string; reason: string}>>;
  
  // Tokenization support
  tokenizeDeal?(dealId: string): Promise<{tokenAddress: string; tokenId: string}>;
  fractionalizeFunding?(fundingAmount: number, shares: number): Promise<string>;
  
  // Cross-border facilitation
  facilitateCrossBorderDeal?(dealId: string, fromJurisdiction: string, toJurisdiction: string): Promise<boolean>;
  
  // Advanced analytics
  getAnalytics?(subjectId: string, metrics: string[]): Promise<{[metric: string]: any}>;
}

/**
 * Protocol Configuration
 * Standard configuration that all implementations should support
 */
export interface NILProtocolConfig {
  // Protocol version
  version: string;
  
  // Supported jurisdictions with their configurations
  jurisdictions: {
    [jurisdictionCode: string]: {
      name: string;
      complianceRequirements: string[];
      maxDealValue: number;
      supportedCurrencies: string[];
      dataProtectionRegime: 'gdpr' | 'ccpa' | 'lgpd' | 'pipeda' | 'none';
    };
  };
  
  // Global limits and thresholds
  globalLimits: {
    maxDealValueUSD: number;
    maxDailyVolumeUSD: number;
    reputationScoreRange: [number, number];
    auditRetentionYears: number;
  };
  
  // Compliance providers and their capabilities
  complianceProviders: {
    [providerName: string]: {
      supportedJurisdictions: string[];
      serviceTypes: ('kyc' | 'aml' | 'sanctions' | 'tax_reporting')[];
      apiEndpoint: string;
    };
  };
  
  // Default currency conversion rates (updated by oracles)
  exchangeRates: {
    [currencyPair: string]: {
      rate: number;
      lastUpdated: string;
      source: string;
    };
  };
}

/**
 * Standard Error Types
 * Standardized error responses across all implementations
 */
export enum NILProtocolError {
  INVALID_IDENTITY = 'INVALID_IDENTITY',
  INSUFFICIENT_REPUTATION = 'INSUFFICIENT_REPUTATION',
  COMPLIANCE_FAILED = 'COMPLIANCE_FAILED',
  JURISDICTION_NOT_SUPPORTED = 'JURISDICTION_NOT_SUPPORTED',
  DEAL_LIMIT_EXCEEDED = 'DEAL_LIMIT_EXCEEDED',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  AUDIT_VERIFICATION_FAILED = 'AUDIT_VERIFICATION_FAILED',
  CROSS_BORDER_RESTRICTED = 'CROSS_BORDER_RESTRICTED'
}

export class NILProtocolException extends Error {
  constructor(
    public readonly code: NILProtocolError,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'NILProtocolException';
  }
}

/**
 * Universal Event Types
 * Standard events that all platforms should emit
 */
export interface NILProtocolEvents {
  'identity:registered': {
    globalId: string;
    verificationTier: NILIdentity['verificationTier'];
    jurisdiction: string;
  };
  
  'deal:created': {
    dealId: string;
    athleteId: string;
    valueUSD: number;
    jurisdiction: string;
  };
  
  'deal:status_changed': {
    dealId: string;
    previousStatus: NILDeal['status'];
    newStatus: NILDeal['status'];
    reason?: string;
  };
  
  'compliance:checked': {
    checkId: string;
    dealId: string;
    status: NILCompliance['status'];
    jurisdictions: string[];
  };
  
  'audit:record_added': {
    recordId: string;
    subjectId: string;
    recordType: NILAuditRecord['recordType'];
  };
}

/**
 * Example Implementation Validator
 * Utility to validate that an implementation follows the core protocol
 */
export class NILProtocolValidator {
  static async validateImplementation(implementation: MinimalNILCoreProtocol): Promise<boolean> {
    try {
      // Check all required methods exist
      const requiredMethods = [
        'registerIdentity', 
        'getIdentity', 
        'createDeal', 
        'updateDealStatus',
        'checkCompliance', 
        'addAuditRecord', 
        'getAuditTrail'
      ];
      
      for (const method of requiredMethods) {
        if (typeof (implementation as any)[method] !== 'function') {
          throw new Error(`Missing required method: ${method}`);
        }
      }
      
      // Validate protocol version compatibility
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(implementation.version)) {
        throw new Error('Invalid version format');
      }
      
      return true;
    } catch (error) {
      console.error('Protocol validation failed:', error);
      return false;
    }
  }
}

/**
 * Constants for the Global NIL Protocol
 */
export const NIL_PROTOCOL_CONSTANTS = {
  VERSION: '1.0.0',
  PROTOCOL_ID: 'global-nil-v1',
  
  // Standardized currency codes
  SUPPORTED_FIAT_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BRL', 'MXN'],
  SUPPORTED_STABLECOINS: ['USDC', 'USDT', 'DAI', 'EURS'],
  SUPPORTED_CRYPTO: ['ETH', 'MATIC', 'BTC'],
  
  // Reputation score ranges
  REPUTATION_RANGE: {
    MIN: 0,
    MAX: 1000,
    UNVERIFIED_CAP: 300,
    BASIC_CAP: 500,
    ENHANCED_CAP: 800,
    INSTITUTIONAL_CAP: 1000
  },
  
  // Standard compliance check timeouts
  COMPLIANCE_TIMEOUTS: {
    AUTOMATED_CHECK_SECONDS: 300,   // 5 minutes
    MANUAL_REVIEW_HOURS: 72,        // 3 days
    CROSS_BORDER_HOURS: 168,        // 1 week
  },
  
  // Standard deal value limits by verification tier
  DEAL_LIMITS_USD: {
    unverified: 1000,
    basic: 25000,
    enhanced: 250000,
    institutional: 2500000
  }
} as const;

export default MinimalNILCoreProtocol;