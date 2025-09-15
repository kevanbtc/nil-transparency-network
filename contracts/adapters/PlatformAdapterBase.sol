// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../NILVault.sol";
import "../ContractNFT.sol";
import "../ComplianceRegistry.sol";

/**
 * @title PlatformAdapterBase
 * @notice Base contract for platform adapters (Opendorse, INFLCR, Basepath, Athliance)
 * @dev Provides common functionality for mapping platform events to NIL contracts
 */
abstract contract PlatformAdapterBase is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Events
    event DealImported(
        bytes32 indexed dealId,
        uint256 indexed contractTokenId,
        address indexed athleteVault,
        address brand,
        uint256 amount,
        string platformSource
    );

    event MetricsUpdated(
        bytes32 indexed dealId,
        string metricType,
        uint256 value,
        uint256 timestamp
    );

    event DeliverableCompleted(
        bytes32 indexed dealId,
        string deliverableType,
        string evidence,
        uint256 timestamp
    );

    event ComplianceCheckTriggered(
        bytes32 indexed dealId,
        string checkType,
        bool passed,
        string reason
    );

    // Structs
    struct PlatformDeal {
        bytes32 dealId;
        string platformDealId;      // Platform's internal deal ID
        address athleteVault;
        address brand;
        uint256 amount;
        string deliverableType;     // "post", "story", "video", "stream", etc.
        string deliverableDescription;
        mapping(string => string) metadata; // Platform-specific metadata
        uint256 createdAt;
        uint256 updatedAt;
        bool imported;
        bool completed;
    }

    struct PlatformMetrics {
        uint256 views;
        uint256 likes;
        uint256 shares;
        uint256 comments;
        uint256 engagementRate; // In basis points
        uint256 reach;
        uint256 impressions;
        uint256 clickThroughRate; // In basis points
        mapping(string => uint256) customMetrics;
    }

    // State variables
    NILVault public nilVaultImplementation;
    ContractNFT public contractNFT;
    ComplianceRegistry public complianceRegistry;
    
    string public platformName;
    string public platformVersion;
    
    mapping(bytes32 => PlatformDeal) public platformDeals;
    mapping(bytes32 => PlatformMetrics) public dealMetrics;
    mapping(bytes32 => uint256) public dealToTokenId; // dealId => contractTokenId
    mapping(string => bytes32) public platformDealIdToInternal; // platform ID => internal ID
    
    bytes32[] public importedDeals;

    // Webhook signature verification
    mapping(string => bool) public validWebhookSources;
    string public webhookSecret;

    constructor(
        string memory _platformName,
        string memory _platformVersion,
        address _nilVault,
        address _contractNFT,
        address _complianceRegistry
    ) {
        platformName = _platformName;
        platformVersion = _platformVersion;
        nilVaultImplementation = NILVault(_nilVault);
        contractNFT = ContractNFT(_contractNFT);
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Import a deal from the platform
     * @param platformDealId Platform's deal identifier
     * @param athleteAddress Athlete's address
     * @param brandAddress Brand's address
     * @param amount Deal amount
     * @param deliverableType Type of deliverable
     * @param deliverableDescription Description of deliverable
     * @param metadata Additional platform-specific metadata
     */
    function importDeal(
        string memory platformDealId,
        address athleteAddress,
        address brandAddress,
        uint256 amount,
        string memory deliverableType,
        string memory deliverableDescription,
        string[] memory metadataKeys,
        string[] memory metadataValues
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused returns (bytes32 dealId) {
        require(athleteAddress != address(0), "Invalid athlete address");
        require(brandAddress != address(0), "Invalid brand address");
        require(amount > 0, "Invalid amount");
        require(metadataKeys.length == metadataValues.length, "Metadata arrays mismatch");

        // Check if deal already exists
        dealId = platformDealIdToInternal[platformDealId];
        if (dealId != bytes32(0)) {
            require(!platformDeals[dealId].imported, "Deal already imported");
        } else {
            dealId = keccak256(abi.encodePacked(
                platformName,
                platformDealId,
                athleteAddress,
                brandAddress,
                block.timestamp
            ));
        }

        // Create platform deal record
        PlatformDeal storage deal = platformDeals[dealId];
        deal.dealId = dealId;
        deal.platformDealId = platformDealId;
        deal.athleteVault = athleteAddress; // Assume this is the vault address
        deal.brand = brandAddress;
        deal.amount = amount;
        deal.deliverableType = deliverableType;
        deal.deliverableDescription = deliverableDescription;
        deal.createdAt = block.timestamp;
        deal.updatedAt = block.timestamp;
        deal.imported = false;
        deal.completed = false;

        // Store metadata
        for (uint256 i = 0; i < metadataKeys.length; i++) {
            deal.metadata[metadataKeys[i]] = metadataValues[i];
        }

        platformDealIdToInternal[platformDealId] = dealId;
        importedDeals.push(dealId);

        // Create NIL contract NFT
        uint256 tokenId = _createNILContract(dealId, deal);
        dealToTokenId[dealId] = tokenId;

        // Trigger compliance check
        _triggerComplianceCheck(dealId);

        deal.imported = true;

        emit DealImported(dealId, tokenId, athleteAddress, brandAddress, amount, platformName);
        
        return dealId;
    }

    /**
     * @notice Update metrics for a deal
     * @param platformDealId Platform's deal identifier
     * @param views Number of views
     * @param likes Number of likes
     * @param shares Number of shares
     * @param comments Number of comments
     * @param reach Total reach
     * @param impressions Total impressions
     */
    function updateMetrics(
        string memory platformDealId,
        uint256 views,
        uint256 likes,
        uint256 shares,
        uint256 comments,
        uint256 reach,
        uint256 impressions
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused {
        bytes32 dealId = platformDealIdToInternal[platformDealId];
        require(dealId != bytes32(0), "Deal not found");

        PlatformMetrics storage metrics = dealMetrics[dealId];
        metrics.views = views;
        metrics.likes = likes;
        metrics.shares = shares;
        metrics.comments = comments;
        metrics.reach = reach;
        metrics.impressions = impressions;

        // Calculate engagement rate (likes + shares + comments) / views * 10000
        if (views > 0) {
            metrics.engagementRate = ((likes + shares + comments) * 10000) / views;
        }

        // Calculate CTR if applicable
        if (impressions > 0) {
            metrics.clickThroughRate = (views * 10000) / impressions;
        }

        emit MetricsUpdated(dealId, "engagement", metrics.engagementRate, block.timestamp);
    }

    /**
     * @notice Mark deliverable as completed
     * @param platformDealId Platform's deal identifier
     * @param evidence Evidence of completion (URL, IPFS hash, etc.)
     */
    function markDeliverableCompleted(
        string memory platformDealId,
        string memory evidence
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused {
        bytes32 dealId = platformDealIdToInternal[platformDealId];
        require(dealId != bytes32(0), "Deal not found");

        PlatformDeal storage deal = platformDeals[dealId];
        deal.completed = true;
        deal.updatedAt = block.timestamp;

        emit DeliverableCompleted(dealId, deal.deliverableType, evidence, block.timestamp);

        // Notify DeliverablesOracleRouter if needed
        _notifyDeliverableCompletion(dealId, evidence);
    }

    /**
     * @notice Get deal information
     * @param dealId Internal deal ID
     */
    function getDeal(bytes32 dealId)
        external
        view
        returns (
            string memory platformDealId,
            address athleteVault,
            address brand,
            uint256 amount,
            string memory deliverableType,
            string memory deliverableDescription,
            bool imported,
            bool completed,
            uint256 createdAt
        )
    {
        PlatformDeal storage deal = platformDeals[dealId];
        return (
            deal.platformDealId,
            deal.athleteVault,
            deal.brand,
            deal.amount,
            deal.deliverableType,
            deal.deliverableDescription,
            deal.imported,
            deal.completed,
            deal.createdAt
        );
    }

    /**
     * @notice Get metrics for a deal
     * @param dealId Internal deal ID
     */
    function getMetrics(bytes32 dealId)
        external
        view
        returns (
            uint256 views,
            uint256 likes,
            uint256 shares,
            uint256 comments,
            uint256 engagementRate,
            uint256 reach,
            uint256 impressions,
            uint256 clickThroughRate
        )
    {
        PlatformMetrics storage metrics = dealMetrics[dealId];
        return (
            metrics.views,
            metrics.likes,
            metrics.shares,
            metrics.comments,
            metrics.engagementRate,
            metrics.reach,
            metrics.impressions,
            metrics.clickThroughRate
        );
    }

    /**
     * @notice Add valid webhook source
     * @param source Webhook source identifier
     */
    function addWebhookSource(string memory source) external onlyRole(ADMIN_ROLE) {
        validWebhookSources[source] = true;
    }

    /**
     * @notice Remove webhook source
     * @param source Webhook source identifier
     */
    function removeWebhookSource(string memory source) external onlyRole(ADMIN_ROLE) {
        validWebhookSources[source] = false;
    }

    /**
     * @notice Set webhook secret for signature verification
     * @param secret Webhook secret
     */
    function setWebhookSecret(string memory secret) external onlyRole(ADMIN_ROLE) {
        webhookSecret = secret;
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Internal functions
    function _createNILContract(bytes32 dealId, PlatformDeal storage deal)
        internal
        returns (uint256 tokenId)
    {
        // Create contract terms IPFS hash (simplified)
        string memory termsIPFS = string(abi.encodePacked(
            "QmNILContract-",
            platformName,
            "-",
            deal.platformDealId
        ));

        // Standard revenue splits for the platform
        uint256[] memory revenueSplits = _getStandardRevenueSplits();
        address[] memory beneficiaries = _getStandardBeneficiaries(deal.athleteVault, deal.brand);

        // This would call the ContractNFT to mint a new contract
        // For now, we'll return a placeholder tokenId
        tokenId = uint256(dealId); // Simplified mapping
        
        return tokenId;
    }

    function _triggerComplianceCheck(bytes32 dealId) internal {
        // This would call ComplianceRegistry to perform automated checks
        // For now, we'll emit an event
        emit ComplianceCheckTriggered(dealId, "automatic", true, "Basic checks passed");
    }

    function _notifyDeliverableCompletion(bytes32 dealId, string memory evidence) internal {
        // This would notify DeliverablesOracleRouter
        // For now, we'll emit an event
        emit DeliverableCompleted(dealId, platformDeals[dealId].deliverableType, evidence, block.timestamp);
    }

    function _getStandardRevenueSplits() internal view virtual returns (uint256[] memory) {
        // Default splits: 70% athlete, 15% school, 10% agent, 3% platform, 2% tax
        uint256[] memory splits = new uint256[](5);
        splits[0] = 7000;  // Athlete
        splits[1] = 1500;  // School
        splits[2] = 1000;  // Agent
        splits[3] = 300;   // Platform
        splits[4] = 200;   // Tax
        return splits;
    }

    function _getStandardBeneficiaries(address athleteVault, address brand)
        internal
        view
        virtual
        returns (address[] memory)
    {
        address[] memory beneficiaries = new address[](5);
        beneficiaries[0] = athleteVault;   // Athlete vault
        beneficiaries[1] = address(0);     // School (to be set)
        beneficiaries[2] = address(0);     // Agent (to be set)
        beneficiaries[3] = address(this);  // Platform adapter
        beneficiaries[4] = address(this);  // Tax escrow
        return beneficiaries;
    }

    // Abstract functions for platform-specific implementations
    function processWebhook(
        string memory source,
        bytes memory payload,
        string memory signature
    ) external virtual;

    function validateWebhookSignature(
        bytes memory payload,
        string memory signature
    ) internal view virtual returns (bool);

    // Platform-specific metric calculations
    function calculatePlatformScore(bytes32 dealId) external view virtual returns (uint256);

    // Emergency functions
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {
        // Allow contract to receive ETH
    }
}