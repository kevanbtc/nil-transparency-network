# NIL Transparency Network - Infrastructure

This directory contains deployment scripts, monitoring configurations, and compliance tools for the NIL Transparency Network infrastructure.

## Directory Structure

```
infra/
├── deploy/                 # Deployment scripts and configurations
│   ├── contracts/         # Smart contract deployment scripts
│   ├── adapters/          # Platform adapter deployments
│   └── dashboards/        # Dashboard deployment configs
├── monitoring/            # System health monitoring
│   ├── grafana/          # Grafana dashboards
│   ├── prometheus/       # Prometheus configs
│   └── alerts/           # Alert configurations
└── compliance/           # ISO 20022 and regulatory tools
    ├── iso20022/         # ISO 20022 message handlers
    ├── reporting/        # Compliance reporting tools
    └── templates/        # Document templates
```

## Quick Start

### Deploy Contracts

```bash
cd infra/deploy
npm install
npm run deploy:all
```

### Start Monitoring

```bash
cd infra/monitoring
docker-compose up -d
```

### Generate Compliance Reports

```bash
cd infra/compliance
npm install
npm run generate-report
```

## Environment Variables

Set the following environment variables for deployment:

```bash
# Network Configuration
RPC_URL=https://ethereum-rpc.publicnode.com
PRIVATE_KEY=your-deployment-private-key
ETHERSCAN_API_KEY=your-etherscan-key

# Contract Addresses (will be populated after deployment)
NIL_VAULT_IMPLEMENTATION=0x...
CONTRACT_NFT=0x...
COMPLIANCE_REGISTRY=0x...
REVENUE_SPLITTER=0x...
DELIVERABLES_ORACLE=0x...

# Platform Integration
OPENDORSE_API_KEY=your-opendorse-key
INFLCR_API_KEY=your-inflcr-key
SILO_API_KEY=your-silo-key

# Monitoring
GRAFANA_ADMIN_PASSWORD=your-grafana-password
SLACK_WEBHOOK_URL=your-slack-webhook
```

## Deployment Order

1. Core contracts (NILVault, ComplianceRegistry, ContractNFT)
2. Finance contracts (RevenueSplitter, Escrow)
3. Oracle contracts (DeliverablesOracleRouter)
4. Adapter contracts (OpendorseAdapter, INFLCRAdapter)
5. Platform adapters (Node.js services)
6. Monitoring stack
7. Compliance tools

## Security Notes

- All deployments use multi-sig contracts for admin operations
- Private keys are managed through secure key management systems
- All contracts undergo security audits before mainnet deployment
- Monitoring includes security alerts and anomaly detection

## Support

For deployment issues, contact the infrastructure team or check the monitoring dashboards for system health.