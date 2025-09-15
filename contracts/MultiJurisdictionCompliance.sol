// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ComplianceRegistry.sol";

/**
 * @title MultiJurisdictionCompliance
 * @notice Extends ComplianceRegistry with global multi-jurisdiction support
 * @dev Supports US, EU, Canada, UK, Asia-Pacific regional compliance
 */
contract MultiJurisdictionCompliance is ComplianceRegistry {
    
    // Events
    event JurisdictionAdded(
        string indexed jurisdictionCode,
        address indexed complianceAdapter,
        uint256 indexed tier
    );
    
    event CrossBorderDealApproved(
        bytes32 indexed dealId,
        string indexed fromJurisdiction,
        string indexed toJurisdiction,
        uint256 amount
    );
    
    event RegionalComplianceProviderAdded(
        string indexed jurisdiction,
        string indexed providerName,
        address indexed providerAddress
    );

    // Structs
    struct JurisdictionConfig {
        string jurisdictionCode; // "US", "EU", "CA", "UK", "SG", "JP", "AU"
        string jurisdictionName;
        address complianceAdapter; // Regional compliance adapter contract
        uint256 complianceTier; // 1=Basic, 2=Enhanced, 3=Institutional
        uint256 maxDealAmount; // Maximum deal amount without enhanced checks
        uint256 maxDailyVolume; // Maximum daily volume per jurisdiction
        bool crossBorderEnabled; // Can participate in cross-border deals
        bool dataProcessingAllowed; // GDPR/data processing permissions
        bytes32 regulatoryFramework; // Hash of regulatory framework document
        bool active;
    }

    struct CrossBorderRule {
        string fromJurisdiction;
        string toJurisdiction;
        bool allowed;
        uint256 maxAmount;
        uint256 additionalChecksRequired; // Bitmap of required checks
        uint256 processingTimeHours; // Expected processing time
        string[] requiredDocuments; // Additional required documents
    }

    struct DataProtectionRule {
        string jurisdiction;
        bool gdprApplicable;
        bool ccpaApplicable; 
        bool pipdaApplicable; // Canada PIPDA
        uint256 dataRetentionDays;
        bool crossBorderDataTransferAllowed;
        string[] permittedDataCategories;
        string consentRequirements;
    }

    struct RegionalComplianceProvider {
        string providerName; // "Chainalysis EU", "Elliptic Asia", etc.
        address providerContract;
        string[] supportedJurisdictions;
        string[] serviceTypes; // "KYC", "AML", "Sanctions", "TaxReporting"
        bool active;
        uint256 responseTimeSLA; // Response time SLA in seconds
    }

    // State variables
    mapping(string => JurisdictionConfig) public jurisdictionConfigs;
    mapping(bytes32 => CrossBorderRule) public crossBorderRules; // keccak256(from+to)
    mapping(string => DataProtectionRule) public dataProtectionRules;
    mapping(bytes32 => RegionalComplianceProvider) public complianceProviders; // keccak256(name)
    
    string[] public supportedJurisdictions;
    mapping(string => bool) public jurisdictionExists;
    
    // Cross-border deal tracking
    mapping(bytes32 => string) public dealJurisdictions; // dealId => jurisdiction
    mapping(bytes32 => bool) public crossBorderDeals; // dealId => isCrossBorder

    constructor() ComplianceRegistry() {
        // Initialize with major jurisdictions
        _addJurisdiction("US", "United States", 3, 1000000 * 1e18, 10000000 * 1e18, true, true);
        _addJurisdiction("EU", "European Union", 3, 500000 * 1e18, 5000000 * 1e18, true, false); // GDPR restrictions
        _addJurisdiction("CA", "Canada", 2, 750000 * 1e18, 7500000 * 1e18, true, true);
        _addJurisdiction("UK", "United Kingdom", 2, 500000 * 1e18, 5000000 * 1e18, true, true);
        _addJurisdiction("SG", "Singapore", 2, 300000 * 1e18, 3000000 * 1e18, true, true);
        _addJurisdiction("JP", "Japan", 2, 400000 * 1e18, 4000000 * 1e18, true, true);
        _addJurisdiction("AU", "Australia", 2, 400000 * 1e18, 4000000 * 1e18, true, true);
        _addJurisdiction("BR", "Brazil", 1, 200000 * 1e18, 2000000 * 1e18, true, true);
        
        // Initialize cross-border rules
        _initializeCrossBorderRules();
        
        // Initialize data protection rules
        _initializeDataProtectionRules();
    }

    /**
     * @notice Check compliance for multi-jurisdiction NIL deal
     * @param dealId Unique deal identifier
     * @param athleteVault Athlete's vault address
     * @param brand Brand/sponsor address
     * @param amount Deal amount
     * @param athleteJurisdiction Athlete's jurisdiction
     * @param brandJurisdiction Brand's jurisdiction
     */
    function checkMultiJurisdictionCompliance(
        bytes32 dealId,
        address athleteVault,
        address brand,
        uint256 amount,
        string memory athleteJurisdiction,
        string memory brandJurisdiction
    ) external returns (bool approved) {
        require(
            hasRole(AUTOMATED_CHECKER_ROLE, msg.sender) || 
            hasRole(COMPLIANCE_OFFICER_ROLE, msg.sender),
            "Unauthorized checker"
        );
        
        // Store jurisdiction information
        dealJurisdictions[dealId] = athleteJurisdiction;
        
        bool isCrossBorder = keccak256(bytes(athleteJurisdiction)) != keccak256(bytes(brandJurisdiction));
        crossBorderDeals[dealId] = isCrossBorder;
        
        // 1. Check basic compliance (inherited from parent)
        approved = this.checkDealCompliance(dealId, athleteVault, brand, amount, athleteJurisdiction);
        if (!approved) return false;
        
        // 2. Check jurisdiction-specific compliance
        approved = _checkJurisdictionCompliance(athleteJurisdiction, amount);
        if (!approved) return false;
        
        approved = _checkJurisdictionCompliance(brandJurisdiction, amount);
        if (!approved) return false;
        
        // 3. Check cross-border compliance if applicable
        if (isCrossBorder) {
            approved = _checkCrossBorderCompliance(athleteJurisdiction, brandJurisdiction, amount);
            if (!approved) return false;
            
            emit CrossBorderDealApproved(dealId, athleteJurisdiction, brandJurisdiction, amount);
        }
        
        // 4. Check data protection compliance
        approved = _checkDataProtectionCompliance(athleteJurisdiction, brandJurisdiction);
        if (!approved) return false;
        
        // 5. Regional compliance provider checks
        approved = _performRegionalChecks(dealId, athleteVault, brand, athleteJurisdiction);
        
        return approved;
    }

    /**
     * @notice Add new jurisdiction configuration
     */
    function addJurisdiction(
        string memory code,
        string memory name,
        uint256 tier,
        uint256 maxDeal,
        uint256 maxDaily,
        bool crossBorder,
        bool dataProcessing
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _addJurisdiction(code, name, tier, maxDeal, maxDaily, crossBorder, dataProcessing);
    }

    /**
     * @notice Add cross-border rule between jurisdictions
     */
    function addCrossBorderRule(
        string memory from,
        string memory to,
        bool allowed,
        uint256 maxAmount,
        uint256 additionalChecks,
        uint256 processHours,
        string[] memory requiredDocs
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        bytes32 ruleKey = keccak256(abi.encodePacked(from, to));
        
        crossBorderRules[ruleKey] = CrossBorderRule({
            fromJurisdiction: from,
            toJurisdiction: to,
            allowed: allowed,
            maxAmount: maxAmount,
            additionalChecksRequired: additionalChecks,
            processingTimeHours: processHours,
            requiredDocuments: requiredDocs
        });
    }

    /**
     * @notice Add regional compliance provider
     */
    function addComplianceProvider(
        string memory providerName,
        address providerContract,
        string[] memory supportedJurisdictions,
        string[] memory serviceTypes,
        uint256 responseSLA
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        bytes32 providerKey = keccak256(bytes(providerName));
        
        complianceProviders[providerKey] = RegionalComplianceProvider({
            providerName: providerName,
            providerContract: providerContract,
            supportedJurisdictions: supportedJurisdictions,
            serviceTypes: serviceTypes,
            active: true,
            responseTimeSLA: responseSLA
        });
        
        emit RegionalComplianceProviderAdded("", providerName, providerContract);
    }

    /**
     * @notice Get jurisdiction configuration
     */
    function getJurisdictionConfig(string memory code) 
        external 
        view 
        returns (JurisdictionConfig memory) 
    {
        return jurisdictionConfigs[code];
    }

    /**
     * @notice Check if cross-border deal is allowed
     */
    function isCrossBorderAllowed(
        string memory fromJurisdiction, 
        string memory toJurisdiction,
        uint256 amount
    ) external view returns (bool allowed, uint256 processingTime) {
        bytes32 ruleKey = keccak256(abi.encodePacked(fromJurisdiction, toJurisdiction));
        CrossBorderRule memory rule = crossBorderRules[ruleKey];
        
        allowed = rule.allowed && amount <= rule.maxAmount;
        processingTime = rule.processingTimeHours;
    }

    /**
     * @notice Get supported jurisdictions
     */
    function getSupportedJurisdictions() external view returns (string[] memory) {
        return supportedJurisdictions;
    }

    // Internal functions
    function _addJurisdiction(
        string memory code,
        string memory name,
        uint256 tier,
        uint256 maxDeal,
        uint256 maxDaily,
        bool crossBorder,
        bool dataProcessing
    ) internal {
        jurisdictionConfigs[code] = JurisdictionConfig({
            jurisdictionCode: code,
            jurisdictionName: name,
            complianceAdapter: address(0), // Set later when adapter deployed
            complianceTier: tier,
            maxDealAmount: maxDeal,
            maxDailyVolume: maxDaily,
            crossBorderEnabled: crossBorder,
            dataProcessingAllowed: dataProcessing,
            regulatoryFramework: keccak256(bytes(string.concat("framework_", code))),
            active: true
        });
        
        if (!jurisdictionExists[code]) {
            supportedJurisdictions.push(code);
            jurisdictionExists[code] = true;
            approvedJurisdictions[code] = true; // Add to parent contract mapping
        }
        
        emit JurisdictionAdded(code, address(0), tier);
    }

    function _checkJurisdictionCompliance(
        string memory jurisdiction, 
        uint256 amount
    ) internal view returns (bool) {
        JurisdictionConfig memory config = jurisdictionConfigs[jurisdiction];
        
        if (!config.active) return false;
        if (amount > config.maxDealAmount) return false;
        
        return true;
    }

    function _checkCrossBorderCompliance(
        string memory fromJurisdiction,
        string memory toJurisdiction, 
        uint256 amount
    ) internal view returns (bool) {
        bytes32 ruleKey = keccak256(abi.encodePacked(fromJurisdiction, toJurisdiction));
        CrossBorderRule memory rule = crossBorderRules[ruleKey];
        
        if (!rule.allowed) return false;
        if (amount > rule.maxAmount) return false;
        
        // Check if both jurisdictions allow cross-border
        JurisdictionConfig memory fromConfig = jurisdictionConfigs[fromJurisdiction];
        JurisdictionConfig memory toConfig = jurisdictionConfigs[toJurisdiction];
        
        return fromConfig.crossBorderEnabled && toConfig.crossBorderEnabled;
    }

    function _checkDataProtectionCompliance(
        string memory athleteJurisdiction,
        string memory brandJurisdiction
    ) internal view returns (bool) {
        DataProtectionRule memory athleteRule = dataProtectionRules[athleteJurisdiction];
        DataProtectionRule memory brandRule = dataProtectionRules[brandJurisdiction];
        
        // If dealing with EU jurisdiction, ensure GDPR compliance
        if (athleteRule.gdprApplicable || brandRule.gdprApplicable) {
            // Check if cross-border data transfer is allowed
            if (keccak256(bytes(athleteJurisdiction)) != keccak256(bytes(brandJurisdiction))) {
                return athleteRule.crossBorderDataTransferAllowed && brandRule.crossBorderDataTransferAllowed;
            }
        }
        
        return true;
    }

    function _performRegionalChecks(
        bytes32 dealId,
        address athleteVault,
        address brand,
        string memory jurisdiction
    ) internal returns (bool) {
        // This would integrate with regional compliance providers
        // For now, return true for basic implementation
        return true;
    }

    function _initializeCrossBorderRules() internal {
        // US ↔ EU
        bytes32 usEu = keccak256(abi.encodePacked("US", "EU"));
        crossBorderRules[usEu] = CrossBorderRule({
            fromJurisdiction: "US",
            toJurisdiction: "EU", 
            allowed: true,
            maxAmount: 250000 * 1e18, // $250k limit for enhanced scrutiny
            additionalChecksRequired: 7, // Binary: KYC+AML+Sanctions+TaxReporting
            processingTimeHours: 72,
            requiredDocuments: new string[](0)
        });
        
        // Similar rules for other major corridors...
        // This is a simplified implementation - real world would have many more rules
    }

    function _initializeDataProtectionRules() internal {
        // EU GDPR Rules
        dataProtectionRules["EU"] = DataProtectionRule({
            jurisdiction: "EU",
            gdprApplicable: true,
            ccpaApplicable: false,
            pipdaApplicable: false,
            dataRetentionDays: 2555, // 7 years
            crossBorderDataTransferAllowed: false, // Strict by default
            permittedDataCategories: new string[](0),
            consentRequirements: "explicit_consent_required"
        });
        
        // US Rules (varies by state, simplified here)
        dataProtectionRules["US"] = DataProtectionRule({
            jurisdiction: "US",
            gdprApplicable: false,
            ccpaApplicable: true,
            pipdaApplicable: false,
            dataRetentionDays: 2555,
            crossBorderDataTransferAllowed: true,
            permittedDataCategories: new string[](0),
            consentRequirements: "opt_out_available"
        });
        
        // Canada PIPDA Rules  
        dataProtectionRules["CA"] = DataProtectionRule({
            jurisdiction: "CA",
            gdprApplicable: false,
            ccpaApplicable: false,
            pipdaApplicable: true,
            dataRetentionDays: 2555,
            crossBorderDataTransferAllowed: true,
            permittedDataCategories: new string[](0),
            consentRequirements: "meaningful_consent_required"
        });
    }
}