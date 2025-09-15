/**
 * Opendorse Platform Integration
 * Webhook handler and API integration for Opendorse NIL deals
 */

import express from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import axios from 'axios';

// Types
interface OpendorseDeal {
  id: string;
  athlete: {
    id: string;
    name: string;
    school: string;
    social_handles: {
      instagram?: string;
      twitter?: string;
      tiktok?: string;
    };
  };
  brand: {
    id: string;
    name: string;
    contact_email: string;
  };
  campaign: {
    title: string;
    description: string;
    amount: number;
    currency: string;
    deliverables: string[];
    requirements: string[];
  };
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  compliance: {
    school_approved: boolean;
    ncaa_compliant: boolean;
    state_compliant: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface OpendorseMetrics {
  deal_id: string;
  post_id: string;
  platform: 'instagram' | 'twitter' | 'tiktok' | 'facebook';
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    saves?: number;
    reach: number;
    impressions: number;
    cpm: number;
    engagement_rate: number;
  };
  collected_at: string;
}

export class OpendorseAdapter {
  private app: express.Application;
  private webhookSecret: string;
  private apiKey: string;
  private baseUrl: string;
  private nilContract: ethers.Contract;

  constructor(
    webhookSecret: string,
    apiKey: string,
    baseUrl: string = 'https://api.opendorse.com/v4',
    nilContractAddress: string,
    provider: ethers.Provider
  ) {
    this.app = express();
    this.webhookSecret = webhookSecret;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Initialize NIL contract connection
    const nilAbi = []; // Contract ABI would be imported
    this.nilContract = new ethers.Contract(nilContractAddress, nilAbi, provider);
    
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.json());
    
    // Webhook endpoints
    this.app.post('/webhook/deal-created', this.handleDealCreated.bind(this));
    this.app.post('/webhook/deal-approved', this.handleDealApproved.bind(this));
    this.app.post('/webhook/deal-completed', this.handleDealCompleted.bind(this));
    this.app.post('/webhook/metrics-updated', this.handleMetricsUpdated.bind(this));
    this.app.post('/webhook/compliance-updated', this.handleComplianceUpdated.bind(this));
    
    // API endpoints
    this.app.get('/deals/:athleteId', this.getAthleteDeals.bind(this));
    this.app.get('/metrics/:dealId', this.getDealMetrics.bind(this));
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return `sha256=${expectedSignature}` === signature;
  }

  private async handleDealCreated(req: express.Request, res: express.Response) {
    try {
      const signature = req.headers['x-opendorse-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const deal: OpendorseDeal = req.body;
      console.log('New Opendorse deal created:', deal.id);

      // Create NIL contract NFT
      await this.createNILContract(deal);
      
      // Notify SiloCloud
      await this.notifySiloCloud('deal_created', deal);
      
      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Error processing deal creation:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }

  private async handleDealApproved(req: express.Request, res: express.Response) {
    try {
      const signature = req.headers['x-opendorse-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const deal: OpendorseDeal = req.body;
      console.log('Opendorse deal approved:', deal.id);

      // Update compliance registry
      await this.updateComplianceStatus(deal.id, true, 'Opendorse school approval received');
      
      // Notify SiloCloud
      await this.notifySiloCloud('deal_approved', deal);
      
      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Error processing deal approval:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }

  private async handleDealCompleted(req: express.Request, res: express.Response) {
    try {
      const signature = req.headers['x-opendorse-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const deal: OpendorseDeal = req.body;
      console.log('Opendorse deal completed:', deal.id);

      // Mark deliverables as completed
      await this.markDeliverablesCompleted(deal.id);
      
      // Trigger payment execution
      await this.executePayment(deal);
      
      // Notify SiloCloud
      await this.notifySiloCloud('deal_completed', deal);
      
      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Error processing deal completion:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }

  private async handleMetricsUpdated(req: express.Request, res: express.Response) {
    try {
      const signature = req.headers['x-opendorse-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const metrics: OpendorseMetrics = req.body;
      console.log('Opendorse metrics updated for deal:', metrics.deal_id);

      // Update on-chain metrics
      await this.updateOnChainMetrics(metrics);
      
      // Notify SiloCloud analytics
      await this.notifySiloCloud('metrics_updated', metrics);
      
      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Error processing metrics update:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }

  private async handleComplianceUpdated(req: express.Request, res: express.Response) {
    try {
      const signature = req.headers['x-opendorse-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const deal: OpendorseDeal = req.body;
      console.log('Opendorse compliance updated for deal:', deal.id);

      // Update compliance status
      const isCompliant = deal.compliance.school_approved && 
                         deal.compliance.ncaa_compliant && 
                         deal.compliance.state_compliant;
      
      await this.updateComplianceStatus(deal.id, isCompliant, 'Compliance status updated from Opendorse');
      
      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Error processing compliance update:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }

  private async getAthleteDeals(req: express.Request, res: express.Response) {
    try {
      const athleteId = req.params.athleteId;
      
      // Fetch deals from Opendorse API
      const response = await axios.get(`${this.baseUrl}/athletes/${athleteId}/deals`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching athlete deals:', error);
      res.status(500).json({ error: 'Failed to fetch deals' });
    }
  }

  private async getDealMetrics(req: express.Request, res: express.Response) {
    try {
      const dealId = req.params.dealId;
      
      // Fetch metrics from Opendorse API
      const response = await axios.get(`${this.baseUrl}/deals/${dealId}/metrics`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching deal metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  // Integration helper methods
  private async createNILContract(deal: OpendorseDeal): Promise<void> {
    try {
      // This would call the OpendorseAdapter smart contract
      // const tx = await this.nilContract.importOpendorseDeal(...);
      // await tx.wait();
      
      console.log(`NIL contract created for Opendorse deal: ${deal.id}`);
    } catch (error) {
      console.error('Error creating NIL contract:', error);
      throw error;
    }
  }

  private async updateComplianceStatus(dealId: string, approved: boolean, reason: string): Promise<void> {
    try {
      // This would call the ComplianceRegistry contract
      // const tx = await this.complianceContract.updateComplianceStatus(dealId, approved, reason);
      // await tx.wait();
      
      console.log(`Compliance status updated for deal ${dealId}: ${approved}`);
    } catch (error) {
      console.error('Error updating compliance status:', error);
      throw error;
    }
  }

  private async markDeliverablesCompleted(dealId: string): Promise<void> {
    try {
      // This would call the DeliverablesOracleRouter contract
      // const tx = await this.oracleContract.markDeliverableCompleted(dealId, evidence);
      // await tx.wait();
      
      console.log(`Deliverables marked as completed for deal: ${dealId}`);
    } catch (error) {
      console.error('Error marking deliverables completed:', error);
      throw error;
    }
  }

  private async executePayment(deal: OpendorseDeal): Promise<void> {
    try {
      // This would trigger the RevenueSplitter contract
      // const tx = await this.splitterContract.splitPayment(dealId);
      // await tx.wait();
      
      console.log(`Payment executed for deal: ${deal.id}`);
    } catch (error) {
      console.error('Error executing payment:', error);
      throw error;
    }
  }

  private async updateOnChainMetrics(metrics: OpendorseMetrics): Promise<void> {
    try {
      // This would call the OpendorseAdapter contract to update metrics
      // const tx = await this.adapterContract.updateOpendorseMetrics(...);
      // await tx.wait();
      
      console.log(`On-chain metrics updated for deal: ${metrics.deal_id}`);
    } catch (error) {
      console.error('Error updating on-chain metrics:', error);
      throw error;
    }
  }

  private async notifySiloCloud(eventType: string, data: any): Promise<void> {
    try {
      // Notify SiloCloud API of the event
      await axios.post('https://api.silocloud.com/nil/events', {
        event_type: eventType,
        platform: 'opendorse',
        data: data,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.SILO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`SiloCloud notified of ${eventType} event`);
    } catch (error) {
      console.error('Error notifying SiloCloud:', error);
      // Don't throw - this is not critical
    }
  }

  public listen(port: number = 3001) {
    this.app.listen(port, () => {
      console.log(`Opendorse adapter listening on port ${port}`);
    });
  }
}

// Export for use as module
export default OpendorseAdapter;