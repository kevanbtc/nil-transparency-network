import { ethers } from "hardhat";
import { logger } from "../src/utils/logger";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  logger.info(`Deploying contracts with account: ${deployer.address}`);
  logger.info(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())}`);

  // Deploy ComplianceRegistry first
  logger.info("Deploying ComplianceRegistry...");
  const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
  const complianceRegistry = await ComplianceRegistry.deploy();
  await complianceRegistry.deployed();
  logger.info(`ComplianceRegistry deployed to: ${complianceRegistry.address}`);

  // Deploy ContractNFT
  logger.info("Deploying ContractNFT...");
  const ContractNFT = await ethers.getContractFactory("ContractNFT");
  const contractNFT = await ContractNFT.deploy();
  await contractNFT.deployed();
  logger.info(`ContractNFT deployed to: ${contractNFT.address}`);

  // Deploy NILVault Factory (for creating individual vaults)
  logger.info("Deploying NILVault Factory...");
  const NILVault = await ethers.getContractFactory("NILVault");
  const nilVaultImplementation = await NILVault.deploy(
    ethers.constants.AddressZero, // Template - will be cloned for each athlete
    ethers.constants.AddressZero, // NIL protocol address (to be set later)
    complianceRegistry.address
  );
  await nilVaultImplementation.deployed();
  logger.info(`NILVault implementation deployed to: ${nilVaultImplementation.address}`);

  // Verify contracts on Etherscan (if not on local network)
  if (process.env.ETHERSCAN_API_KEY && process.env.NODE_ENV !== 'development') {
    logger.info("Verifying contracts on Etherscan...");
    
    try {
      await run("verify:verify", {
        address: complianceRegistry.address,
        constructorArguments: [],
      });
      
      await run("verify:verify", {
        address: contractNFT.address,
        constructorArguments: [],
      });
      
      await run("verify:verify", {
        address: nilVaultImplementation.address,
        constructorArguments: [
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          complianceRegistry.address
        ],
      });
      
      logger.info("Contract verification completed!");
    } catch (error) {
      logger.error("Contract verification failed:", error);
    }
  }

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      ComplianceRegistry: complianceRegistry.address,
      ContractNFT: contractNFT.address,
      NILVaultImplementation: nilVaultImplementation.address,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info("Deployment Summary:", deploymentInfo);
  
  // Save to file for frontend/backend consumption
  const fs = require('fs');
  const path = require('path');
  
  fs.writeFileSync(
    path.join(__dirname, `../deployments/${deploymentInfo.network}-${deploymentInfo.chainId}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  logger.info(`Deployment addresses saved to deployments/${deploymentInfo.network}-${deploymentInfo.chainId}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });