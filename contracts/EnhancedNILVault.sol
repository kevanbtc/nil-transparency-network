// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./NILVault.sol";
import "./MultiJurisdictionCompliance.sol";
import "./MultiCurrencyHandler.sol";

/**
 * @title EnhancedNILVault
 * @notice Enhanced NIL Vault with reputation scoring, performance metrics, and global compliance
 * @dev Extends base NILVault with reputation oracle, multi-currency support, and enhanced proof-of-work
 */
contract EnhancedNILVault is NILVault {
    
    // Events
    event ReputationScoreUpdated(
        address indexed athlete,
        uint256 indexed newScore,
        uint256 indexed previousScore,
        string reason
    );
    
    event PerformanceMetricUpdated(
        address indexed athlete,
        string indexed metricType,
        uint256 value,
        uint256 timestamp
    );
    
    event CommunityValidation(
        address indexed athlete,
        address indexed validator,
        bool approved,
        string reason,
        uint256 timestamp
    );
    
    event ProofOfWorkSubmitted(
        bytes32 indexed proofId,
        address indexed athlete,
        string indexed proofType,
        bytes32 evidenceHash,
        uint256 timestamp
    );

    event DealAccessControlled(
        bytes32 indexed dealId,
        address indexed athlete,
        bool accessGranted,
        string reason
    );

    event FanEngagementReward(
        address indexed athlete,
        address indexed fan,
        uint256 engagementScore,
        uint256 rewardAmount
    );

    // Structs
    struct ReputationProfile {
        uint256 overallScore; // 0-1000 reputation score
        uint256 performanceScore; // Athletic performance score 
        uint256 engagementScore; // Fan engagement and social metrics
        uint256 reliabilityScore; // Deal completion and brand satisfaction
        uint256 communityScore; // Community validation score
        uint256 lastUpdated;
        uint256 totalDealsCompleted;
        uint256 avgDealSatisfaction; // 0-100 scale
        uint256 socialFollowersCount;
        uint256 engagementRate; // Social engagement rate (basis points)
        bool verified; // Verified athlete status
    }

    struct PerformanceMetric {
        string metricType; // "wins", "points_scored", "assists", etc.
        uint256 value;
        uint256 season; // Season or time period
        string league; // "NCAA", "NFL", "NBA", etc.
        bytes32 verificationHash; // Hash of verification documents
        address verifier; // Who verified this metric
        uint256 timestamp;
        bool verified;
    }

    struct CommunityValidation {
        address validator;
        bool approved;
        string reason;
        uint256 timestamp;
        uint256 validatorReputation; // Reputation of the validator
        uint256 weight; // Weight of this validation
    }

    struct ProofOfWork {
        bytes32 proofId;
        address athlete;
        string proofType; // "social_post", "brand_content", "appearance", "training"
        bytes32 evidenceHash; // IPFS hash of evidence
        string description;
        uint256 timestamp;
        bool verified;
        address verifier;
        uint256 rewardAmount; // NIL tokens earned for this proof
    }

    struct EngagementMetrics {
        uint256 totalLikes;
        uint256 totalShares;
        uint256 totalComments;
        uint256 totalViews;
        uint256 followerGrowth;
        uint256 brandMentions;
        uint256 positivesentiment; // 0-100 scale
        uint256 lastUpdated;
    }

    struct DealAccessRequirement {
        uint256 minimumReputation; // Minimum reputation score required
        uint256 minimumPerformance; // Minimum performance score
        uint256 minimumEngagement; // Minimum engagement score
        uint256 minimumDealsCompleted; // Minimum completed deals
        bool requiresVerification; // Requires verified athlete status
        string[] requiredMetrics; // Required performance metrics
    }

    // State variables
    MultiJurisdictionCompliance public complianceContract;
    MultiCurrencyHandler public currencyHandler;
    
    mapping(address => ReputationProfile) public reputationProfiles;
    mapping(address => mapping(string => PerformanceMetric)) public performanceMetrics;
    mapping(address => mapping(address => CommunityValidation)) public communityValidations;
    mapping(bytes32 => ProofOfWork) public proofsOfWork;
    mapping(address => EngagementMetrics) public engagementMetrics;
    mapping(address => bytes32[]) public athleteProofs; // Athlete => ProofOfWork IDs
    
    // Reputation weights (basis points)
    uint256 public performanceWeight = 3000; // 30%
    uint256 public engagementWeight = 2500;  // 25%
    uint256 public reliabilityWeight = 3000; // 30%
    uint256 public communityWeight = 1500;   // 15%
    
    // Access control for deals based on reputation
    mapping(bytes32 => DealAccessRequirement) public dealAccessRequirements;
    
    // Community validators with reputation scores
    mapping(address => uint256) public validatorReputations;
    mapping(address => bool) public authorizedValidators;
    
    // Proof of work rewards pool
    mapping(string => uint256) public proofRewards; // proofType => reward amount
    
    constructor(
        address _athlete,
        address _nilProtocol,
        address _complianceRegistry,
        address _multiJurisdictionCompliance,
        address _multiCurrencyHandler
    ) NILVault(_athlete, _nilProtocol, _complianceRegistry) {
        complianceContract = MultiJurisdictionCompliance(_multiJurisdictionCompliance);
        currencyHandler = MultiCurrencyHandler(_multiCurrencyHandler);
        
        // Initialize reputation profile for athlete
        _initializeReputationProfile();
        
        // Initialize proof of work rewards
        _initializeProofRewards();
    }

    /**
     * @notice Update athlete's reputation score based on various factors
     */
    function updateReputationScore() external {
        address athlete = owner();
        ReputationProfile storage profile = reputationProfiles[athlete];
        
        // Calculate component scores
        uint256 perfScore = _calculatePerformanceScore(athlete);
        uint256 engScore = _calculateEngagementScore(athlete);
        uint256 relScore = _calculateReliabilityScore(athlete);
        uint256 commScore = _calculateCommunityScore(athlete);
        
        // Update component scores
        profile.performanceScore = perfScore;
        profile.engagementScore = engScore;
        profile.reliabilityScore = relScore;
        profile.communityScore = commScore;
        
        // Calculate weighted overall score
        uint256 previousScore = profile.overallScore;
        profile.overallScore = (
            (perfScore * performanceWeight) +
            (engScore * engagementWeight) +
            (relScore * reliabilityWeight) +
            (commScore * communityWeight)
        ) / 10000;
        
        profile.lastUpdated = block.timestamp;
        
        emit ReputationScoreUpdated(athlete, profile.overallScore, previousScore, "Automated update");
    }

    /**
     * @notice Submit performance metric for athlete
     */
    function submitPerformanceMetric(
        string memory metricType,
        uint256 value,
        uint256 season,
        string memory league,
        bytes32 verificationHash
    ) external onlyOwner {
        address athlete = owner();
        
        performanceMetrics[athlete][metricType] = PerformanceMetric({
            metricType: metricType,
            value: value,
            season: season,
            league: league,
            verificationHash: verificationHash,
            verifier: address(0), // Will be set by verifier
            timestamp: block.timestamp,
            verified: false
        });
        
        emit PerformanceMetricUpdated(athlete, metricType, value, block.timestamp);
    }

    /**
     * @notice Submit proof of work for NIL activities
     */
    function submitProofOfWork(
        string memory proofType,
        bytes32 evidenceHash,
        string memory description
    ) external onlyOwner returns (bytes32 proofId) {
        address athlete = owner();
        
        proofId = keccak256(abi.encodePacked(
            athlete,
            proofType,
            evidenceHash,
            block.timestamp
        ));
        
        proofsOfWork[proofId] = ProofOfWork({
            proofId: proofId,
            athlete: athlete,
            proofType: proofType,
            evidenceHash: evidenceHash,
            description: description,
            timestamp: block.timestamp,
            verified: false,
            verifier: address(0),
            rewardAmount: 0
        });
        
        athleteProofs[athlete].push(proofId);
        
        emit ProofOfWorkSubmitted(proofId, athlete, proofType, evidenceHash, block.timestamp);
        
        // Automatically reward for certain proof types
        _processProofReward(proofId, proofType);
    }

    /**
     * @notice Community validation of athlete performance/behavior
     */
    function submitCommunityValidation(
        address athlete,
        bool approved,
        string memory reason
    ) external {
        require(authorizedValidators[msg.sender] || validatorReputations[msg.sender] > 500, "Unauthorized validator");
        
        communityValidations[athlete][msg.sender] = CommunityValidation({
            validator: msg.sender,
            approved: approved,
            reason: reason,
            timestamp: block.timestamp,
            validatorReputation: validatorReputations[msg.sender],
            weight: _calculateValidatorWeight(msg.sender)
        });
        
        emit CommunityValidation(athlete, msg.sender, approved, reason, block.timestamp);
    }

    /**
     * @notice Create NIL deal with reputation-based access control
     */
    function createReputationGatedNILDeal(
        address brand,
        uint256 amount,
        string memory currency,
        string memory deliverables,
        string memory termsIPFS,
        uint256[] memory revenueSplits,
        address[] memory beneficiaries,
        string memory athleteJurisdiction,
        string memory brandJurisdiction,
        uint256 minReputation
    ) external onlyAuthorizedPlatform returns (bytes32 dealId) {
        address athlete = owner();
        
        // Check reputation requirements
        require(_checkReputationRequirements(athlete, minReputation), "Reputation requirements not met");
        
        // Convert currency to base amount for deal creation
        uint256 baseAmount;
        if (keccak256(bytes(currency)) != keccak256(bytes("ETH"))) {
            baseAmount = currencyHandler.calculateConversion(currency, "ETH", amount);
        } else {
            baseAmount = amount;
        }
        
        // Create the deal using enhanced compliance check
        dealId = _createEnhancedDeal(
            brand,
            baseAmount,
            deliverables,
            termsIPFS,
            revenueSplits,
            beneficiaries,
            athleteJurisdiction,
            brandJurisdiction
        );
        
        emit DealAccessControlled(dealId, athlete, true, "Reputation requirements met");
    }

    /**
     * @notice Update engagement metrics from social platforms
     */
    function updateEngagementMetrics(
        uint256 likes,
        uint256 shares,
        uint256 comments,
        uint256 views,
        uint256 followerGrowth,
        uint256 brandMentions,
        uint256 sentiment
    ) external onlyAuthorizedPlatform {
        address athlete = owner();
        
        engagementMetrics[athlete] = EngagementMetrics({
            totalLikes: likes,
            totalShares: shares,
            totalComments: comments,
            totalViews: views,
            followerGrowth: followerGrowth,
            brandMentions: brandMentions,
            positivesentiment: sentiment,
            lastUpdated: block.timestamp
        });
        
        // Update reputation profile social metrics
        ReputationProfile storage profile = reputationProfiles[athlete];
        profile.socialFollowersCount = likes + shares + comments; // Simplified calculation
        profile.engagementRate = (shares + comments) * 10000 / (likes + 1); // Basis points
    }

    /**
     * @notice Verify performance metric
     */
    function verifyPerformanceMetric(
        address athlete,
        string memory metricType
    ) external onlyAuthorizedPlatform {
        PerformanceMetric storage metric = performanceMetrics[athlete][metricType];
        require(metric.timestamp > 0, "Metric does not exist");
        
        metric.verified = true;
        metric.verifier = msg.sender;
    }

    /**
     * @notice Verify proof of work and distribute rewards
     */
    function verifyProofOfWork(bytes32 proofId) external onlyAuthorizedPlatform {
        ProofOfWork storage proof = proofsOfWork[proofId];
        require(proof.timestamp > 0, "Proof does not exist");
        require(!proof.verified, "Proof already verified");
        
        proof.verified = true;
        proof.verifier = msg.sender;
        
        // Distribute reward
        uint256 rewardAmount = proofRewards[proof.proofType];
        if (rewardAmount > 0) {
            proof.rewardAmount = rewardAmount;
            // Transfer NIL tokens to athlete (implementation depends on token contract)
            // This would be integrated with the NIL token distribution system
        }
    }

    /**
     * @notice Get athlete's full reputation profile
     */
    function getReputationProfile(address athlete) 
        external 
        view 
        returns (ReputationProfile memory) 
    {
        return reputationProfiles[athlete];
    }

    /**
     * @notice Get athlete's proof of work history
     */
    function getAthleteProofs(address athlete) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return athleteProofs[athlete];
    }

    /**
     * @notice Check if athlete meets reputation requirements for a deal
     */
    function checkReputationRequirements(
        address athlete,
        uint256 minReputation
    ) external view returns (bool) {
        return _checkReputationRequirements(athlete, minReputation);
    }

    // Internal functions
    function _initializeReputationProfile() internal {
        address athlete = owner();
        
        reputationProfiles[athlete] = ReputationProfile({
            overallScore: 500, // Start with middle score
            performanceScore: 500,
            engagementScore: 500,
            reliabilityScore: 500,
            communityScore: 500,
            lastUpdated: block.timestamp,
            totalDealsCompleted: 0,
            avgDealSatisfaction: 50,
            socialFollowersCount: 0,
            engagementRate: 0,
            verified: false
        });
    }

    function _initializeProofRewards() internal {
        proofRewards["social_post"] = 10 * 1e18; // 10 NIL tokens
        proofRewards["brand_content"] = 25 * 1e18; // 25 NIL tokens
        proofRewards["appearance"] = 50 * 1e18; // 50 NIL tokens
        proofRewards["training"] = 5 * 1e18; // 5 NIL tokens
        proofRewards["community_service"] = 20 * 1e18; // 20 NIL tokens
    }

    function _calculatePerformanceScore(address athlete) internal view returns (uint256) {
        // This would integrate with sports data providers
        // For now, return a basic calculation based on verified metrics
        // Implementation would check multiple performance metrics
        return 600; // Placeholder
    }

    function _calculateEngagementScore(address athlete) internal view returns (uint256) {
        EngagementMetrics memory metrics = engagementMetrics[athlete];
        
        if (metrics.lastUpdated == 0) return 500; // Default score
        
        // Calculate score based on engagement metrics
        uint256 score = 500; // Base score
        
        // Adjust based on positive sentiment
        if (metrics.positivesentiment > 70) score += 100;
        else if (metrics.positivesentiment > 50) score += 50;
        
        // Adjust based on growth
        if (metrics.followerGrowth > 1000) score += 100;
        else if (metrics.followerGrowth > 100) score += 50;
        
        return score > 1000 ? 1000 : score;
    }

    function _calculateReliabilityScore(address athlete) internal view returns (uint256) {
        ReputationProfile memory profile = reputationProfiles[athlete];
        
        // Base reliability on completed deals and satisfaction
        if (profile.totalDealsCompleted == 0) return 500; // Default for new athletes
        
        uint256 score = (profile.avgDealSatisfaction * 10); // Convert 0-100 to 0-1000
        return score > 1000 ? 1000 : score;
    }

    function _calculateCommunityScore(address athlete) internal view returns (uint256) {
        // This would iterate through community validations
        // For now, return default score
        return 500; // Placeholder
    }

    function _calculateValidatorWeight(address validator) internal view returns (uint256) {
        uint256 reputation = validatorReputations[validator];
        
        if (reputation > 800) return 10; // High weight
        if (reputation > 600) return 5;  // Medium weight
        if (reputation > 400) return 3;  // Low weight
        return 1; // Minimum weight
    }

    function _checkReputationRequirements(
        address athlete,
        uint256 minReputation
    ) internal view returns (bool) {
        ReputationProfile memory profile = reputationProfiles[athlete];
        
        return profile.overallScore >= minReputation;
    }

    function _createEnhancedDeal(
        address brand,
        uint256 amount,
        string memory deliverables,
        string memory termsIPFS,
        uint256[] memory revenueSplits,
        address[] memory beneficiaries,
        string memory athleteJurisdiction,
        string memory brandJurisdiction
    ) internal returns (bytes32 dealId) {
        // Create the deal using parent contract method
        dealId = this.createNILDeal(brand, amount, deliverables, termsIPFS, revenueSplits, beneficiaries);
        
        // Enhanced multi-jurisdiction compliance check
        bool approved = complianceContract.checkMultiJurisdictionCompliance(
            dealId,
            address(this),
            brand,
            amount,
            athleteJurisdiction,
            brandJurisdiction
        );
        
        require(approved, "Multi-jurisdiction compliance check failed");
        
        return dealId;
    }

    function _processProofReward(bytes32 proofId, string memory proofType) internal {
        uint256 rewardAmount = proofRewards[proofType];
        
        if (rewardAmount > 0) {
            ProofOfWork storage proof = proofsOfWork[proofId];
            proof.rewardAmount = rewardAmount;
            
            // Note: Actual token transfer would be implemented here
            // This would integrate with the NIL token contract
        }
    }
}