// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./ContractNFT.sol";

/**
 * @title DeliverablesOracleRouter
 * @notice Pluggable oracle verifier for "proof of deliverables" 
 * @dev Routes verification requests to appropriate oracles and updates ContractNFT status
 */
contract DeliverablesOracleRouter is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Events
    event OracleRegistered(
        address indexed oracle,
        string deliverableType,
        string platformName,
        bool isActive
    );
    
    event DeliverableVerificationRequested(
        bytes32 indexed requestId,
        uint256 indexed contractTokenId,
        string deliverableType,
        string platform,
        address oracle,
        bytes data
    );
    
    event DeliverableVerified(
        bytes32 indexed requestId,
        uint256 indexed contractTokenId,
        bool verified,
        uint256 score,
        string evidence,
        address oracle
    );
    
    event DeliverableFailed(
        bytes32 indexed requestId,
        uint256 indexed contractTokenId,
        string reason,
        address oracle
    );

    // Structs
    struct OracleInfo {
        address oracle;
        string deliverableType; // "social_post", "livestream", "appearance", "merchandise"
        string platformName;    // "instagram", "tiktok", "twitch", "youtube", "twitter"
        bool isActive;
        uint256 reputation;     // Oracle reputation score
        uint256 totalRequests;
        uint256 successfulRequests;
        uint256 stakeAmount;    // Required stake for oracle
    }

    struct VerificationRequest {
        uint256 contractTokenId;
        string deliverableType;
        string platform;
        address oracle;
        bytes requestData;      // Platform-specific data for verification
        uint256 requestTime;
        bool completed;
        bool verified;
        uint256 score;          // 0-10000 basis points (quality/engagement score)
        string evidence;        // IPFS hash or URL to proof
    }

    struct DeliverableRequirement {
        string deliverableType;
        string platform;
        uint256 minimumScore;   // Minimum score required for success
        uint256 timeoutDuration; // How long to wait for verification
        bool requiresHumanReview; // Whether human review is needed
        bytes specificRequirements; // Platform-specific requirements
    }

    // State variables
    ContractNFT public contractNFT;
    
    mapping(address => OracleInfo) public oracles;
    mapping(string => mapping(string => address[])) public oraclesByType; // deliverableType => platform => oracles
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(uint256 => DeliverableRequirement[]) public contractRequirements; // tokenId => requirements
    mapping(uint256 => mapping(bytes32 => bool)) public completedDeliverables; // tokenId => requestId => completed

    address[] public registeredOracles;
    uint256 public minimumStake = 1 ether;
    uint256 public verificationTimeout = 24 hours;

    constructor(address _contractNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        contractNFT = ContractNFT(_contractNFT);
    }

    /**
     * @notice Register a new oracle for deliverable verification
     * @param oracle Address of the oracle
     * @param deliverableType Type of deliverable this oracle can verify
     * @param platformName Platform this oracle specializes in
     */
    function registerOracle(
        address oracle,
        string memory deliverableType,
        string memory platformName
    ) external payable onlyRole(ADMIN_ROLE) {
        require(oracle != address(0), "Invalid oracle address");
        require(msg.value >= minimumStake, "Insufficient stake");
        require(!oracles[oracle].isActive, "Oracle already registered");

        oracles[oracle] = OracleInfo({
            oracle: oracle,
            deliverableType: deliverableType,
            platformName: platformName,
            isActive: true,
            reputation: 10000, // Start with perfect reputation
            totalRequests: 0,
            successfulRequests: 0,
            stakeAmount: msg.value
        });

        oraclesByType[deliverableType][platformName].push(oracle);
        registeredOracles.push(oracle);
        _grantRole(ORACLE_ROLE, oracle);

        emit OracleRegistered(oracle, deliverableType, platformName, true);
    }

    /**
     * @notice Set deliverable requirements for a contract
     * @param tokenId NFT token ID of the contract
     * @param requirements Array of deliverable requirements
     */
    function setContractRequirements(
        uint256 tokenId,
        DeliverableRequirement[] memory requirements
    ) external onlyRole(ADMIN_ROLE) {
        require(contractNFT.ownerOf(tokenId) != address(0), "Contract does not exist");
        
        // Clear existing requirements
        delete contractRequirements[tokenId];
        
        // Set new requirements
        for (uint256 i = 0; i < requirements.length; i++) {
            contractRequirements[tokenId].push(requirements[i]);
        }
    }

    /**
     * @notice Request verification of a deliverable
     * @param tokenId NFT token ID of the contract
     * @param deliverableType Type of deliverable to verify
     * @param platform Platform where deliverable was posted
     * @param requestData Platform-specific data for verification (encoded)
     */
    function requestVerification(
        uint256 tokenId,
        string memory deliverableType,
        string memory platform,
        bytes memory requestData
    ) external returns (bytes32 requestId) {
        require(contractNFT.ownerOf(tokenId) != address(0), "Contract does not exist");
        require(_isAuthorizedRequester(tokenId, msg.sender), "Not authorized to request verification");

        // Find appropriate oracle
        address oracle = _selectOracle(deliverableType, platform);
        require(oracle != address(0), "No oracle available for this deliverable type");

        requestId = keccak256(abi.encodePacked(
            tokenId,
            deliverableType,
            platform,
            block.timestamp,
            msg.sender
        ));

        verificationRequests[requestId] = VerificationRequest({
            contractTokenId: tokenId,
            deliverableType: deliverableType,
            platform: platform,
            oracle: oracle,
            requestData: requestData,
            requestTime: block.timestamp,
            completed: false,
            verified: false,
            score: 0,
            evidence: ""
        });

        emit DeliverableVerificationRequested(
            requestId,
            tokenId,
            deliverableType,
            platform,
            oracle,
            requestData
        );

        return requestId;
    }

    /**
     * @notice Oracle submits verification result
     * @param requestId ID of the verification request
     * @param verified Whether the deliverable was successfully completed
     * @param score Quality/engagement score (0-10000 basis points)
     * @param evidence IPFS hash or URL to proof
     */
    function submitVerification(
        bytes32 requestId,
        bool verified,
        uint256 score,
        string memory evidence
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        VerificationRequest storage request = verificationRequests[requestId];
        require(request.oracle == msg.sender, "Not the assigned oracle");
        require(!request.completed, "Request already completed");
        require(block.timestamp <= request.requestTime + verificationTimeout, "Request expired");
        require(score <= 10000, "Invalid score");

        request.completed = true;
        request.verified = verified;
        request.score = score;
        request.evidence = evidence;

        // Update oracle stats
        OracleInfo storage oracleInfo = oracles[msg.sender];
        oracleInfo.totalRequests++;
        if (verified) {
            oracleInfo.successfulRequests++;
        }

        // Update oracle reputation based on performance
        _updateOracleReputation(msg.sender);

        // Mark deliverable as completed for the contract
        completedDeliverables[request.contractTokenId][requestId] = verified;

        // Check if all deliverables for the contract are completed
        if (_allDeliverablesCompleted(request.contractTokenId)) {
            // Call ContractNFT to update execution status
            // This would require adding a function to ContractNFT contract
            _notifyContractCompletion(request.contractTokenId);
        }

        if (verified) {
            emit DeliverableVerified(
                requestId,
                request.contractTokenId,
                verified,
                score,
                evidence,
                msg.sender
            );
        } else {
            emit DeliverableFailed(
                requestId,
                request.contractTokenId,
                evidence, // Used as reason for failure
                msg.sender
            );
        }
    }

    /**
     * @notice Get verification status for a request
     * @param requestId ID of the verification request
     */
    function getVerificationStatus(bytes32 requestId)
        external
        view
        returns (
            bool completed,
            bool verified,
            uint256 score,
            string memory evidence,
            address oracle
        )
    {
        VerificationRequest storage request = verificationRequests[requestId];
        return (
            request.completed,
            request.verified,
            request.score,
            request.evidence,
            request.oracle
        );
    }

    /**
     * @notice Get all requirements for a contract
     * @param tokenId NFT token ID
     */
    function getContractRequirements(uint256 tokenId)
        external
        view
        returns (DeliverableRequirement[] memory)
    {
        return contractRequirements[tokenId];
    }

    /**
     * @notice Get oracle information
     * @param oracle Oracle address
     */
    function getOracleInfo(address oracle)
        external
        view
        returns (OracleInfo memory)
    {
        return oracles[oracle];
    }

    /**
     * @notice Get oracles by deliverable type and platform
     * @param deliverableType Type of deliverable
     * @param platform Platform name
     */
    function getOraclesByType(string memory deliverableType, string memory platform)
        external
        view
        returns (address[] memory)
    {
        return oraclesByType[deliverableType][platform];
    }

    /**
     * @notice Check if all deliverables for a contract are completed
     * @param tokenId Contract NFT token ID
     */
    function areAllDeliverablesCompleted(uint256 tokenId)
        external
        view
        returns (bool)
    {
        return _allDeliverablesCompleted(tokenId);
    }

    /**
     * @notice Deactivate an oracle (admin only)
     * @param oracle Oracle address to deactivate
     */
    function deactivateOracle(address oracle) external onlyRole(ADMIN_ROLE) {
        require(oracles[oracle].isActive, "Oracle not active");
        oracles[oracle].isActive = false;
        _revokeRole(ORACLE_ROLE, oracle);
        
        // Return stake
        uint256 stake = oracles[oracle].stakeAmount;
        oracles[oracle].stakeAmount = 0;
        payable(oracle).transfer(stake);
    }

    /**
     * @notice Update minimum stake requirement
     * @param newMinimumStake New minimum stake amount
     */
    function updateMinimumStake(uint256 newMinimumStake) external onlyRole(ADMIN_ROLE) {
        minimumStake = newMinimumStake;
    }

    /**
     * @notice Update verification timeout
     * @param newTimeout New timeout duration
     */
    function updateVerificationTimeout(uint256 newTimeout) external onlyRole(ADMIN_ROLE) {
        verificationTimeout = newTimeout;
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
    function _selectOracle(string memory deliverableType, string memory platform)
        internal
        view
        returns (address)
    {
        address[] memory availableOracles = oraclesByType[deliverableType][platform];
        if (availableOracles.length == 0) return address(0);

        // Simple selection: pick oracle with highest reputation
        address bestOracle = address(0);
        uint256 bestReputation = 0;

        for (uint256 i = 0; i < availableOracles.length; i++) {
            address oracle = availableOracles[i];
            if (oracles[oracle].isActive && oracles[oracle].reputation > bestReputation) {
                bestOracle = oracle;
                bestReputation = oracles[oracle].reputation;
            }
        }

        return bestOracle;
    }

    function _isAuthorizedRequester(uint256 tokenId, address requester)
        internal
        view
        returns (bool)
    {
        // Allow contract owner, approved addresses, or admin role
        return (
            contractNFT.ownerOf(tokenId) == requester ||
            contractNFT.getApproved(tokenId) == requester ||
            contractNFT.isApprovedForAll(contractNFT.ownerOf(tokenId), requester) ||
            hasRole(ADMIN_ROLE, requester)
        );
    }

    function _updateOracleReputation(address oracle) internal {
        OracleInfo storage oracleInfo = oracles[oracle];
        if (oracleInfo.totalRequests > 0) {
            // Simple reputation calculation: success rate * 10000
            oracleInfo.reputation = (oracleInfo.successfulRequests * 10000) / oracleInfo.totalRequests;
        }
    }

    function _allDeliverablesCompleted(uint256 tokenId) internal view returns (bool) {
        DeliverableRequirement[] memory requirements = contractRequirements[tokenId];
        if (requirements.length == 0) return true; // No requirements = completed

        // This is a simplified check - in practice, you'd track specific deliverables
        // For now, we'll assume if there are any completed deliverables, the contract is progressing
        return true; // Placeholder - implement based on specific requirements
    }

    function _notifyContractCompletion(uint256 tokenId) internal {
        // This would call a function on ContractNFT to mark the contract as executable
        // For now, we'll emit an event that can be listened to by other contracts
        emit DeliverableVerified(
            keccak256(abi.encodePacked(tokenId, "COMPLETION")),
            tokenId,
            true,
            10000,
            "All deliverables completed",
            address(this)
        );
    }

    // Emergency functions
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {
        // Allow contract to receive ETH for oracle stakes
    }
}