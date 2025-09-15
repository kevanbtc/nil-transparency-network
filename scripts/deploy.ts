import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying NIL Transparency Network contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("🔑 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy ComplianceRegistry
  console.log("\n📋 Deploying ComplianceRegistry...");
  const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
  const complianceRegistry = await ComplianceRegistry.deploy();
  await complianceRegistry.waitForDeployment();
  const complianceRegistryAddress = await complianceRegistry.getAddress();
  console.log("✅ ComplianceRegistry deployed to:", complianceRegistryAddress);

  // Deploy NILVault
  console.log("\n🏦 Deploying NILVault...");
  const NILVault = await ethers.getContractFactory("NILVault");
  const nilVault = await NILVault.deploy();
  await nilVault.waitForDeployment();
  const nilVaultAddress = await nilVault.getAddress();
  console.log("✅ NILVault deployed to:", nilVaultAddress);

  // Deploy ContractNFT
  console.log("\n📄 Deploying ContractNFT...");
  const ContractNFT = await ethers.getContractFactory("ContractNFT");
  const contractNFT = await ContractNFT.deploy();
  await contractNFT.waitForDeployment();
  const contractNFTAddress = await contractNFT.getAddress();
  console.log("✅ ContractNFT deployed to:", contractNFTAddress);

  // Save deployment information
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      ComplianceRegistry: complianceRegistryAddress,
      NILVault: nilVaultAddress,
      ContractNFT: contractNFTAddress
    },
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const networkName = (await ethers.provider.getNetwork()).name || "unknown";
  const deploymentFile = path.join(deploymentsDir, `${networkName}-deployment.json`);
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentFile);

  // Update .env.example with deployed addresses
  console.log("\n🔧 Updating environment configuration...");
  const envExamplePath = path.join(__dirname, "../.env.example");
  let envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  envContent = envContent.replace(
    /NIL_VAULT_ADDRESS=.*/,
    `NIL_VAULT_ADDRESS=${nilVaultAddress}`
  );
  envContent = envContent.replace(
    /CONTRACT_NFT_ADDRESS=.*/,
    `CONTRACT_NFT_ADDRESS=${contractNFTAddress}`
  );
  envContent = envContent.replace(
    /COMPLIANCE_REGISTRY_ADDRESS=.*/,
    `COMPLIANCE_REGISTRY_ADDRESS=${complianceRegistryAddress}`
  );
  
  fs.writeFileSync(envExamplePath, envContent);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`   ComplianceRegistry: ${complianceRegistryAddress}`);
  console.log(`   NILVault:          ${nilVaultAddress}`);
  console.log(`   ContractNFT:       ${contractNFTAddress}`);
  console.log(`   Network:           ${networkName}`);
  console.log(`   Block Number:      ${deploymentInfo.blockNumber}`);
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Update your .env file with the deployed contract addresses");
  console.log("   2. Run verification: npx hardhat verify --network <network> <address>");
  console.log("   3. Test the deployment with: npm run test:contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });