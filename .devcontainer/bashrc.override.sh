#!/bin/bash

# NIL Transparency Network Development Environment
echo "🏗️  Welcome to NIL Transparency Network Development Environment"
echo "📁  Repository: kevanbtc/nil-transparency-network"
echo ""

# Set up aliases for common development tasks
alias build="npm run build"
alias test="npm test"
alias contracts="npm run build:contracts"
alias hardhat="npx hardhat"
alias deploy="npm run deploy"
alias lint="npm run lint"

# Set environment variables
export NODE_ENV=development
export HARDHAT_NETWORK=localhost

# Display helpful information
echo "Available commands:"
echo "  build       - Build TypeScript and contracts"
echo "  test        - Run all tests"
echo "  contracts   - Compile smart contracts"
echo "  hardhat     - Run Hardhat CLI"
echo "  deploy      - Deploy contracts"
echo "  lint        - Run linter"
echo ""
echo "Getting started:"
echo "  1. Run 'npm test' to verify everything works"
echo "  2. Run 'npx hardhat node' to start local blockchain"
echo "  3. Run 'npm run deploy' to deploy contracts"
echo ""
echo "📚 Documentation: ./docs/"
echo "🔧 Configuration: ./hardhat.config.ts"
echo ""