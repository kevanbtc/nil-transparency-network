import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "solidity-coverage";
import * as dotenv from "dotenv";
dotenv.config();

export default {
  solidity: { 
    version: "0.8.24", 
    settings: { 
      optimizer: { 
        enabled: true, 
        runs: 200 
      } 
    } 
  },
  namedAccounts: { 
    deployer: { default: 0 } 
  },
  networks: {
    hardhat: {},
    sepolia: { 
      url: process.env.RPC_SEPOLIA || "https://sepolia.infura.io/v3/your-key", 
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};