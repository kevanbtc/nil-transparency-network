import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";
import { NILVault, ComplianceRegistry, ContractNFT } from "../../typechain-types";

describe("NILVault Contract Tests", function () {
  let nilVault: NILVault;
  let complianceRegistry: ComplianceRegistry;
  let contractNFT: ContractNFT;
  let owner: Signer;
  let athlete: Signer;
  let brand: Signer;
  let school: Signer;
  let addrs: Signer[];

  beforeEach(async function () {
    [owner, athlete, brand, school, ...addrs] = await ethers.getSigners();

    // Deploy ComplianceRegistry
    const ComplianceRegistryFactory = await ethers.getContractFactory("ComplianceRegistry");
    complianceRegistry = (await upgrades.deployProxy(ComplianceRegistryFactory, [])) as ComplianceRegistry;
    await complianceRegistry.deployed();

    // Deploy ContractNFT
    const ContractNFTFactory = await ethers.getContractFactory("ContractNFT");
    contractNFT = (await ContractNFTFactory.deploy()) as ContractNFT;
    await contractNFT.deployed();

    // Deploy NILVault
    const NILVaultFactory = await ethers.getContractFactory("NILVault");
    nilVault = (await NILVaultFactory.deploy(
      await athlete.getAddress(),
      ethers.constants.AddressZero, // NIL protocol address (mock for testing)
      complianceRegistry.address
    )) as NILVault;
    await nilVault.deployed();

    // Setup athlete profile
    await nilVault.connect(athlete).setupAthleteProfile(
      "Test Athlete",
      "Football",
      "Test University",
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_hash"))
    );

    // Grant roles for testing
    const COMPLIANCE_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("COMPLIANCE_OFFICER_ROLE"));
    await complianceRegistry.grantRole(COMPLIANCE_OFFICER_ROLE, await owner.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct athlete owner", async function () {
      expect(await nilVault.owner()).to.equal(await athlete.getAddress());
    });

    it("Should set the correct compliance registry", async function () {
      expect(await nilVault.complianceRegistry()).to.equal(complianceRegistry.address);
    });

    it("Should initialize with zero deals", async function () {
      expect(await nilVault.dealCounter()).to.equal(0);
    });
  });

  describe("Athlete Profile Management", function () {
    it("Should setup athlete profile correctly", async function () {
      const profile = await nilVault.athleteProfile();
      expect(profile.name).to.equal("Test Athlete");
      expect(profile.sport).to.equal("Football");
      expect(profile.school).to.equal("Test University");
      expect(profile.eligibilityStatus).to.equal("active");
    });

    it("Should only allow owner to setup profile", async function () {
      await expect(
        nilVault.connect(brand).setupAthleteProfile("Hacker", "Hacking", "Hack University", ethers.constants.HashZero)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("NIL Deal Creation", function () {
    beforeEach(async function () {
      // Add authorized platform
      await nilVault.connect(athlete).addAuthorizedPlatform(await owner.getAddress());
    });

    it("Should create a NIL deal successfully", async function () {
      const amount = ethers.utils.parseEther("1000");
      const deliverables = "Social media posts";
      const termsIPFS = "QmTest123";
      const revenueSplits = [7500, 1500, 500, 500]; // 75%, 15%, 5%, 5%
      const beneficiaries = [
        await athlete.getAddress(),
        await school.getAddress(),
        await addrs[0].getAddress(),
        await owner.getAddress(),
      ];

      const tx = await nilVault.createNILDeal(
        await brand.getAddress(),
        amount,
        deliverables,
        termsIPFS,
        revenueSplits,
        beneficiaries
      );

      const receipt = await tx.wait();
      const dealCreatedEvent = receipt.events?.find(e => e.event === "NILDealCreated");
      expect(dealCreatedEvent).to.not.be.undefined;

      const dealId = dealCreatedEvent?.args?.dealId;
      const deal = await nilVault.getDeal(dealId);

      expect(deal.athlete).to.equal(await athlete.getAddress());
      expect(deal.brand).to.equal(await brand.getAddress());
      expect(deal.amount).to.equal(amount);
      expect(deal.deliverables).to.equal(deliverables);
      expect(deal.termsIPFS).to.equal(termsIPFS);
    });

    it("Should reject deals with invalid revenue splits", async function () {
      const amount = ethers.utils.parseEther("1000");
      const revenueSplits = [9000, 2000, 1000]; // Total > 100%
      const beneficiaries = [
        await athlete.getAddress(),
        await school.getAddress(),
        await addrs[0].getAddress(),
      ];

      await expect(
        nilVault.createNILDeal(
          await brand.getAddress(),
          amount,
          "Test deliverables",
          "QmTest",
          revenueSplits,
          beneficiaries
        )
      ).to.be.revertedWith("Invalid revenue splits");
    });

    it("Should only allow authorized platforms to create deals", async function () {
      const amount = ethers.utils.parseEther("1000");
      const revenueSplits = [10000];
      const beneficiaries = [await athlete.getAddress()];

      await expect(
        nilVault.connect(brand).createNILDeal(
          await brand.getAddress(),
          amount,
          "Test deliverables",
          "QmTest",
          revenueSplits,
          beneficiaries
        )
      ).to.be.revertedWith("Unauthorized platform");
    });
  });

  describe("Compliance Integration", function () {
    let dealId: string;

    beforeEach(async function () {
      // Setup KYC for athlete
      await complianceRegistry.verifyKYC(
        await athlete.getAddress(),
        "enhanced",
        "US",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents")),
        Math.floor(Date.now() / 1000) + 86400 * 365 // 1 year from now
      );

      // Add authorized platform and create deal
      await nilVault.connect(athlete).addAuthorizedPlatform(await owner.getAddress());
      
      const tx = await nilVault.createNILDeal(
        await brand.getAddress(),
        ethers.utils.parseEther("1000"),
        "Test deliverables",
        "QmTest",
        [10000],
        [await athlete.getAddress()]
      );

      const receipt = await tx.wait();
      dealId = receipt.events?.find(e => e.event === "NILDealCreated")?.args?.dealId;
    });

    it("Should approve compliance for valid deal", async function () {
      await nilVault.approveCompliance(
        dealId,
        true,
        "Automated approval",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("compliance_docs"))
      );

      const complianceRecord = await nilVault.complianceRecords(dealId);
      expect(complianceRecord.approved).to.be.true;
      expect(complianceRecord.reason).to.equal("Automated approval");
    });

    it("Should execute deal after compliance approval", async function () {
      // Fund the vault
      await owner.sendTransaction({
        to: nilVault.address,
        value: ethers.utils.parseEther("2000")
      });

      // Approve compliance
      await nilVault.approveCompliance(
        dealId,
        true,
        "Automated approval",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("compliance_docs"))
      );

      const initialBalance = await athlete.getBalance();
      
      // Execute deal
      const tx = await nilVault.executeNILDeal(dealId);
      await tx.wait();

      const finalBalance = await athlete.getBalance();
      expect(finalBalance.gt(initialBalance)).to.be.true;

      const deal = await nilVault.getDeal(dealId);
      expect(deal.executed).to.be.true;
    });

    it("Should not execute deal without compliance approval", async function () {
      await expect(nilVault.executeNILDeal(dealId)).to.be.revertedWith("Deal not compliance approved");
    });
  });

  describe("Revenue Distribution", function () {
    it("Should distribute funds according to splits", async function () {
      // Add authorized platform
      await nilVault.connect(athlete).addAuthorizedPlatform(await owner.getAddress());

      // Setup KYC
      await complianceRegistry.verifyKYC(
        await athlete.getAddress(),
        "enhanced",
        "US",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents")),
        Math.floor(Date.now() / 1000) + 86400 * 365
      );

      // Create deal with multiple beneficiaries
      const amount = ethers.utils.parseEther("1000");
      const revenueSplits = [7000, 2000, 1000]; // 70%, 20%, 10%
      const beneficiaries = [
        await athlete.getAddress(),
        await school.getAddress(),
        await addrs[0].getAddress(),
      ];

      const tx = await nilVault.createNILDeal(
        await brand.getAddress(),
        amount,
        "Multi-beneficiary deal",
        "QmTest",
        revenueSplits,
        beneficiaries
      );

      const receipt = await tx.wait();
      const dealId = receipt.events?.find(e => e.event === "NILDealCreated")?.args?.dealId;

      // Fund vault
      await owner.sendTransaction({ to: nilVault.address, value: amount.mul(2) });

      // Approve compliance
      await nilVault.approveCompliance(dealId, true, "Approved", ethers.constants.HashZero);

      // Track balances
      const athleteBalanceBefore = await athlete.getBalance();
      const schoolBalanceBefore = await school.getBalance();
      const collectiveBalanceBefore = await addrs[0].getBalance();

      // Execute deal
      await nilVault.executeNILDeal(dealId);

      // Check distributions
      const athleteBalanceAfter = await athlete.getBalance();
      const schoolBalanceAfter = await school.getBalance();
      const collectiveBalanceAfter = await addrs[0].getBalance();

      const expectedAthleteShare = amount.mul(7000).div(10000);
      const expectedSchoolShare = amount.mul(2000).div(10000);
      const expectedCollectiveShare = amount.mul(1000).div(10000);

      expect(athleteBalanceAfter.sub(athleteBalanceBefore)).to.equal(expectedAthleteShare);
      expect(schoolBalanceAfter.sub(schoolBalanceBefore)).to.equal(expectedSchoolShare);
      expect(collectiveBalanceAfter.sub(collectiveBalanceBefore)).to.equal(expectedCollectiveShare);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw", async function () {
      const depositAmount = ethers.utils.parseEther("5");
      
      // Send funds to vault
      await owner.sendTransaction({ to: nilVault.address, value: depositAmount });

      const athleteBalanceBefore = await athlete.getBalance();
      const vaultBalanceBefore = await ethers.provider.getBalance(nilVault.address);

      expect(vaultBalanceBefore).to.equal(depositAmount);

      // Emergency withdraw
      await nilVault.connect(athlete).emergencyWithdraw();

      const athleteBalanceAfter = await athlete.getBalance();
      const vaultBalanceAfter = await ethers.provider.getBalance(nilVault.address);

      expect(vaultBalanceAfter).to.equal(0);
      expect(athleteBalanceAfter.gt(athleteBalanceBefore)).to.be.true;
    });

    it("Should not allow non-owner to emergency withdraw", async function () {
      await expect(nilVault.connect(brand).emergencyWithdraw()).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Access Control", function () {
    it("Should manage authorized platforms correctly", async function () {
      const platformAddress = await addrs[0].getAddress();

      expect(await nilVault.authorizedPlatforms(platformAddress)).to.be.false;

      await nilVault.connect(athlete).addAuthorizedPlatform(platformAddress);
      expect(await nilVault.authorizedPlatforms(platformAddress)).to.be.true;

      await nilVault.connect(athlete).removeAuthorizedPlatform(platformAddress);
      expect(await nilVault.authorizedPlatforms(platformAddress)).to.be.false;
    });
  });

  describe("Event Emissions", function () {
    it("Should emit correct events for deal lifecycle", async function () {
      await nilVault.connect(athlete).addAuthorizedPlatform(await owner.getAddress());

      const amount = ethers.utils.parseEther("1000");
      
      // Test NILDealCreated event
      await expect(
        nilVault.createNILDeal(
          await brand.getAddress(),
          amount,
          "Test deliverables",
          "QmTest",
          [10000],
          [await athlete.getAddress()]
        )
      )
        .to.emit(nilVault, "NILDealCreated")
        .withArgs(
          (dealId: string) => dealId !== null,
          await athlete.getAddress(),
          await brand.getAddress(),
          amount,
          "Test deliverables"
        );
    });
  });
});