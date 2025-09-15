# 🚀 GitHub Codespaces Setup

This repository is fully configured for GitHub Codespaces development.

## Quick Start

1. **Open in Codespaces**: Click the green "Code" button → "Codespaces" → "Create codespace on main"
2. **Wait for setup**: The development environment will install automatically (2-3 minutes)
3. **Start coding**: Run `npm test` to verify everything works

## What's Included

### 🛠️ Development Tools
- **Node.js 20.x** with npm
- **TypeScript** compiler and language server
- **Hardhat** for smart contract development
- **Jest** for testing
- **ESLint** for code quality
- **Git** and **GitHub CLI**

### 🧩 VS Code Extensions
- TypeScript support
- Solidity syntax highlighting
- ESLint integration
- Prettier formatting
- Auto-rename tags
- JSON support

### 🌐 Port Forwarding
- **3000**: Frontend development server
- **8545**: Hardhat local blockchain node
- **8080**: API server

### 🎯 Helpful Aliases
Access from the terminal:
- `build` → `npm run build`
- `test` → `npm test`
- `contracts` → `npm run build:contracts`
- `hardhat` → `npx hardhat`
- `deploy` → `npm run deploy`
- `lint` → `npm run lint`

## Development Workflow

1. **Start Development**
   ```bash
   # Verify setup
   npm test
   
   # Start local blockchain (optional)
   npm run start:node
   
   # In another terminal, deploy contracts
   npm run deploy:local
   ```

2. **Make Changes**
   - Edit TypeScript or Solidity files
   - Tests run automatically in VS Code
   - Linting highlights issues inline

3. **Test & Commit**
   ```bash
   npm test
   npm run lint
   git add .
   git commit -m "feat: your change"
   ```

## Troubleshooting

**Port forwarding not working?**
- Check the "Ports" tab in VS Code
- Ensure the service is running on the expected port

**Extensions not loading?**
- Restart the Codespace
- Check VS Code extension tab

**Node modules issues?**
- Run: `rm -rf node_modules && npm install`

---

**Happy coding in the cloud! ☁️**