import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { ComplianceRegistry } from "../../typechain-types";

describe("ComplianceRegistry Contract Tests", function () {
  let complianceRegistry: ComplianceRegistry;
  let owner: Signer;
  let complianceOfficer: Signer;
  let athlete: Signer;
  let brand: Signer;
  let addrs: Signer[];

  beforeEach(async function () {
    [owner, complianceOfficer, athlete, brand, ...addrs] = await ethers.getSigners();

    const ComplianceRegistryFactory = await ethers.getContractFactory("ComplianceRegistry");
    complianceRegistry = (await ComplianceRegistryFactory.deploy()) as ComplianceRegistry;
    await complianceRegistry.deployed();

    // Grant compliance officer role
    const COMPLIANCE_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("COMPLIANCE_OFFICER_ROLE"));
    await complianceRegistry.grantRole(COMPLIANCE_OFFICER_ROLE, await complianceOfficer.getAddress());
  });

  describe("Deployment", function () {
    it("Should set correct initial thresholds", async function () {
      const thresholds = await complianceRegistry.thresholds();
      expect(thresholds.basicKYCLimit).to.equal(ethers.utils.parseEther("1000"));
      expect(thresholds.enhancedKYCLimit).to.equal(ethers.utils.parseEther("10000"));
      expect(thresholds.institutionalLimit).to.equal(ethers.utils.parseEther("100000"));
    });

    it("Should approve default jurisdictions", async function () {
      expect(await complianceRegistry.approvedJurisdictions("US")).to.be.true;
      expect(await complianceRegistry.approvedJurisdictions("CA")).to.be.true;
      expect(await complianceRegistry.approvedJurisdictions("EU")).to.be.true;
      expect(await complianceRegistry.approvedJurisdictions("UK")).to.be.true;
      expect(await complianceRegistry.approvedJurisdictions("XX")).to.be.false;
    });
  });

  describe("KYC Management", function () {
    it("Should verify KYC for athlete", async function () {
      const athleteAddress = await athlete.getAddress();
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents"));
      const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year

      await expect(
        complianceRegistry.connect(complianceOfficer).verifyKYC(
          athleteAddress,
          "enhanced",
          "US",
          documentHash,
          expiryDate
        )
      )
        .to.emit(complianceRegistry, "AthleteVerified")
        .withArgs(athleteAddress, documentHash, "enhanced", (timestamp: number) => timestamp > 0);

      const kycRecord = await complianceRegistry.getKYCRecord(athleteAddress);
      expect(kycRecord.verified).to.be.true;
      expect(kycRecord.verificationLevel).to.equal("enhanced");
      expect(kycRecord.jurisdiction).to.equal("US");
      expect(kycRecord.documentHash).to.equal(documentHash);
    });

    it("Should not allow non-compliance officer to verify KYC", async function () {
      const athleteAddress = await athlete.getAddress();
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents"));
      const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;

      await expect(
        complianceRegistry.connect(athlete).verifyKYC(
          athleteAddress,
          "enhanced",
          "US",
          documentHash,
          expiryDate
        )
      ).to.be.reverted;
    });

    it("Should reject verification for non-approved jurisdiction", async function () {
      const athleteAddress = await athlete.getAddress();
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents"));
      const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;

      await expect(
        complianceRegistry.connect(complianceOfficer).verifyKYC(
          athleteAddress,
          "enhanced",
          "XX", // Invalid jurisdiction
          documentHash,
          expiryDate
        )
      ).to.be.revertedWith("Jurisdiction not approved");
    });
  });

  describe("Deal Compliance Checks", function () {
    beforeEach(async function () {
      // Setup KYC for athlete
      await complianceRegistry.connect(complianceOfficer).verifyKYC(
        await athlete.getAddress(),
        "enhanced",
        "US",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents")),
        Math.floor(Date.now() / 1000) + 86400 * 365
      );

      // Grant automated checker role to owner for testing
      const AUTOMATED_CHECKER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AUTOMATED_CHECKER_ROLE"));
      await complianceRegistry.grantRole(AUTOMATED_CHECKER_ROLE, await owner.getAddress());
    });

    it("Should approve compliant deal", async function () {
      const dealId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_deal_1"));
      const amount = ethers.utils.parseEther("5000"); // Within enhanced KYC limit

      const approved = await complianceRegistry.checkDealCompliance(
        dealId,
        await athlete.getAddress(),
        await brand.getAddress(),
        amount,
        "US"
      );

      expect(approved).to.be.true;

      const complianceCheck = await complianceRegistry.getComplianceCheck(dealId);
      expect(complianceCheck.approved).to.be.true;
      expect(complianceCheck.kycPassed).to.be.true;
      expect(complianceCheck.jurisdictionCompliant).to.be.true;
    });

    it("Should reject deal exceeding KYC limits", async function () {
      const dealId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_deal_2"));
      const amount = ethers.utils.parseEther("15000"); // Exceeds enhanced KYC limit

      const approved = await complianceRegistry.checkDealCompliance(
        dealId,
        await athlete.getAddress(),
        await brand.getAddress(),
        amount,
        "US"
      );

      expect(approved).to.be.false;

      const complianceCheck = await complianceRegistry.getComplianceCheck(dealId);
      expect(complianceCheck.approved).to.be.false;
      expect(complianceCheck.kycPassed).to.be.false;
    });

    it("Should reject deal from non-approved jurisdiction", async function () {
      const dealId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_deal_3"));
      const amount = ethers.utils.parseEther("1000");

      const approved = await complianceRegistry.checkDealCompliance(
        dealId,
        await athlete.getAddress(),
        await brand.getAddress(),
        amount,
        "XX" // Non-approved jurisdiction
      );

      expect(approved).to.be.false;

      const complianceCheck = await complianceRegistry.getComplianceCheck(dealId);
      expect(complianceCheck.approved).to.be.false;
      expect(complianceCheck.jurisdictionCompliant).to.be.false;
    });
  });

  describe("Sanctions Screening", function () {
    it("Should screen entity against sanctions", async function () {
      const entityAddress = await addrs[0].getAddress();

      const passed = await complianceRegistry.connect(complianceOfficer).screenSanctions(entityAddress);
      expect(passed).to.be.true;
    });

    it("Should add entity to sanctions list", async function () {
      const entityAddress = await addrs[0].getAddress();
      const evidenceHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sanctions_evidence"));

      await complianceRegistry.connect(complianceOfficer).addToSanctionsList(
        entityAddress,
        "OFAC",
        "Terrorism financing",
        evidenceHash
      );

      expect(await complianceRegistry.isSanctioned(entityAddress)).to.be.true;

      const sanctionRecord = await complianceRegistry.sanctionsList(entityAddress);
      expect(sanctionRecord.isListed).to.be.true;
      expect(sanctionRecord.listName).to.equal("OFAC");
      expect(sanctionRecord.reason).to.equal("Terrorism financing");
    });

    it("Should reject deal with sanctioned entity", async function () {
      const entityAddress = await addrs[0].getAddress();
      
      // Add entity to sanctions list
      await complianceRegistry.connect(complianceOfficer).addToSanctionsList(
        entityAddress,
        "OFAC",
        "Test sanction",
        ethers.constants.HashZero
      );

      const dealId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sanctioned_deal"));
      
      const approved = await complianceRegistry.checkDealCompliance(
        dealId,
        entityAddress, // Sanctioned athlete
        await brand.getAddress(),
        ethers.utils.parseEther("1000"),
        "US"
      );

      expect(approved).to.be.false;
    });
  });

  describe("Volume Limits", function () {
    beforeEach(async function () {
      // Setup enhanced KYC
      await complianceRegistry.connect(complianceOfficer).verifyKYC(
        await athlete.getAddress(),
        "enhanced",
        "US",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents")),
        Math.floor(Date.now() / 1000) + 86400 * 365
      );

      const AUTOMATED_CHECKER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AUTOMATED_CHECKER_ROLE"));
      await complianceRegistry.grantRole(AUTOMATED_CHECKER_ROLE, await owner.getAddress());
    });

    it("Should track daily volume limits", async function () {
      const athleteAddress = await athlete.getAddress();
      const thresholds = await complianceRegistry.thresholds();
      const largeAmount = thresholds.dailyLimit.add(1); // Exceed daily limit

      const dealId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("large_deal"));
      
      const approved = await complianceRegistry.checkDealCompliance(
        dealId,
        athleteAddress,
        await brand.getAddress(),
        largeAmount,
        "US"
      );

      expect(approved).to.be.false;
    });

    it("Should allow multiple small deals within limits", async function () {
      const athleteAddress = await athlete.getAddress();
      const smallAmount = ethers.utils.parseEther("1000");

      // First deal
      const dealId1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("small_deal_1"));
      const approved1 = await complianceRegistry.checkDealCompliance(
        dealId1,
        athleteAddress,
        await brand.getAddress(),
        smallAmount,
        "US"
      );
      expect(approved1).to.be.true;

      // Second deal
      const dealId2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("small_deal_2"));
      const approved2 = await complianceRegistry.checkDealCompliance(
        dealId2,
        athleteAddress,
        await brand.getAddress(),
        smallAmount,
        "US"
      );
      expect(approved2).to.be.true;
    });
  });

  describe("Compliance Reporting", function () {
    it("Should generate compliance report", async function () {
      const athleteAddress = await athlete.getAddress();
      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30; // 30 days ago
      const endDate = Math.floor(Date.now() / 1000);

      const AUDITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AUDITOR_ROLE"));
      await complianceRegistry.grantRole(AUDITOR_ROLE, await owner.getAddress());

      await expect(
        complianceRegistry.generateComplianceReport(
          athleteAddress,
          startDate,
          endDate,
          "comprehensive"
        )
      ).to.emit(complianceRegistry, "ComplianceReportGenerated");
    });
  });

  describe("Threshold Management", function () {
    it("Should allow compliance officer to update thresholds", async function () {
      const newThresholds = {
        basicKYCLimit: ethers.utils.parseEther("2000"),
        enhancedKYCLimit: ethers.utils.parseEther("20000"),
        institutionalLimit: ethers.utils.parseEther("200000"),
        dailyLimit: ethers.utils.parseEther("100000"),
        monthlyLimit: ethers.utils.parseEther("1000000"),
      };

      await complianceRegistry.connect(complianceOfficer).updateThresholds(newThresholds);

      const updatedThresholds = await complianceRegistry.thresholds();
      expect(updatedThresholds.basicKYCLimit).to.equal(newThresholds.basicKYCLimit);
      expect(updatedThresholds.enhancedKYCLimit).to.equal(newThresholds.enhancedKYCLimit);
    });

    it("Should not allow non-compliance officer to update thresholds", async function () {
      const newThresholds = {
        basicKYCLimit: ethers.utils.parseEther("2000"),
        enhancedKYCLimit: ethers.utils.parseEther("20000"),
        institutionalLimit: ethers.utils.parseEther("200000"),
        dailyLimit: ethers.utils.parseEther("100000"),
        monthlyLimit: ethers.utils.parseEther("1000000"),
      };

      await expect(
        complianceRegistry.connect(athlete).updateThresholds(newThresholds)
      ).to.be.reverted;
    });
  });

  describe("ISO 20022 Message Generation", function () {
    it("Should generate ISO 20022 messages for compliance events", async function () {
      const athleteAddress = await athlete.getAddress();
      
      // Setup KYC and role
      await complianceRegistry.connect(complianceOfficer).verifyKYC(
        athleteAddress,
        "enhanced",
        "US",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc_documents")),
        Math.floor(Date.now() / 1000) + 86400 * 365
      );

      const AUTOMATED_CHECKER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AUTOMATED_CHECKER_ROLE"));
      await complianceRegistry.grantRole(AUTOMATED_CHECKER_ROLE, await owner.getAddress());

      const dealId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("iso_test_deal"));
      
      await expect(
        complianceRegistry.checkDealCompliance(
          dealId,
          athleteAddress,
          await brand.getAddress(),
          ethers.utils.parseEther("1000"),
          "US"
        )
      ).to.emit(complianceRegistry, "ISO20022MessageGenerated");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow compliance officer to pause contract", async function () {
      await complianceRegistry.connect(complianceOfficer).pause();
      expect(await complianceRegistry.paused()).to.be.true;

      await complianceRegistry.connect(complianceOfficer).unpause();
      expect(await complianceRegistry.paused()).to.be.false;
    });

    it("Should not allow non-compliance officer to pause", async function () {
      await expect(complianceRegistry.connect(athlete).pause()).to.be.reverted;
    });
  });
});