/**
 * Opendorse Platform Adapter
 * Integrates Opendorse NIL deals into the transparency network
 */

import { SiloCloudNIL, NILDeal } from '../silo-integration/SiloCloudNIL';
import { ethers } from 'ethers';
import axios from 'axios';

export interface OpendorseDeal {
  id: string;
  athlete_id: string;
  brand_id: string;
  brand_name: string;
  amount: number;
  currency: string;
  deliverables: {
    type: 'social_post' | 'appearance' | 'content_creation' | 'endorsement';
    platform: 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'in_person';
    quantity: number;
    description: string;
    deadline: Date;
  }[];
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  compliance_notes?: string;
}

export interface OpendorseWebhookPayload {
  event: 'deal.created' | 'deal.updated' | 'deal.completed' | 'deal.cancelled';
  data: OpendorseDeal;
  timestamp: Date;
  signature: string;
}

export class OpendorseAdapter {
  private siloCloud: SiloCloudNIL;
  private opendorseApiKey: string;
  private opendorseBaseUrl: string;
  private webhookSecret: string;
  private nilVaultContract: ethers.Contract;

  constructor(config: {
    siloCloud: SiloCloudNIL;
    opendorseApiKey: string;
    opendorseBaseUrl: string;
    webhookSecret: string;
    nilVaultContract: ethers.Contract;
  }) {
    this.siloCloud = config.siloCloud;
    this.opendorseApiKey = config.opendorseApiKey;
    this.opendorseBaseUrl = config.opendorseBaseUrl;
    this.webhookSecret = config.webhookSecret;
    this.nilVaultContract = config.nilVaultContract;
  }

  /**
   * Handle incoming webhook from Opendorse
   */
  async handleWebhook(payload: OpendorseWebhookPayload): Promise<void> {
    try {
      // Verify webhook signature
      if (!this._verifyWebhookSignature(payload)) {
        throw new Error('Invalid webhook signature');
      }

      console.log(`Processing Opendorse webhook: ${payload.event}`);

      switch (payload.event) {
        case 'deal.created':
          await this.handleDealCreated(payload.data);
          break;
        case 'deal.updated':
          await this.handleDealUpdated(payload.data);
          break;
        case 'deal.completed':
          await this.handleDealCompleted(payload.data);
          break;
        case 'deal.cancelled':
          await this.handleDealCancelled(payload.data);
          break;
        default:
          console.warn(`Unknown webhook event: ${payload.event}`);
      }
    } catch (error) {
      console.error('Failed to process Opendorse webhook:', error);
      throw error;
    }
  }

  /**
   * Handle new deal creation from Opendorse
   */
  async handleDealCreated(opendorseDeal: OpendorseDeal): Promise<void> {
    try {
      console.log(`Creating NIL deal for Opendorse deal: ${opendorseDeal.id}`);

      // Get athlete's NIL vault address
      const athleteVault = await this.siloCloud.getAthleteVault(opendorseDeal.athlete_id);
      
      // Convert Opendorse deal to NIL format
      const nilDeal = await this._convertOpendorseDealToNIL(opendorseDeal);
      
      // Create ContractNFT for the deal
      const contractNftId = await this._mintDealContract({
        athlete_vault: athleteVault.address,
        brand_address: await this._getBrandAddress(opendorseDeal.brand_id),
        amount: opendorseDeal.amount,
        deliverables: this._formatDeliverables(opendorseDeal.deliverables),
        terms_ipfs: await this._uploadTermsToIPFS(opendorseDeal),
        platform_source: 'opendorse',
        opendorse_deal_id: opendorseDeal.id
      });

      // Create NIL deal in the vault
      const dealId = await this.siloCloud.createNILDeal({
        athlete_id: opendorseDeal.athlete_id,
        brand_address: await this._getBrandAddress(opendorseDeal.brand_id),
        amount: opendorseDeal.amount,
        deliverables: this._formatDeliverables(opendorseDeal.deliverables),
        revenue_splits: await this._calculateRevenueSplits(opendorseDeal.athlete_id),
        terms_ipfs: await this._uploadTermsToIPFS(opendorseDeal)
      });

      // Store mapping between Opendorse deal and NIL deal
      await this._storeDealMapping(opendorseDeal.id, dealId, contractNftId);

      // Notify SiloCloud of new deal
      await this._notifySiloCloud('deal_created', {
        opendorse_deal_id: opendorseDeal.id,
        nil_deal_id: dealId,
        contract_nft_id: contractNftId,
        athlete_id: opendorseDeal.athlete_id,
        brand_name: opendorseDeal.brand_name,
        amount: opendorseDeal.amount
      });

      console.log(`Successfully created NIL deal ${dealId} for Opendorse deal ${opendorseDeal.id}`);
    } catch (error) {
      console.error(`Failed to handle deal creation for ${opendorseDeal.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle deal updates from Opendorse
   */
  async handleDealUpdated(opendorseDeal: OpendorseDeal): Promise<void> {
    try {
      console.log(`Updating NIL deal for Opendorse deal: ${opendorseDeal.id}`);

      const mapping = await this._getDealMapping(opendorseDeal.id);
      if (!mapping) {
        console.warn(`No NIL deal found for Opendorse deal ${opendorseDeal.id}`);
        return;
      }

      // Update deal status in SiloCloud
      await this._updateDealStatus(mapping.nil_deal_id, {
        status: opendorseDeal.status,
        updated_at: opendorseDeal.updated_at,
        compliance_notes: opendorseDeal.compliance_notes
      });

      // If deal is approved, trigger compliance approval
      if (opendorseDeal.status === 'approved') {
        await this._approveCompliance(mapping.nil_deal_id, {
          approved: true,
          reason: 'Approved by Opendorse platform',
          approver: 'opendorse_system'
        });
      }

      console.log(`Successfully updated NIL deal ${mapping.nil_deal_id}`);
    } catch (error) {
      console.error(`Failed to handle deal update for ${opendorseDeal.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle deal completion from Opendorse
   */
  async handleDealCompleted(opendorseDeal: OpendorseDeal): Promise<void> {
    try {
      console.log(`Completing NIL deal for Opendorse deal: ${opendorseDeal.id}`);

      const mapping = await this._getDealMapping(opendorseDeal.id);
      if (!mapping) {
        console.warn(`No NIL deal found for Opendorse deal ${opendorseDeal.id}`);
        return;
      }

      // Execute the NIL deal (trigger payments)
      await this._executeDeal(mapping.nil_deal_id);

      // Update ContractNFT status
      await this._updateContractNFT(mapping.contract_nft_id, {
        executed: true,
        completion_date: new Date(),
        final_deliverables: await this._getDeliverableProofs(opendorseDeal.id)
      });

      // Track completion metrics for analytics
      await this._trackCompletionMetrics(opendorseDeal, mapping.nil_deal_id);

      console.log(`Successfully completed NIL deal ${mapping.nil_deal_id}`);
    } catch (error) {
      console.error(`Failed to handle deal completion for ${opendorseDeal.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle deal cancellation from Opendorse
   */
  async handleDealCancelled(opendorseDeal: OpendorseDeal): Promise<void> {
    try {
      console.log(`Cancelling NIL deal for Opendorse deal: ${opendorseDeal.id}`);

      const mapping = await this._getDealMapping(opendorseDeal.id);
      if (!mapping) {
        console.warn(`No NIL deal found for Opendorse deal ${opendorseDeal.id}`);
        return;
      }

      // Cancel the NIL deal
      await this._cancelDeal(mapping.nil_deal_id, {
        reason: 'Cancelled in Opendorse',
        cancelled_at: new Date()
      });

      console.log(`Successfully cancelled NIL deal ${mapping.nil_deal_id}`);
    } catch (error) {
      console.error(`Failed to handle deal cancellation for ${opendorseDeal.id}:`, error);
      throw error;
    }
  }

  /**
   * Sync existing Opendorse deals for an athlete
   */
  async syncAthleteDeals(athlete_id: string, opendorse_athlete_id: string): Promise<number> {
    try {
      console.log(`Syncing Opendorse deals for athlete ${athlete_id}`);

      const opendorseDeals = await this._fetchOpendorseDeals(opendorse_athlete_id);
      let syncedCount = 0;

      for (const deal of opendorseDeals) {
        const existingMapping = await this._getDealMapping(deal.id);
        if (!existingMapping) {
          await this.handleDealCreated(deal);
          syncedCount++;
        }
      }

      console.log(`Synced ${syncedCount} new deals for athlete ${athlete_id}`);
      return syncedCount;
    } catch (error) {
      console.error(`Failed to sync deals for athlete ${athlete_id}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private _verifyWebhookSignature(payload: OpendorseWebhookPayload): boolean {
    // Verify HMAC signature from Opendorse
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return payload.signature === expectedSignature;
  }

  private async _convertOpendorseDealToNIL(opendorseDeal: OpendorseDeal): Promise<Partial<NILDeal>> {
    return {
      athlete_id: opendorseDeal.athlete_id,
      brand_name: opendorseDeal.brand_name,
      amount: opendorseDeal.amount,
      currency: opendorseDeal.currency,
      deliverables: this._formatDeliverables(opendorseDeal.deliverables),
      platform_source: 'opendorse',
      status: opendorseDeal.status as any,
      created_at: opendorseDeal.created_at,
      compliance_approved: opendorseDeal.status === 'approved'
    };
  }

  private _formatDeliverables(opendorseDeliverables: OpendorseDeal['deliverables']): string[] {
    return opendorseDeliverables.map(d => 
      `${d.quantity}x ${d.type} on ${d.platform}: ${d.description}`
    );
  }

  private async _calculateRevenueSplits(athlete_id: string): Promise<NILDeal['revenue_splits']> {
    // Get athlete's school and collective info to calculate splits
    const athleteInfo = await this.siloCloud.updateAthleteProfile(athlete_id, {});
    
    return {
      athlete: 70, // 70% to athlete
      school: 15,  // 15% to school
      collective: 10, // 10% to collective
      platform: 5  // 5% to platform
    };
  }

  private async _uploadTermsToIPFS(opendorseDeal: OpendorseDeal): Promise<string> {
    // Upload deal terms to IPFS for permanent storage
    const termsData = {
      opendorse_deal_id: opendorseDeal.id,
      brand: opendorseDeal.brand_name,
      amount: opendorseDeal.amount,
      currency: opendorseDeal.currency,
      deliverables: opendorseDeal.deliverables,
      created_at: opendorseDeal.created_at
    };

    // Mock IPFS upload - would use actual IPFS service
    return `ipfs://Qm${Math.random().toString(36).substring(2)}`;
  }

  private async _mintDealContract(contractData: any): Promise<string> {
    // Mock contract NFT minting
    return `contract_nft_${Date.now()}`;
  }

  private async _getBrandAddress(brand_id: string): Promise<string> {
    // Get brand's wallet address from Opendorse or create one
    try {
      const response = await axios.get(`${this.opendorseBaseUrl}/brands/${brand_id}`, {
        headers: { 'Authorization': `Bearer ${this.opendorseApiKey}` }
      });
      return response.data.wallet_address || '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.warn(`Could not get brand address for ${brand_id}, using zero address`);
      return '0x0000000000000000000000000000000000000000';
    }
  }

  private async _storeDealMapping(opendorse_id: string, nil_deal_id: string, contract_nft_id: string): Promise<void> {
    // Store mapping in database
    console.log(`Storing mapping: Opendorse ${opendorse_id} -> NIL ${nil_deal_id} -> NFT ${contract_nft_id}`);
  }

  private async _getDealMapping(opendorse_id: string): Promise<{
    nil_deal_id: string;
    contract_nft_id: string;
  } | null> {
    // Mock implementation - would fetch from database
    return {
      nil_deal_id: `nil_deal_${opendorse_id}`,
      contract_nft_id: `nft_${opendorse_id}`
    };
  }

  private async _notifySiloCloud(event: string, data: any): Promise<void> {
    console.log(`Notifying SiloCloud: ${event}`, data);
    // Send notification to SiloCloud systems
  }

  private async _updateDealStatus(deal_id: string, updates: any): Promise<void> {
    console.log(`Updating deal ${deal_id}:`, updates);
  }

  private async _approveCompliance(deal_id: string, approval: any): Promise<void> {
    console.log(`Approving compliance for deal ${deal_id}:`, approval);
  }

  private async _executeDeal(deal_id: string): Promise<void> {
    console.log(`Executing deal ${deal_id}`);
    // Trigger smart contract execution
  }

  private async _updateContractNFT(nft_id: string, updates: any): Promise<void> {
    console.log(`Updating Contract NFT ${nft_id}:`, updates);
  }

  private async _trackCompletionMetrics(deal: OpendorseDeal, nil_deal_id: string): Promise<void> {
    console.log(`Tracking completion metrics for deal ${nil_deal_id}`);
    // Send analytics data to tracking system
  }

  private async _getDeliverableProofs(opendorse_deal_id: string): Promise<string[]> {
    // Get proof of deliverables from Opendorse
    return [`proof_${opendorse_deal_id}_1`, `proof_${opendorse_deal_id}_2`];
  }

  private async _cancelDeal(deal_id: string, cancellation: any): Promise<void> {
    console.log(`Cancelling deal ${deal_id}:`, cancellation);
  }

  private async _fetchOpendorseDeals(athlete_id: string): Promise<OpendorseDeal[]> {
    try {
      const response = await axios.get(`${this.opendorseBaseUrl}/athletes/${athlete_id}/deals`, {
        headers: { 'Authorization': `Bearer ${this.opendorseApiKey}` }
      });
      return response.data.deals || [];
    } catch (error) {
      console.error('Failed to fetch Opendorse deals:', error);
      return [];
    }
  }
}

export default OpendorseAdapter;