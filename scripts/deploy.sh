#!/bin/bash

# NIL Transparency Network Deployment Script
set -e

echo "🚀 Starting NIL Transparency Network deployment..."

# Check if environment file exists
if [ ! -f .env ]; then
    echo "📝 Creating environment file from template..."
    cp infra/contracts.env.example .env
    echo "⚠️  Please edit .env file with your configuration before running deployment"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Compile smart contracts (if Hardhat can access the internet)
echo "🔧 Attempting to compile smart contracts..."
if npx hardhat compile 2>/dev/null; then
    echo "✅ Smart contracts compiled successfully"
else
    echo "⚠️  Smart contract compilation failed - check internet connection and Solidity compiler"
fi

echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with proper values"
echo "2. Deploy smart contracts: npx hardhat deploy --network sepolia"
echo "3. Start the API server: npm run dev"
echo "4. Monitor with: npm run lint && npm run type-check"