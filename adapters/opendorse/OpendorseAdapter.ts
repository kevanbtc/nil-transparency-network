/**
 * Opendorse Platform Adapter
 * Integrates Opendorse NIL marketplace with transparency network
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import crypto from 'crypto';
import { ethers } from 'ethers';

// Types for Opendorse integration
export interface OpendorseDeal {
  deal_id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_email: string;
  brand_id: string;
  brand_name: string;
  brand_contact_email: string;
  amount: number;
  currency: string;
  deliverables: OpendorseDeliverable[];
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  due_date?: string;
  completion_date?: string;
  terms_url?: string;
}

export interface OpendorseDeliverable {
  type: 'social_post' | 'appearance' | 'content_creation' | 'endorsement';
  platform?: 'instagram' | 'twitter' | 'tiktok' | 'facebook';
  description: string;
  quantity: number;
  due_date?: string;
  completed: boolean;
  content_urls?: string[];
}

export interface OpendorseAthlete {
  id: string;
  name: string;
  email: string;
  school: string;
  sport: string;
  social_handles: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface OpendorseWebhookEvent {
  event_type: 'deal.created' | 'deal.updated' | 'deal.completed' | 'athlete.verified';
  timestamp: string;
  data: OpendorseDeal | OpendorseAthlete;
  signature: string;
}

export class OpendorseAdapter extends EventEmitter {
  private apiBaseUrl: string;
  private apiKey: string;
  private webhookSecret: string;
  private nilContractAddress: string;
  // private provider: ethers.Provider; // Currently unused
  private signer: ethers.Signer;

  constructor(config: {
    apiBaseUrl: string;
    apiKey: string;
    webhookSecret: string;
    nilContractAddress: string;
    provider: ethers.Provider;
    signer: ethers.Signer;
  }) {
    super();
    this.apiBaseUrl = config.apiBaseUrl;
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.nilContractAddress = config.nilContractAddress;
    this.provider = config.provider;
    this.signer = config.signer;
  }

  /**
   * Set up webhook integration with Opendorse
   */
  async setupWebhookIntegration(webhookUrl: string): Promise<void> {
    try {
      await this._apiCall('POST', '/webhooks', {
        url: webhookUrl,
        events: ['deal.created', 'deal.updated', 'deal.completed', 'athlete.verified'],
        active: true
      });

      console.log('Opendorse webhook integration setup complete');
    } catch (error) {
      console.error('Failed to setup Opendorse webhook:', error);
      throw error;
    }
  }

  /**
   * Handle incoming webhook from Opendorse
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    // Verify webhook signature
    if (!this._verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const event: OpendorseWebhookEvent = JSON.parse(payload);
    
    switch (event.event_type) {
      case 'deal.created':
        await this._handleDealCreated(event.data as OpendorseDeal);
        break;
      case 'deal.updated':
        await this._handleDealUpdated(event.data as OpendorseDeal);
        break;
      case 'deal.completed':
        await this._handleDealCompleted(event.data as OpendorseDeal);
        break;
      case 'athlete.verified':
        await this._handleAthleteVerified(event.data as OpendorseAthlete);
        break;
      default:
        console.warn(`Unknown Opendorse event type: ${event.event_type}`);
    }
  }

  /**
   * Sync existing deals from Opendorse
   */
  async syncExistingDeals(athleteId?: string): Promise<OpendorseDeal[]> {
    try {
      const endpoint = athleteId ? `/deals?athlete_id=${athleteId}` : '/deals';
      const response = await this._apiCall('GET', endpoint);
      
      const deals: OpendorseDeal[] = response.data;
      
      // Process each deal through the transparency network
      for (const deal of deals) {
        await this._handleDealCreated(deal);
      }
      
      return deals;
    } catch (error) {
      console.error('Failed to sync Opendorse deals:', error);
      throw error;
    }
  }

  /**
   * Get athlete data from Opendorse
   */
  async getAthlete(athleteId: string): Promise<OpendorseAthlete> {
    try {
      const response = await this._apiCall('GET', `/athletes/${athleteId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get Opendorse athlete:', error);
      throw error;
    }
  }

  /**
   * Create deal in transparency network
   */
  async createTransparencyDeal(deal: OpendorseDeal): Promise<string> {
    try {
      // Get athlete's NIL vault address
      const athleteVault = await this._getAthleteVault(deal.athlete_id);
      
      // Calculate revenue splits (default: 70% athlete, 15% school, 10% collective, 5% platform)
      const revenueSplits = [7000, 1500, 1000, 500]; // Basis points
      const beneficiaries = [
        athleteVault,
        await this._getSchoolAddress(deal.athlete_id),
        await this._getCollectiveAddress(deal.athlete_id),
        this.nilContractAddress // Platform address
      ];

      // Convert deliverables to string format
      const deliverablesStr = deal.deliverables.map(d => 
        `${d.type}: ${d.description} (${d.quantity})`
      ).join(', ');

      // Create deal in NIL smart contract
      const nilContract = new ethers.Contract(this.nilContractAddress, NIL_VAULT_ABI, this.signer);
      
      const tx = await nilContract.createNILDeal(
        deal.brand_id, // Using brand_id as brand address (would need mapping)
        ethers.parseEther(deal.amount.toString()),
        deliverablesStr,
        '', // IPFS terms hash (could upload deal terms to IPFS)
        revenueSplits,
        beneficiaries
      );

      const receipt = await tx.wait();
      const dealCreatedEvent = receipt.events?.find(e => e.event === 'NILDealCreated');
      const transparencyDealId = dealCreatedEvent?.args?.dealId;

      // Store mapping between Opendorse deal ID and transparency deal ID
      await this._storeDealMapping(deal.deal_id, transparencyDealId);

      this.emit('dealCreated', {
        opendorseDealId: deal.deal_id,
        transparencyDealId,
        athleteId: deal.athlete_id,
        amount: deal.amount
      });

      return transparencyDealId;
    } catch (error) {
      console.error('Failed to create transparency deal:', error);
      throw error;
    }
  }

  // Private methods
  private async _handleDealCreated(deal: OpendorseDeal): Promise<void> {
    console.log(`Processing new Opendorse deal: ${deal.deal_id}`);
    
    try {
      const transparencyDealId = await this.createTransparencyDeal(deal);
      
      // Notify compliance registry
      await this._notifyComplianceRegistry(transparencyDealId, deal);
      
      this.emit('dealProcessed', {
        success: true,
        opendorseDealId: deal.deal_id,
        transparencyDealId
      });
    } catch (error) {
      console.error(`Failed to process Opendorse deal ${deal.deal_id}:`, error);
      
      this.emit('dealProcessed', {
        success: false,
        opendorseDealId: deal.deal_id,
        error: error.message
      });
    }
  }

  private async _handleDealUpdated(deal: OpendorseDeal): Promise<void> {
    console.log(`Opendorse deal updated: ${deal.deal_id}`);
    
    // Update deal status in transparency network
    const transparencyDealId = await this._getTransparencyDealId(deal.deal_id);
    if (transparencyDealId) {
      // Update deal metadata (implementation depends on smart contract capabilities)
      this.emit('dealUpdated', {
        opendorseDealId: deal.deal_id,
        transparencyDealId,
        newStatus: deal.status
      });
    }
  }

  private async _handleDealCompleted(deal: OpendorseDeal): Promise<void> {
    console.log(`Opendorse deal completed: ${deal.deal_id}`);
    
    try {
      const transparencyDealId = await this._getTransparencyDealId(deal.deal_id);
      if (transparencyDealId) {
        // Execute the deal in the smart contract to trigger fund distribution
        const nilContract = new ethers.Contract(this.nilContractAddress, NIL_VAULT_ABI, this.signer);
        const tx = await nilContract.executeNILDeal(transparencyDealId);
        await tx.wait();
        
        this.emit('dealExecuted', {
          opendorseDealId: deal.deal_id,
          transparencyDealId,
          amount: deal.amount
        });
      }
    } catch (error) {
      console.error(`Failed to execute deal ${deal.deal_id}:`, error);
    }
  }

  private async _handleAthleteVerified(athlete: OpendorseAthlete): Promise<void> {
    console.log(`Athlete verified on Opendorse: ${athlete.id}`);
    
    // Update athlete verification status in transparency network
    this.emit('athleteVerified', {
      athleteId: athlete.id,
      name: athlete.name,
      school: athlete.school,
      sport: athlete.sport
    });
  }

  private _verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }

  private async _apiCall(method: string, endpoint: string, data?: any): Promise<any> {
    try {
      const response = await axios({
        method,
        url: `${this.apiBaseUrl}${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Opendorse API call failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  private async _getAthleteVault(_athleteId: string): Promise<string> {
    // Implementation would lookup athlete's vault address from database
    // For now, return a placeholder
    return `0x${'0'.repeat(40)}`; // Placeholder vault address
  }

  private async _getSchoolAddress(_athleteId: string): Promise<string> {
    // Implementation would lookup school's wallet address
    return `0x${'1'.repeat(40)}`; // Placeholder school address
  }

  private async _getCollectiveAddress(_athleteId: string): Promise<string> {
    // Implementation would lookup collective's wallet address
    return `0x${'2'.repeat(40)}`; // Placeholder collective address
  }

  private async _storeDealMapping(opendorseDealId: string, transparencyDealId: string): Promise<void> {
    // Store mapping in database for future reference
    console.log(`Mapping stored: ${opendorseDealId} -> ${transparencyDealId}`);
  }

  private async _getTransparencyDealId(_opendorseDealId: string): Promise<string | null> {
    // Retrieve transparency deal ID from stored mapping
    return null; // Placeholder implementation
  }

  private async _notifyComplianceRegistry(transparencyDealId: string, deal: OpendorseDeal): Promise<void> {
    // Notify compliance registry of new deal for automated checks
    this.emit('complianceCheckRequired', {
      dealId: transparencyDealId,
      platform: 'opendorse',
      amount: deal.amount,
      athleteId: deal.athlete_id
    });
  }
}

// Contract ABI for NIL Vault interactions
const NIL_VAULT_ABI = [
  "function createNILDeal(address brand, uint256 amount, string deliverables, string termsIPFS, uint256[] splits, address[] beneficiaries) returns (bytes32)",
  "function executeNILDeal(bytes32 dealId)",
  "function getDeal(bytes32 dealId) view returns (tuple)",
  "event NILDealCreated(bytes32 indexed dealId, address indexed athlete, address indexed brand, uint256 amount, string deliverables)",
  "event NILDealExecuted(bytes32 indexed dealId, uint256 amount, address[] beneficiaries, uint256[] splits)"
];

export default OpendorseAdapter;