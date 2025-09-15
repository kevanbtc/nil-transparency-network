// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PlatformAdapterBase.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title OpendorseAdapter
 * @notice Opendorse platform integration adapter
 * @dev Maps Opendorse webhooks/APIs to ContractNFT + ComplianceRegistry updates + NILVault hooks
 */
contract OpendorseAdapter is PlatformAdapterBase {
    using ECDSA for bytes32;
    using Strings for uint256;

    // Opendorse-specific events
    event OpendorseDealCreated(
        string indexed opendorseDealId,
        bytes32 indexed internalDealId,
        address athlete,
        address brand,
        string dealType
    );

    event OpendorseMetricsReceived(
        string indexed opendorseDealId,
        uint256 cpm,
        uint256 estimatedValue,
        string postType
    );

    event OpendorseComplianceUpdated(
        string indexed opendorseDealId,
        string complianceStatus,
        string schoolApprovalStatus
    );

    // Opendorse-specific structs
    struct OpendorseDealData {
        string dealType;           // "social_post", "appearance", "endorsement"
        string postType;           // "feed_post", "story", "reel", "tiktok"
        string schoolName;
        string schoolApprovalStatus; // "pending", "approved", "rejected"
        string complianceStatus;   // "compliant", "under_review", "violation"
        uint256 cpm;               // Cost per mille (cost per 1000 impressions)
        uint256 estimatedValue;    // Opendorse estimated value
        uint256 followerCount;
        string contentGuidelines;
        mapping(string => string) brandRequirements;
    }

    // Opendorse webhook event types
    enum OpendorseEventType {
        DEAL_CREATED,
        DEAL_APPROVED,
        DEAL_COMPLETED,
        POST_PUBLISHED,
        METRICS_UPDATED,
        COMPLIANCE_UPDATED
    }

    mapping(string => OpendorseDealData) public opendorseDeals;
    mapping(OpendorseEventType => bool) public supportedEventTypes;
    
    // Opendorse API configuration
    string public opendorseApiEndpoint;
    string public opendorseWebhookVersion;

    constructor(
        address _nilVault,
        address _contractNFT,
        address _complianceRegistry,
        string memory _apiEndpoint
    ) PlatformAdapterBase(
        "Opendorse",
        "1.0.0",
        _nilVault,
        _contractNFT,
        _complianceRegistry
    ) {
        opendorseApiEndpoint = _apiEndpoint;
        opendorseWebhookVersion = "v2.1";
        
        // Enable supported event types
        supportedEventTypes[OpendorseEventType.DEAL_CREATED] = true;
        supportedEventTypes[OpendorseEventType.DEAL_APPROVED] = true;
        supportedEventTypes[OpendorseEventType.DEAL_COMPLETED] = true;
        supportedEventTypes[OpendorseEventType.POST_PUBLISHED] = true;
        supportedEventTypes[OpendorseEventType.METRICS_UPDATED] = true;
        supportedEventTypes[OpendorseEventType.COMPLIANCE_UPDATED] = true;
    }

    /**
     * @notice Process Opendorse webhook
     * @param source Webhook source (should be validated)
     * @param payload Webhook payload
     * @param signature Webhook signature for verification
     */
    function processWebhook(
        string memory source,
        bytes memory payload,
        string memory signature
    ) external override onlyRole(PLATFORM_ROLE) whenNotPaused {
        require(validWebhookSources[source], "Invalid webhook source");
        require(validateWebhookSignature(payload, signature), "Invalid signature");

        // Decode payload (simplified JSON parsing)
        OpendorseWebhookData memory webhookData = _decodeOpendorseWebhook(payload);
        
        _processOpendorseEvent(webhookData);
    }

    /**
     * @notice Import Opendorse deal with platform-specific data
     * @param opendorseDealId Opendorse deal ID
     * @param athleteAddress Athlete's vault address
     * @param brandAddress Brand address
     * @param amount Deal amount in wei
     * @param dealType Type of deal
     * @param postType Type of post
     * @param schoolName School name
     * @param followerCount Athlete's follower count
     * @param contentGuidelines Content requirements
     */
    function importOpendorseDeal(
        string memory opendorseDealId,
        address athleteAddress,
        address brandAddress,
        uint256 amount,
        string memory dealType,
        string memory postType,
        string memory schoolName,
        uint256 followerCount,
        string memory contentGuidelines
    ) external onlyRole(PLATFORM_ROLE) returns (bytes32 dealId) {
        // Set up metadata arrays
        string[] memory metadataKeys = new string[](5);
        string[] memory metadataValues = new string[](5);
        
        metadataKeys[0] = "dealType";
        metadataValues[0] = dealType;
        metadataKeys[1] = "postType";
        metadataValues[1] = postType;
        metadataKeys[2] = "schoolName";
        metadataValues[2] = schoolName;
        metadataKeys[3] = "followerCount";
        metadataValues[3] = followerCount.toString();
        metadataKeys[4] = "contentGuidelines";
        metadataValues[4] = contentGuidelines;

        // Import deal using base functionality
        dealId = importDeal(
            opendorseDealId,
            athleteAddress,
            brandAddress,
            amount,
            dealType,
            contentGuidelines,
            metadataKeys,
            metadataValues
        );

        // Store Opendorse-specific data
        OpendorseDealData storage opendorseData = opendorseDeals[opendorseDealId];
        opendorseData.dealType = dealType;
        opendorseData.postType = postType;
        opendorseData.schoolName = schoolName;
        opendorseData.schoolApprovalStatus = "pending";
        opendorseData.complianceStatus = "under_review";
        opendorseData.followerCount = followerCount;
        opendorseData.contentGuidelines = contentGuidelines;
        opendorseData.estimatedValue = _calculateOpendorseValue(followerCount, dealType);

        emit OpendorseDealCreated(opendorseDealId, dealId, athleteAddress, brandAddress, dealType);

        return dealId;
    }

    /**
     * @notice Update Opendorse-specific metrics
     * @param opendorseDealId Opendorse deal ID
     * @param cpm Cost per mille
     * @param actualValue Actual performance value
     * @param engagementMetrics Engagement data
     */
    function updateOpendorseMetrics(
        string memory opendorseDealId,
        uint256 cpm,
        uint256 actualValue,
        uint256[6] memory engagementMetrics // [views, likes, shares, comments, saves, reach]
    ) external onlyRole(PLATFORM_ROLE) {
        OpendorseDealData storage opendorseData = opendorseDeals[opendorseDealId];
        opendorseData.cpm = cpm;
        opendorseData.estimatedValue = actualValue;

        // Update base metrics
        updateMetrics(
            opendorseDealId,
            engagementMetrics[0], // views
            engagementMetrics[1], // likes
            engagementMetrics[2], // shares
            engagementMetrics[3], // comments
            engagementMetrics[5], // reach
            engagementMetrics[5]  // impressions (use reach as proxy)
        );

        emit OpendorseMetricsReceived(opendorseDealId, cpm, actualValue, opendorseData.postType);
    }

    /**
     * @notice Update compliance status from Opendorse
     * @param opendorseDealId Opendorse deal ID
     * @param complianceStatus New compliance status
     * @param schoolApprovalStatus School approval status
     */
    function updateComplianceStatus(
        string memory opendorseDealId,
        string memory complianceStatus,
        string memory schoolApprovalStatus
    ) external onlyRole(PLATFORM_ROLE) {
        OpendorseDealData storage opendorseData = opendorseDeals[opendorseDealId];
        opendorseData.complianceStatus = complianceStatus;
        opendorseData.schoolApprovalStatus = schoolApprovalStatus;

        bytes32 dealId = platformDealIdToInternal[opendorseDealId];
        
        // Trigger compliance check if approved
        if (keccak256(bytes(complianceStatus)) == keccak256(bytes("compliant")) &&
            keccak256(bytes(schoolApprovalStatus)) == keccak256(bytes("approved"))) {
            
            // Update compliance registry
            _updateComplianceRegistry(dealId, true, "Opendorse compliance approved");
        }

        emit OpendorseComplianceUpdated(opendorseDealId, complianceStatus, schoolApprovalStatus);
    }

    /**
     * @notice Calculate platform-specific performance score
     * @param dealId Internal deal ID
     * @return score Performance score (0-10000 basis points)
     */
    function calculatePlatformScore(bytes32 dealId) external view override returns (uint256 score) {
        // Get the platform deal ID
        string memory opendorseDealId = "";
        for (uint256 i = 0; i < importedDeals.length; i++) {
            if (importedDeals[i] == dealId) {
                // Find corresponding Opendorse deal
                // This is simplified - in practice you'd have a reverse mapping
                break;
            }
        }

        // Get metrics
        (uint256 views, uint256 likes, uint256 shares, uint256 comments, uint256 engagementRate,,,) = 
            getMetrics(dealId);

        // Opendorse scoring algorithm
        // Base score from engagement rate
        score = engagementRate; // Already in basis points

        // Bonus for high performance
        if (views > 100000) score += 500;    // 5% bonus for > 100k views
        if (likes > views / 20) score += 300; // 3% bonus for > 5% like rate
        if (comments > views / 50) score += 200; // 2% bonus for > 2% comment rate

        // Cap at 10000 (100%)
        if (score > 10000) score = 10000;

        return score;
    }

    /**
     * @notice Validate Opendorse webhook signature
     * @param payload Webhook payload
     * @param signature Provided signature
     * @return valid Whether signature is valid
     */
    function validateWebhookSignature(
        bytes memory payload,
        string memory signature
    ) internal view override returns (bool valid) {
        // Opendorse uses HMAC-SHA256 for webhook signatures
        // This is a simplified implementation
        bytes32 expectedHash = keccak256(abi.encodePacked(webhookSecret, payload));
        bytes32 providedHash = keccak256(bytes(signature));
        
        return expectedHash == providedHash;
    }

    /**
     * @notice Get Opendorse-specific deal data
     * @param opendorseDealId Opendorse deal ID
     */
    function getOpendorseDealData(string memory opendorseDealId)
        external
        view
        returns (
            string memory dealType,
            string memory postType,
            string memory schoolName,
            string memory schoolApprovalStatus,
            string memory complianceStatus,
            uint256 cpm,
            uint256 estimatedValue,
            uint256 followerCount
        )
    {
        OpendorseDealData storage data = opendorseDeals[opendorseDealId];
        return (
            data.dealType,
            data.postType,
            data.schoolName,
            data.schoolApprovalStatus,
            data.complianceStatus,
            data.cpm,
            data.estimatedValue,
            data.followerCount
        );
    }

    // Internal functions
    struct OpendorseWebhookData {
        OpendorseEventType eventType;
        string dealId;
        address athlete;
        address brand;
        uint256 amount;
        string dealType;
        bytes additionalData;
    }

    function _decodeOpendorseWebhook(bytes memory payload)
        internal
        pure
        returns (OpendorseWebhookData memory)
    {
        // Simplified webhook decoding
        // In practice, this would parse JSON payload
        OpendorseWebhookData memory data;
        data.eventType = OpendorseEventType.DEAL_CREATED;
        data.dealId = "opendorse-123";
        data.athlete = address(0);
        data.brand = address(0);
        data.amount = 0;
        data.dealType = "social_post";
        data.additionalData = payload;
        
        return data;
    }

    function _processOpendorseEvent(OpendorseWebhookData memory webhookData) internal {
        require(supportedEventTypes[webhookData.eventType], "Unsupported event type");

        if (webhookData.eventType == OpendorseEventType.DEAL_CREATED) {
            _processDealCreated(webhookData);
        } else if (webhookData.eventType == OpendorseEventType.POST_PUBLISHED) {
            _processPostPublished(webhookData);
        } else if (webhookData.eventType == OpendorseEventType.METRICS_UPDATED) {
            _processMetricsUpdated(webhookData);
        } else if (webhookData.eventType == OpendorseEventType.COMPLIANCE_UPDATED) {
            _processComplianceUpdated(webhookData);
        }
    }

    function _processDealCreated(OpendorseWebhookData memory webhookData) internal {
        // Auto-import deal from webhook
        // This would extract athlete/brand addresses from the webhook data
        bytes32 dealId = importDeal(
            webhookData.dealId,
            webhookData.athlete,
            webhookData.brand,
            webhookData.amount,
            webhookData.dealType,
            "Opendorse deal",
            new string[](0),
            new string[](0)
        );

        emit OpendorseDealCreated(
            webhookData.dealId,
            dealId,
            webhookData.athlete,
            webhookData.brand,
            webhookData.dealType
        );
    }

    function _processPostPublished(OpendorseWebhookData memory webhookData) internal {
        markDeliverableCompleted(webhookData.dealId, "Post published on social media");
    }

    function _processMetricsUpdated(OpendorseWebhookData memory webhookData) internal {
        // Extract metrics from webhook data and update
        updateMetrics(webhookData.dealId, 0, 0, 0, 0, 0, 0); // Placeholder
    }

    function _processComplianceUpdated(OpendorseWebhookData memory webhookData) internal {
        updateComplianceStatus(webhookData.dealId, "compliant", "approved");
    }

    function _calculateOpendorseValue(uint256 followerCount, string memory dealType)
        internal
        pure
        returns (uint256 estimatedValue)
    {
        // Simplified Opendorse valuation algorithm
        uint256 baseRate = 0.01 ether; // $0.01 per follower as base
        
        if (keccak256(bytes(dealType)) == keccak256(bytes("endorsement"))) {
            baseRate = 0.02 ether; // Higher rate for endorsements
        } else if (keccak256(bytes(dealType)) == keccak256(bytes("appearance"))) {
            baseRate = 0.05 ether; // Highest rate for appearances
        }

        estimatedValue = followerCount * baseRate;
        
        return estimatedValue;
    }

    function _updateComplianceRegistry(bytes32 dealId, bool approved, string memory reason)
        internal
    {
        // This would call the ComplianceRegistry contract
        // For now, emit an event
        emit ComplianceCheckTriggered(dealId, "opendorse", approved, reason);
    }

    // Platform-specific revenue splits for Opendorse deals
    function _getStandardRevenueSplits() internal pure override returns (uint256[] memory) {
        // Opendorse-specific splits: 68% athlete, 15% school, 12% agent, 3% platform, 2% tax
        uint256[] memory splits = new uint256[](5);
        splits[0] = 6800;  // Athlete (slightly lower due to platform value)
        splits[1] = 1500;  // School
        splits[2] = 1200;  // Agent
        splits[3] = 300;   // Opendorse fee
        splits[4] = 200;   // Tax
        return splits;
    }

    // Admin functions
    function updateApiEndpoint(string memory newEndpoint) external onlyRole(ADMIN_ROLE) {
        opendorseApiEndpoint = newEndpoint;
    }

    function updateWebhookVersion(string memory newVersion) external onlyRole(ADMIN_ROLE) {
        opendorseWebhookVersion = newVersion;
    }

    function toggleEventType(OpendorseEventType eventType, bool enabled) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        supportedEventTypes[eventType] = enabled;
    }
}