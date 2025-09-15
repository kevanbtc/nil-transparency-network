# NIL Transparency Network - Development Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### Installation

1. **Clone and setup the repository:**
   ```bash
   git clone https://github.com/kevanbtc/nil-transparency-network.git
   cd nil-transparency-network
   npm run dev:setup
   ```

2. **Start the development environment:**
   ```bash
   npm run start:dev
   ```

3. **Deploy contracts to local blockchain:**
   ```bash
   npm run deploy:local
   ```

### Development Services

After running `npm run start:dev`, the following services will be available:

- **API Server:** http://localhost:3000
- **Dashboard:** http://localhost:3001  
- **Grafana:** http://localhost:3002 (admin/admin)
- **Blockchain Node:** http://localhost:8545
- **IPFS Gateway:** http://localhost:8080
- **Prometheus:** http://localhost:9090

### API Documentation

Interactive API documentation is available at:
- **Swagger UI:** http://localhost:3000/api-docs
- **Redoc:** http://localhost:3000/docs

## 🧪 Testing

### Run all tests:
```bash
npm test
```

### Run specific test suites:
```bash
# Smart contract tests
npm run test:contracts

# Backend API tests  
npm run test:backend

# Frontend tests
npm run test:frontend

# Generate coverage reports
npm run test:coverage
```

## 🏗️ Architecture Overview

### Smart Contracts
- **NILVault.sol** - ERC-6551 athlete token-bound accounts
- **ContractNFT.sol** - NFT representation of NIL deals
- **ComplianceRegistry.sol** - KYC/AML compliance automation

### Backend Services
- **REST API** - Express.js with TypeScript
- **Database** - PostgreSQL with migrations
- **Cache** - Redis for performance
- **Blockchain Integration** - Ethers.js for contract interaction

### Frontend
- **Dashboard** - React with TypeScript
- **State Management** - Redux Toolkit  
- **Styling** - Tailwind CSS
- **Real-time Updates** - WebSocket integration

## 🔧 Development Commands

### Project Setup
```bash
npm run dev:setup           # Complete development setup
npm run dev:setup:env      # Copy environment template
npm install                # Install dependencies
```

### Building
```bash
npm run build              # Build all components
npm run build:contracts    # Compile smart contracts
npm run build:backend      # Build API server
npm run build:frontend     # Build dashboard
```

### Testing & Quality
```bash
npm run test               # Run all tests
npm run lint               # Run all linters
npm run lint:fix           # Fix linting issues
npm run format             # Format code with Prettier
```

### Database Management
```bash
npm run migrate:dev        # Run database migrations
npm run seed:dev          # Seed development data
```

### Deployment
```bash
npm run deploy:local       # Deploy to local blockchain
npm run deploy:testnet     # Deploy to testnet
npm run deploy:mainnet     # Deploy to mainnet (production)
```

## 📊 Monitoring & Observability

### Grafana Dashboards
- **System Metrics** - API performance, database stats
- **Business Metrics** - Deal volume, athlete engagement
- **Blockchain Metrics** - Transaction success rates, gas usage

### Logging
- **Structured Logging** - Winston with JSON format
- **Log Levels** - Error, Warn, Info, Debug
- **Log Aggregation** - File rotation and centralized logging

### Alerts
- **Performance Alerts** - API response times
- **Error Alerts** - Failed transactions, compliance issues  
- **Business Alerts** - Deal volume thresholds

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens** - Secure API authentication
- **Role-Based Access** - Athlete, School, Admin, Compliance roles
- **Resource Ownership** - Users can only access their own data

### Smart Contract Security
- **Access Controls** - OpenZeppelin AccessControl
- **Reentrancy Protection** - ReentrancyGuard
- **Pausable Contracts** - Emergency stop functionality
- **Upgrade Patterns** - Transparent proxy upgrades

### API Security
- **Rate Limiting** - Prevent API abuse
- **Input Validation** - Joi schema validation
- **CORS** - Cross-origin request security
- **Helmet.js** - Security headers

## 🌐 Platform Integrations

### Supported Platforms
- **Opendorse** - NIL deal marketplace
- **INFLCR** - Social media content tracking
- **Basepath** - Athlete collective management
- **SiloCloud** - Super-app ecosystem

### Webhook Integration
Each platform integration includes:
- Webhook endpoints for real-time updates
- Signature verification for security
- Retry logic for failed requests
- Event transformation and storage

## 📈 Performance Optimization

### Backend Optimizations
- **Connection Pooling** - Database connection management
- **Caching Strategy** - Redis for frequently accessed data  
- **Batch Operations** - Bulk database operations
- **Async Processing** - Queue-based background jobs

### Frontend Optimizations
- **Code Splitting** - Lazy loading of components
- **State Optimization** - Efficient Redux state management
- **Caching** - API response caching
- **Bundle Optimization** - Tree shaking and compression

### Blockchain Optimizations
- **Gas Optimization** - Assembly code for critical functions
- **Batch Transactions** - Multiple operations in single tx
- **Layer 2 Integration** - Polygon for lower fees
- **Event Indexing** - Efficient event querying

## 🚀 Production Deployment

### Environment Setup
1. Configure production environment variables
2. Set up SSL certificates
3. Configure monitoring and alerting
4. Set up backup procedures

### Deployment Process
1. **Pre-deployment Checks**
   - Run full test suite
   - Security audit
   - Performance testing

2. **Infrastructure Setup**
   - Provision cloud resources
   - Configure load balancing
   - Set up database replicas

3. **Application Deployment**
   - Deploy smart contracts
   - Deploy backend services
   - Deploy frontend application

4. **Post-deployment Verification**
   - Health check validation
   - Integration testing
   - Performance monitoring

## 📞 Support & Contributing

### Getting Help
- **Documentation** - Check this guide and API docs
- **Issues** - Submit GitHub issues for bugs
- **Discussions** - Use GitHub Discussions for questions

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

### Development Guidelines
- Follow TypeScript strict mode
- Write comprehensive tests
- Document API changes
- Follow git commit conventions

---

**Built with ❤️ for the NIL ecosystem**