import { expect } from "chai";
import { ethers } from "hardhat";
import { NILVault, ComplianceRegistry, ContractNFT } from "../typechain-types";

describe("NIL Transparency Network", function () {
  let nilVault: NILVault;
  let complianceRegistry: ComplianceRegistry;
  let contractNFT: ContractNFT;
  let owner: any;
  let athlete: any;
  let brand: any;

  beforeEach(async function () {
    [owner, athlete, brand] = await ethers.getSigners();

    // Deploy ComplianceRegistry
    const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
    complianceRegistry = await ComplianceRegistry.deploy();
    await complianceRegistry.waitForDeployment();

    // Deploy NILVault
    const NILVault = await ethers.getContractFactory("NILVault");
    nilVault = await NILVault.deploy();
    await nilVault.waitForDeployment();

    // Deploy ContractNFT
    const ContractNFT = await ethers.getContractFactory("ContractNFT");
    contractNFT = await ContractNFT.deploy();
    await contractNFT.waitForDeployment();
  });

  describe("NILVault", function () {
    it("Should deploy successfully", async function () {
      expect(await nilVault.getAddress()).to.be.properAddress;
    });

    it("Should have correct owner", async function () {
      expect(await nilVault.owner()).to.equal(owner.address);
    });
  });

  describe("ComplianceRegistry", function () {
    it("Should deploy successfully", async function () {
      expect(await complianceRegistry.getAddress()).to.be.properAddress;
    });
  });

  describe("ContractNFT", function () {
    it("Should deploy successfully", async function () {
      expect(await contractNFT.getAddress()).to.be.properAddress;
    });

    it("Should have correct name and symbol", async function () {
      expect(await contractNFT.name()).to.equal("NIL Contract");
      expect(await contractNFT.symbol()).to.equal("NILC");
    });
  });
});