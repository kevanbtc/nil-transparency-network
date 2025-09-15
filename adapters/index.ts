/**
 * NIL Transparency Network - Platform Adapters
 * Main entry point for all platform integrations
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import OpendorseAdapter from './opendorse/OpendorseAdapter';
import INFLCRAdapter from './inflcr/INFLCRAdapter';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  // Network configuration
  rpc_url: process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com',
  nil_contract_address: process.env.NIL_CONTRACT_ADDRESS || '0x...',
  
  // Opendorse configuration
  opendorse: {
    webhook_secret: process.env.OPENDORSE_WEBHOOK_SECRET || '',
    api_key: process.env.OPENDORSE_API_KEY || '',
    port: parseInt(process.env.OPENDORSE_PORT || '3001')
  },
  
  // INFLCR configuration
  inflcr: {
    webhook_secret: process.env.INFLCR_WEBHOOK_SECRET || '',
    api_key: process.env.INFLCR_API_KEY || '',
    port: parseInt(process.env.INFLCR_PORT || '3002')
  },
  
  // SiloCloud configuration
  silo_api_key: process.env.SILO_API_KEY || ''
};

async function main() {
  console.log('🚀 Starting NIL Transparency Network Adapters...');
  
  // Initialize Ethereum provider
  const provider = new ethers.JsonRpcProvider(config.rpc_url);
  
  try {
    // Test network connection
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.error('❌ Failed to connect to Ethereum network:', error);
    process.exit(1);
  }

  // Initialize adapters
  const adapters = [];

  // Opendorse Adapter
  if (config.opendorse.webhook_secret && config.opendorse.api_key) {
    console.log('🔌 Initializing Opendorse adapter...');
    const opendorseAdapter = new OpendorseAdapter(
      config.opendorse.webhook_secret,
      config.opendorse.api_key,
      'https://api.opendorse.com/v4',
      config.nil_contract_address,
      provider
    );
    
    opendorseAdapter.listen(config.opendorse.port);
    adapters.push('Opendorse');
    console.log(`✅ Opendorse adapter started on port ${config.opendorse.port}`);
  } else {
    console.log('⚠️  Opendorse adapter not configured (missing secrets)');
  }

  // INFLCR Adapter
  if (config.inflcr.webhook_secret && config.inflcr.api_key) {
    console.log('🔌 Initializing INFLCR adapter...');
    const inflcrAdapter = new INFLCRAdapter(
      config.inflcr.webhook_secret,
      config.inflcr.api_key,
      'https://api.inflcr.com/v2',
      config.nil_contract_address,
      provider
    );
    
    inflcrAdapter.listen(config.inflcr.port);
    adapters.push('INFLCR');
    console.log(`✅ INFLCR adapter started on port ${config.inflcr.port}`);
  } else {
    console.log('⚠️  INFLCR adapter not configured (missing secrets)');
  }

  // TODO: Add Basepath and Athliance adapters
  console.log('📋 Future adapters: Basepath, Athliance');

  if (adapters.length === 0) {
    console.log('❌ No adapters configured. Please set environment variables.');
    process.exit(1);
  }

  console.log(`🎉 NIL Transparency Network ready! Active adapters: ${adapters.join(', ')}`);
  console.log('📊 Monitoring for platform events...');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down NIL adapters...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down NIL adapters...');
    process.exit(0);
  });
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Failed to start adapters:', error);
    process.exit(1);
  });
}

export { OpendorseAdapter, INFLCRAdapter, config };