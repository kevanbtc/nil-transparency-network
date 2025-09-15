// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RevenueSplitter
 * @notice Automated revenue distribution for NIL deals with booster fund management
 * @dev Handles transparent distribution of funds with compliance integration
 */
contract RevenueSplitter is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    bytes32 public constant SPLITTER_ADMIN_ROLE = keccak256("SPLITTER_ADMIN_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant BOOSTER_ROLE = keccak256("BOOSTER_ROLE");

    // Events
    event RevenueDistributed(
        bytes32 indexed dealId,
        uint256 totalAmount,
        address[] beneficiaries,
        uint256[] amounts,
        uint256 timestamp
    );
    
    event BoosterContribution(
        bytes32 indexed contributionId,
        address indexed booster,
        uint256 amount,
        address[] targetAthletes,
        string purpose
    );
    
    event BoosterDistribution(
        bytes32 indexed contributionId,
        address indexed booster,
        address indexed athlete,
        uint256 amount,
        string purpose
    );
    
    event SplitConfigured(
        address indexed athlete,
        uint256[] splits,
        address[] beneficiaries,
        uint256 timestamp
    );
    
    event EmergencyWithdrawal(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        string reason
    );

    // Structs
    struct RevenueSplit {
        address athlete;
        address school;
        address collective;
        address platform;
        address taxAuthority;
        uint256 athletePercent;    // Basis points (10000 = 100%)
        uint256 schoolPercent;
        uint256 collectivePercent;
        uint256 platformPercent;
        uint256 taxPercent;
        bool active;
        uint256 lastUpdated;
    }
    
    struct BoosterContribution {
        bytes32 contributionId;
        address booster;
        uint256 amount;
        address[] targetAthletes;
        uint256[] allocations; // Basis points for each athlete
        string purpose;
        bool complianceApproved;
        bool distributed;
        uint256 timestamp;
        uint256 distributedAt;
    }
    
    struct DistributionRecord {
        bytes32 dealId;
        address athlete;
        uint256 totalAmount;
        uint256 athleteAmount;
        uint256 schoolAmount;
        uint256 collectiveAmount;
        uint256 platformAmount;
        uint256 taxAmount;
        uint256 timestamp;
        bool completed;
    }

    // State variables
    mapping(address => RevenueSplit) public revenueSplits;
    mapping(bytes32 => BoosterContribution) public boosterContributions;
    mapping(bytes32 => DistributionRecord) public distributionRecords;
    mapping(address => uint256) public totalEarnings;
    mapping(address => uint256) public platformFees;
    mapping(address => bool) public authorizedTokens;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public defaultPlatformFee = 250; // 2.5%
    address public treasuryAddress;
    address public complianceRegistry;

    // Modifiers
    modifier onlyComplianceApproved(bytes32 contributionId) {
        require(
            boosterContributions[contributionId].complianceApproved,
            "Contribution not compliance approved"
        );
        _;
    }
    
    modifier validSplits(uint256[] memory splits) {
        uint256 total = 0;
        for (uint256 i = 0; i < splits.length; i++) {
            total += splits[i];
        }
        require(total <= BASIS_POINTS, "Splits exceed 100%");
        _;
    }

    constructor(
        address _treasuryAddress,
        address _complianceRegistry
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SPLITTER_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, _complianceRegistry);
        
        treasuryAddress = _treasuryAddress;
        complianceRegistry = _complianceRegistry;
        
        // Authorize ETH and common stablecoins by default
        authorizedTokens[address(0)] = true; // ETH
    }

    /**
     * @notice Configure revenue split for an athlete
     * @param athlete Athlete's vault address
     * @param school School's wallet address
     * @param collective Collective's wallet address
     * @param platform Platform's wallet address
     * @param taxAuthority Tax authority's address
     * @param splits Array of percentages in basis points [athlete, school, collective, platform, tax]
     */
    function configureRevenueSplit(
        address athlete,
        address school,
        address collective,
        address platform,
        address taxAuthority,
        uint256[] memory splits
    ) external onlyRole(SPLITTER_ADMIN_ROLE) validSplits(splits) {
        require(athlete != address(0), "Invalid athlete address");
        require(splits.length == 5, "Invalid splits array length");
        
        revenueSplits[athlete] = RevenueSplit({
            athlete: athlete,
            school: school,
            collective: collective,
            platform: platform,
            taxAuthority: taxAuthority,
            athletePercent: splits[0],
            schoolPercent: splits[1],
            collectivePercent: splits[2],
            platformPercent: splits[3],
            taxPercent: splits[4],
            active: true,
            lastUpdated: block.timestamp
        });
        
        address[] memory beneficiaries = new address[](5);
        beneficiaries[0] = athlete;
        beneficiaries[1] = school;
        beneficiaries[2] = collective;
        beneficiaries[3] = platform;
        beneficiaries[4] = taxAuthority;
        
        emit SplitConfigured(athlete, splits, beneficiaries, block.timestamp);
    }
    
    /**
     * @notice Distribute revenue for a NIL deal
     * @param dealId Unique deal identifier
     * @param athlete Athlete's vault address
     * @param totalAmount Total amount to distribute
     * @param token Token address (address(0) for ETH)
     */
    function distributeRevenue(
        bytes32 dealId,
        address athlete,
        uint256 totalAmount,
        address token
    ) external nonReentrant whenNotPaused {
        require(authorizedTokens[token], "Token not authorized");
        require(revenueSplits[athlete].active, "No revenue split configured");
        require(totalAmount > 0, "Amount must be positive");
        
        RevenueSplit memory split = revenueSplits[athlete];
        
        // Calculate individual amounts
        uint256 athleteAmount = (totalAmount * split.athletePercent) / BASIS_POINTS;
        uint256 schoolAmount = (totalAmount * split.schoolPercent) / BASIS_POINTS;
        uint256 collectiveAmount = (totalAmount * split.collectivePercent) / BASIS_POINTS;
        uint256 platformAmount = (totalAmount * split.platformPercent) / BASIS_POINTS;
        uint256 taxAmount = (totalAmount * split.taxPercent) / BASIS_POINTS;
        
        // Verify total doesn't exceed input (handle rounding)
        uint256 distributedTotal = athleteAmount + schoolAmount + collectiveAmount + platformAmount + taxAmount;
        require(distributedTotal <= totalAmount, "Distribution exceeds total");
        
        // Handle any remainder due to rounding
        uint256 remainder = totalAmount - distributedTotal;
        if (remainder > 0) {
            athleteAmount += remainder; // Give remainder to athlete
        }
        
        // Perform distributions
        _transferFunds(token, split.athlete, athleteAmount);
        if (schoolAmount > 0 && split.school != address(0)) {
            _transferFunds(token, split.school, schoolAmount);
        }
        if (collectiveAmount > 0 && split.collective != address(0)) {
            _transferFunds(token, split.collective, collectiveAmount);
        }
        if (platformAmount > 0 && split.platform != address(0)) {
            _transferFunds(token, split.platform, platformAmount);
            platformFees[split.platform] += platformAmount;
        }
        if (taxAmount > 0 && split.taxAuthority != address(0)) {
            _transferFunds(token, split.taxAuthority, taxAmount);
        }
        
        // Record distribution
        distributionRecords[dealId] = DistributionRecord({
            dealId: dealId,
            athlete: athlete,
            totalAmount: totalAmount,
            athleteAmount: athleteAmount,
            schoolAmount: schoolAmount,
            collectiveAmount: collectiveAmount,
            platformAmount: platformAmount,
            taxAmount: taxAmount,
            timestamp: block.timestamp,
            completed: true
        });
        
        // Update total earnings
        totalEarnings[athlete] += athleteAmount;
        
        // Prepare event data
        address[] memory beneficiaries = new address[](5);
        uint256[] memory amounts = new uint256[](5);
        
        beneficiaries[0] = split.athlete;
        beneficiaries[1] = split.school;
        beneficiaries[2] = split.collective;
        beneficiaries[3] = split.platform;
        beneficiaries[4] = split.taxAuthority;
        
        amounts[0] = athleteAmount;
        amounts[1] = schoolAmount;
        amounts[2] = collectiveAmount;
        amounts[3] = platformAmount;
        amounts[4] = taxAmount;
        
        emit RevenueDistributed(dealId, totalAmount, beneficiaries, amounts, block.timestamp);
    }
    
    /**
     * @notice Record booster contribution
     * @param booster Booster's address
     * @param amount Contribution amount
     * @param targetAthletes Array of target athlete addresses
     * @param allocations Array of allocation percentages in basis points
     * @param purpose Purpose/description of contribution
     */
    function recordBoosterContribution(
        address booster,
        uint256 amount,
        address[] memory targetAthletes,
        uint256[] memory allocations,
        string memory purpose
    ) external onlyRole(BOOSTER_ROLE) validSplits(allocations) {
        require(booster != address(0), "Invalid booster address");
        require(targetAthletes.length == allocations.length, "Mismatched arrays");
        require(targetAthletes.length > 0, "No target athletes");
        require(amount > 0, "Amount must be positive");
        
        bytes32 contributionId = keccak256(abi.encodePacked(
            booster,
            amount,
            block.timestamp,
            targetAthletes
        ));
        
        boosterContributions[contributionId] = BoosterContribution({
            contributionId: contributionId,
            booster: booster,
            amount: amount,
            targetAthletes: targetAthletes,
            allocations: allocations,
            purpose: purpose,
            complianceApproved: false,
            distributed: false,
            timestamp: block.timestamp,
            distributedAt: 0
        });
        
        emit BoosterContribution(contributionId, booster, amount, targetAthletes, purpose);
        
        // Auto-submit for compliance review
        _submitBoosterContributionForCompliance(contributionId);
    }
    
    /**
     * @notice Distribute booster funds after compliance approval
     * @param contributionId Contribution identifier
     */
    function distributeBoosterFunds(
        bytes32 contributionId
    ) external nonReentrant onlyComplianceApproved(contributionId) {
        BoosterContribution storage contribution = boosterContributions[contributionId];
        require(!contribution.distributed, "Already distributed");
        require(address(this).balance >= contribution.amount, "Insufficient balance");
        
        contribution.distributed = true;
        contribution.distributedAt = block.timestamp;
        
        // Distribute to each target athlete based on allocations
        for (uint256 i = 0; i < contribution.targetAthletes.length; i++) {
            address athlete = contribution.targetAthletes[i];
            uint256 allocation = contribution.allocations[i];
            uint256 athleteAmount = (contribution.amount * allocation) / BASIS_POINTS;
            
            if (athleteAmount > 0) {
                // Create synthetic deal ID for tracking
                bytes32 dealId = keccak256(abi.encodePacked(
                    contributionId,
                    athlete,
                    "booster_distribution"
                ));
                
                // Use standard revenue distribution
                distributeRevenue(dealId, athlete, athleteAmount, address(0));
                
                emit BoosterDistribution(
                    contributionId,
                    contribution.booster,
                    athlete,
                    athleteAmount,
                    contribution.purpose
                );
            }
        }
    }
    
    /**
     * @notice Approve booster contribution for compliance
     * @param contributionId Contribution identifier
     * @param approved Whether approved
     */
    function approveBoosterContribution(
        bytes32 contributionId,
        bool approved
    ) external onlyRole(COMPLIANCE_ROLE) {
        BoosterContribution storage contribution = boosterContributions[contributionId];
        require(contribution.amount > 0, "Contribution not found");
        
        contribution.complianceApproved = approved;
        
        if (approved) {
            // Auto-distribute if approved
            distributeBoosterFunds(contributionId);
        }
    }
    
    /**
     * @notice Add authorized token for revenue distribution
     * @param token Token address
     */
    function addAuthorizedToken(address token) external onlyRole(SPLITTER_ADMIN_ROLE) {
        authorizedTokens[token] = true;
    }
    
    /**
     * @notice Remove authorized token
     * @param token Token address
     */
    function removeAuthorizedToken(address token) external onlyRole(SPLITTER_ADMIN_ROLE) {
        authorizedTokens[token] = false;
    }
    
    /**
     * @notice Update default platform fee
     * @param newFee New fee in basis points
     */
    function updateDefaultPlatformFee(uint256 newFee) external onlyRole(SPLITTER_ADMIN_ROLE) {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        defaultPlatformFee = newFee;
    }
    
    /**
     * @notice Get revenue split configuration for athlete
     * @param athlete Athlete address
     */
    function getRevenueSplit(address athlete) external view returns (RevenueSplit memory) {
        return revenueSplits[athlete];
    }
    
    /**
     * @notice Get booster contribution details
     * @param contributionId Contribution identifier
     */
    function getBoosterContribution(bytes32 contributionId) external view returns (BoosterContribution memory) {
        return boosterContributions[contributionId];
    }
    
    /**
     * @notice Get distribution record
     * @param dealId Deal identifier
     */
    function getDistributionRecord(bytes32 dealId) external view returns (DistributionRecord memory) {
        return distributionRecords[dealId];
    }
    
    /**
     * @notice Get athlete's total earnings
     * @param athlete Athlete address
     */
    function getAthleteEarnings(address athlete) external view returns (uint256) {
        return totalEarnings[athlete];
    }
    
    /**
     * @notice Emergency withdrawal function
     * @param token Token address (address(0) for ETH)
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     * @param reason Reason for withdrawal
     */
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount,
        string memory reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        
        _transferFunds(token, recipient, amount);
        
        emit EmergencyWithdrawal(token, recipient, amount, reason);
    }
    
    // Internal functions
    function _transferFunds(address token, address recipient, uint256 amount) internal {
        if (amount == 0 || recipient == address(0)) return;
        
        if (token == address(0)) {
            // ETH transfer
            require(address(this).balance >= amount, "Insufficient ETH balance");
            payable(recipient).transfer(amount);
        } else {
            // ERC20 transfer
            IERC20(token).safeTransfer(recipient, amount);
        }
    }
    
    function _submitBoosterContributionForCompliance(bytes32 contributionId) internal {
        // Call compliance registry for automated checks
        (bool success,) = complianceRegistry.call(
            abi.encodeWithSignature("checkBoosterCompliance(bytes32)", contributionId)
        );
        
        // If automated compliance fails, mark for manual review
        if (!success) {
            // Manual review required
        }
    }
    
    // Emergency functions
    function pause() external onlyRole(SPLITTER_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(SPLITTER_ADMIN_ROLE) {
        _unpause();
    }
    
    // Receive function to accept ETH deposits
    receive() external payable {
        // Allow contract to receive ETH for distribution
    }
    
    fallback() external payable {
        // Allow contract to receive ETH for distribution
    }
}