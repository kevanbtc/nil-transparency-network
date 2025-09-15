# 🏗️ Development Setup Guide

This guide will help you set up your development environment for the NIL Transparency Network project.

## 🚀 Quick Start with GitHub Codespaces (Recommended)

The easiest way to get started is using GitHub Codespaces, which provides a pre-configured development environment:

1. **Open in Codespaces**: Click the "Code" button in GitHub and select "Create codespace on main"
2. **Wait for Setup**: The development container will automatically install all dependencies
3. **Start Developing**: Everything is ready to go! Run `npm test` to verify the setup

### Codespaces Features
- Pre-installed Node.js 20.x, Docker, and development tools
- VS Code extensions for TypeScript, Solidity, and testing
- Automatic port forwarding for local development servers
- Shared terminal with helpful aliases and environment setup

## 🖥️ Local Development Setup

If you prefer to develop locally, follow these steps:

### Prerequisites
- **Node.js**: Version 18.x or 20.x ([Download](https://nodejs.org/))
- **Git**: Latest version ([Download](https://git-scm.com/))
- **Optional**: Docker for contract deployment testing

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/kevanbtc/nil-transparency-network.git
   cd nil-transparency-network
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify Setup**
   ```bash
   npm run build
   npm test
   ```

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript files to `dist/` |
| `npm run build:contracts` | Compile Solidity smart contracts |
| `npm test` | Run all tests (contracts + integration) |
| `npm run test:contracts` | Run smart contract tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run lint` | Run ESLint on all files |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run dev` | Start development mode |
| `npm run clean` | Clean build artifacts |

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:contracts    # Smart contract tests
npm run test:integration  # Integration tests

# Run tests with coverage
npm run test:contracts -- --coverage
```

### Test Structure
- **`test/`**: Smart contract tests using Hardhat and Chai
- **`apps/*/test.ts`**: Integration tests using Jest
- **Test Configuration**: `jest.config.js` and `hardhat.config.ts`

## 🏗️ Development Workflow

### 1. Making Changes
- Create a feature branch: `git checkout -b feature/your-feature`
- Make your changes to the codebase
- Run tests frequently: `npm test`
- Check linting: `npm run lint`

### 2. Before Committing
```bash
# Ensure everything builds
npm run build
npm run build:contracts

# Run full test suite
npm test

# Check for linting issues
npm run lint

# Type check
npm run typecheck
```

### 3. Commit and Push
```bash
git add .
git commit -m "feat: your descriptive commit message"
git push origin feature/your-feature
```

## 🔧 Configuration Files

### TypeScript Configuration (`tsconfig.json`)
- Configured for Node.js development
- Outputs to `dist/` directory
- Includes strict type checking

### ESLint Configuration (`.eslintrc.json`)
- Basic rules for code quality
- TypeScript support
- Ignores build artifacts

### Jest Configuration (`jest.config.js`)
- TypeScript support with `ts-jest`
- Coverage reporting
- Test timeout: 30 seconds

### Hardhat Configuration (`hardhat.config.ts`)
- Solidity compiler version: 0.8.19
- Local network on port 8545
- Gas reporting and coverage

## 📁 Project Structure

```
nil-transparency-network/
├── .devcontainer/          # GitHub Codespaces configuration
├── .github/workflows/      # CI/CD pipelines
├── apps/                   # Application code
│   └── silo-integration/   # SiloCloud integration
├── contracts/              # Solidity smart contracts
├── docs/                   # Documentation
├── test/                   # Smart contract tests
├── dist/                   # Built TypeScript files
├── artifacts/              # Compiled contract artifacts
└── typechain-types/        # Generated TypeScript contract types
```

## 🐛 Troubleshooting

### Common Issues

**Dependencies not installing?**
```bash
# Clear npm cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors?**
```bash
# Check TypeScript configuration
npm run typecheck

# Rebuild everything
npm run clean
npm run build
```

**Tests failing?**
```bash
# Run tests individually to isolate issues
npm run test:contracts
npm run test:integration

# Check for linting issues
npm run lint
```

**Contract compilation issues?**
- Ensure internet connection (Hardhat downloads Solidity compiler)
- Check `hardhat.config.ts` for correct Solidity version
- Try running `npx hardhat compile` directly

### Getting Help

1. **Check Documentation**: Look in the `docs/` folder
2. **Review Test Files**: Examples of how to use the code
3. **GitHub Issues**: Create an issue for bugs or feature requests
4. **CI/CD Logs**: Check GitHub Actions for detailed error information

## 🚢 Deployment

### Local Testing
```bash
# Start local Hardhat node
npx hardhat node

# Deploy contracts (in another terminal)
npm run deploy
```

### Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your API keys and configuration
3. Update contract addresses after deployment

---

**Happy coding! 🎉**

For more information, check out:
- [Smart Contract Documentation](./docs/SYSTEM_AUDIT_REPORT.md)
- [Infrastructure Architecture](./docs/INFRASTRUCTURE_ARCHITECTURE.md)
- [System Graphs](./docs/SYSTEM_GRAPHS_VISUALIZATION.md)