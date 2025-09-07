// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ComplianceRegistry
 * @notice Handles KYC/AML compliance for NIL deals with automated checks
 * @dev Integrates with external compliance providers and maintains audit trails
 */
contract ComplianceRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant AUTOMATED_CHECKER_ROLE = keccak256("AUTOMATED_CHECKER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Events
    event AthleteVerified(
        address indexed athleteVault,
        bytes32 indexed kycHash,
        string verificationLevel,
        uint256 timestamp
    );

    event DealComplianceChecked(
        bytes32 indexed dealId,
        address indexed athleteVault,
        bool approved,
        string reason,
        uint256 timestamp
    );

    event SanctionsScreening(
        address indexed entity,
        bool passed,
        string database,
        uint256 timestamp
    );

    event ComplianceReportGenerated(
        bytes32 indexed reportId,
        address indexed requestor,
        string reportType,
        uint256 timestamp
    );

    event ISO20022MessageGenerated(
        bytes32 indexed dealId,
        string messageType,
        bytes32 messageHash,
        uint256 timestamp
    );

    // Structs
    struct KYCRecord {
        bool verified;
        string verificationLevel; // "basic", "enhanced", "institutional"
        uint256 verificationDate;
        uint256 expiryDate;
        string jurisdiction;
        bytes32 documentHash;
        address verifier;
        string notes;
    }

    struct ComplianceCheck {
        bytes32 dealId;
        address athleteVault;
        address brand;
        uint256 amount;
        bool kycPassed;
        bool amlPassed;
        bool sanctionsScreened;
        bool jurisdictionCompliant;
        bool approved;
        string reason;
        address checker;
        uint256 timestamp;
        bytes32 auditTrail;
    }

    struct SanctionRecord {
        bool isListed;
        string listName; // "OFAC", "EU", "UN", etc.
        uint256 addedDate;
        string reason;
        bytes32 evidenceHash;
    }

    struct ComplianceThreshold {
        uint256 basicKYCLimit;      // Max amount for basic KYC
        uint256 enhancedKYCLimit;   // Max amount for enhanced KYC
        uint256 institutionalLimit; // Max amount for institutional KYC
        uint256 dailyLimit;         // Daily transaction limit per athlete
        uint256 monthlyLimit;       // Monthly transaction limit per athlete
    }

    struct ISO20022Message {
        string messageType;
        bytes32 messageId;
        string content;
        bytes32 contentHash;
        uint256 timestamp;
        bool sent;
    }

    // State variables
    mapping(address => KYCRecord) public kycRecords;
    mapping(bytes32 => ComplianceCheck) public complianceChecks;
    mapping(address => SanctionRecord) public sanctionsList;
    mapping(bytes32 => ISO20022Message) public iso20022Messages;
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public monthlyVolume;
    mapping(address => uint256) public lastDayReset;
    mapping(address => uint256) public lastMonthReset;
    
    ComplianceThreshold public thresholds;
    
    // Compliance provider integrations
    mapping(string => address) public complianceProviders; // Chainalysis, Elliptic, etc.
    mapping(string => bool) public approvedJurisdictions;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
        
        // Set default thresholds
        thresholds = ComplianceThreshold({
            basicKYCLimit: 1000 * 1e18,      // $1,000 USD equivalent
            enhancedKYCLimit: 10000 * 1e18,  // $10,000 USD equivalent
            institutionalLimit: 100000 * 1e18, // $100,000 USD equivalent
            dailyLimit: 50000 * 1e18,        // $50,000 per day
            monthlyLimit: 500000 * 1e18      // $500,000 per month
        });

        // Set approved jurisdictions
        approvedJurisdictions["US"] = true;
        approvedJurisdictions["CA"] = true;
        approvedJurisdictions["EU"] = true;
        approvedJurisdictions["UK"] = true;
    }

    /**
     * @notice Verify KYC for an athlete
     * @param athleteVault Address of athlete's vault
     * @param verificationLevel Level of verification
     * @param jurisdiction Legal jurisdiction
     * @param documentHash Hash of KYC documents
     * @param expiryDate When verification expires
     */
    function verifyKYC(
        address athleteVault,
        string memory verificationLevel,
        string memory jurisdiction,
        bytes32 documentHash,
        uint256 expiryDate
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(athleteVault != address(0), "Invalid athlete vault");
        require(approvedJurisdictions[jurisdiction], "Jurisdiction not approved");
        require(expiryDate > block.timestamp, "Invalid expiry date");

        kycRecords[athleteVault] = KYCRecord({
            verified: true,
            verificationLevel: verificationLevel,
            verificationDate: block.timestamp,
            expiryDate: expiryDate,
            jurisdiction: jurisdiction,
            documentHash: documentHash,
            verifier: msg.sender,
            notes: ""
        });

        emit AthleteVerified(athleteVault, documentHash, verificationLevel, block.timestamp);
    }

    /**
     * @notice Check compliance for a NIL deal (automated)
     * @param dealId Unique deal identifier
     * @param athleteVault Athlete's vault address
     * @param brand Brand/sponsor address
     * @param amount Deal amount
     * @param jurisdiction Deal jurisdiction
     */
    function checkDealCompliance(
        bytes32 dealId,
        address athleteVault,
        address brand,
        uint256 amount,
        string memory jurisdiction
    ) external returns (bool approved) {
        require(
            hasRole(AUTOMATED_CHECKER_ROLE, msg.sender) || 
            hasRole(COMPLIANCE_OFFICER_ROLE, msg.sender),
            "Unauthorized checker"
        );

        // Initialize compliance check
        ComplianceCheck storage check = complianceChecks[dealId];
        check.dealId = dealId;
        check.athleteVault = athleteVault;
        check.brand = brand;
        check.amount = amount;
        check.checker = msg.sender;
        check.timestamp = block.timestamp;

        // 1. KYC Check
        check.kycPassed = _checkKYC(athleteVault, amount);
        
        // 2. AML/Sanctions Screening
        check.amlPassed = _checkAML(athleteVault, brand);
        check.sanctionsScreened = _checkSanctions(athleteVault) && _checkSanctions(brand);
        
        // 3. Jurisdiction Compliance
        check.jurisdictionCompliant = approvedJurisdictions[jurisdiction];
        
        // 4. Volume Limits
        bool volumeCompliant = _checkVolumeLimits(athleteVault, amount);
        
        // 5. Overall approval
        approved = check.kycPassed && 
                  check.amlPassed && 
                  check.sanctionsScreened && 
                  check.jurisdictionCompliant && 
                  volumeCompliant;
        
        check.approved = approved;
        check.reason = approved ? "Automated approval" : _getFailureReason(check, volumeCompliant);
        
        // Update volume tracking
        if (approved) {
            _updateVolumeTracking(athleteVault, amount);
        }

        // Generate ISO 20022 message
        bytes32 messageId = _generateISO20022Message(dealId, approved);
        check.auditTrail = messageId;

        emit DealComplianceChecked(dealId, athleteVault, approved, check.reason, block.timestamp);
    }

    /**
     * @notice Screen entity against sanctions lists
     * @param entity Address to screen
     */
    function screenSanctions(address entity) external onlyRole(COMPLIANCE_OFFICER_ROLE) returns (bool passed) {
        passed = !sanctionsList[entity].isListed;
        
        emit SanctionsScreening(entity, passed, "Manual Check", block.timestamp);
    }

    /**
     * @notice Add entity to sanctions list
     * @param entity Address to sanction
     * @param listName Sanctions list name
     * @param reason Reason for sanctioning
     * @param evidenceHash Hash of supporting evidence
     */
    function addToSanctionsList(
        address entity,
        string memory listName,
        string memory reason,
        bytes32 evidenceHash
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        sanctionsList[entity] = SanctionRecord({
            isListed: true,
            listName: listName,
            addedDate: block.timestamp,
            reason: reason,
            evidenceHash: evidenceHash
        });
    }

    /**
     * @notice Generate compliance report
     * @param athleteVault Athlete vault address
     * @param startDate Start date for report
     * @param endDate End date for report
     */
    function generateComplianceReport(
        address athleteVault,
        uint256 startDate,
        uint256 endDate,
        string memory reportType
    ) external onlyRole(AUDITOR_ROLE) returns (bytes32 reportId) {
        reportId = keccak256(abi.encodePacked(
            athleteVault,
            startDate,
            endDate,
            reportType,
            block.timestamp
        ));

        emit ComplianceReportGenerated(reportId, msg.sender, reportType, block.timestamp);
    }

    /**
     * @notice Update compliance thresholds
     * @param newThresholds New threshold values
     */
    function updateThresholds(ComplianceThreshold memory newThresholds) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        thresholds = newThresholds;
    }

    /**
     * @notice Add approved jurisdiction
     * @param jurisdiction Jurisdiction code
     */
    function addApprovedJurisdiction(string memory jurisdiction) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        approvedJurisdictions[jurisdiction] = true;
    }

    /**
     * @notice Get KYC record for athlete
     * @param athleteVault Athlete vault address
     */
    function getKYCRecord(address athleteVault) external view returns (KYCRecord memory) {
        return kycRecords[athleteVault];
    }

    /**
     * @notice Get compliance check details
     * @param dealId Deal identifier
     */
    function getComplianceCheck(bytes32 dealId) external view returns (ComplianceCheck memory) {
        return complianceChecks[dealId];
    }

    /**
     * @notice Check if entity is sanctioned
     * @param entity Address to check
     */
    function isSanctioned(address entity) external view returns (bool) {
        return sanctionsList[entity].isListed;
    }

    // Internal functions
    function _checkKYC(address athleteVault, uint256 amount) internal view returns (bool) {
        KYCRecord memory kyc = kycRecords[athleteVault];
        
        if (!kyc.verified || kyc.expiryDate <= block.timestamp) {
            return false;
        }

        // Check amount against KYC level
        if (keccak256(bytes(kyc.verificationLevel)) == keccak256(bytes("basic"))) {
            return amount <= thresholds.basicKYCLimit;
        } else if (keccak256(bytes(kyc.verificationLevel)) == keccak256(bytes("enhanced"))) {
            return amount <= thresholds.enhancedKYCLimit;
        } else if (keccak256(bytes(kyc.verificationLevel)) == keccak256(bytes("institutional"))) {
            return amount <= thresholds.institutionalLimit;
        }

        return false;
    }

    function _checkAML(address athleteVault, address brand) internal view returns (bool) {
        // Basic AML check - can be extended with external provider integration
        return !sanctionsList[athleteVault].isListed && !sanctionsList[brand].isListed;
    }

    function _checkSanctions(address entity) internal view returns (bool) {
        return !sanctionsList[entity].isListed;
    }

    function _checkVolumeLimits(address athleteVault, uint256 amount) internal view returns (bool) {
        uint256 currentDailyVolume = _getCurrentDailyVolume(athleteVault);
        uint256 currentMonthlyVolume = _getCurrentMonthlyVolume(athleteVault);
        
        return (currentDailyVolume + amount <= thresholds.dailyLimit) &&
               (currentMonthlyVolume + amount <= thresholds.monthlyLimit);
    }

    function _getCurrentDailyVolume(address athleteVault) internal view returns (uint256) {
        if (_isNewDay(athleteVault)) {
            return 0;
        }
        return dailyVolume[athleteVault];
    }

    function _getCurrentMonthlyVolume(address athleteVault) internal view returns (uint256) {
        if (_isNewMonth(athleteVault)) {
            return 0;
        }
        return monthlyVolume[athleteVault];
    }

    function _isNewDay(address athleteVault) internal view returns (bool) {
        return (block.timestamp - lastDayReset[athleteVault]) >= 86400; // 24 hours
    }

    function _isNewMonth(address athleteVault) internal view returns (bool) {
        return (block.timestamp - lastMonthReset[athleteVault]) >= 2592000; // 30 days
    }

    function _updateVolumeTracking(address athleteVault, uint256 amount) internal {
        if (_isNewDay(athleteVault)) {
            dailyVolume[athleteVault] = amount;
            lastDayReset[athleteVault] = block.timestamp;
        } else {
            dailyVolume[athleteVault] += amount;
        }

        if (_isNewMonth(athleteVault)) {
            monthlyVolume[athleteVault] = amount;
            lastMonthReset[athleteVault] = block.timestamp;
        } else {
            monthlyVolume[athleteVault] += amount;
        }
    }

    function _getFailureReason(
        ComplianceCheck memory check, 
        bool volumeCompliant
    ) internal pure returns (string memory) {
        if (!check.kycPassed) return "KYC verification failed";
        if (!check.amlPassed) return "AML screening failed";
        if (!check.sanctionsScreened) return "Sanctions screening failed";
        if (!check.jurisdictionCompliant) return "Jurisdiction not approved";
        if (!volumeCompliant) return "Volume limits exceeded";
        return "Unknown compliance failure";
    }

    function _generateISO20022Message(bytes32 dealId, bool approved) internal returns (bytes32 messageId) {
        messageId = keccak256(abi.encodePacked(dealId, approved, block.timestamp));
        
        string memory messageType = approved ? "pacs.008.001.08" : "pacs.002.001.08";
        string memory content = approved ? 
            "NIL deal compliance approved" : 
            "NIL deal compliance rejected";
        
        iso20022Messages[messageId] = ISO20022Message({
            messageType: messageType,
            messageId: messageId,
            content: content,
            contentHash: keccak256(bytes(content)),
            timestamp: block.timestamp,
            sent: false
        });

        emit ISO20022MessageGenerated(dealId, messageType, messageId, block.timestamp);
    }

    // Emergency functions
    function pause() external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _unpause();
    }
}