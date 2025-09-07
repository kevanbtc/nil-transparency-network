// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NILVault
 * @notice ERC-6551 Token Bound Account implementation for NIL athlete management
 * @dev Extends the .nil PoW Ladder Protocol with compliance and transparency features
 */
contract NILVault is 
    IERC721Receiver, 
    IERC1155Receiver, 
    IERC1271,
    ERC165,
    ReentrancyGuard,
    Ownable
{
    // Events
    event NILDealCreated(
        bytes32 indexed dealId,
        address indexed athlete,
        address indexed brand,
        uint256 amount,
        string deliverables
    );
    
    event NILDealExecuted(
        bytes32 indexed dealId,
        uint256 amount,
        address[] beneficiaries,
        uint256[] splits
    );
    
    event ComplianceApproval(
        bytes32 indexed dealId,
        address indexed approver,
        bool approved,
        string reason
    );
    
    event ISO20022Payment(
        bytes32 indexed dealId,
        uint256 amount,
        address indexed from,
        address indexed to,
        string messageType
    );

    // Structs
    struct NILDeal {
        bytes32 dealId;
        address athlete;
        address brand;
        uint256 amount;
        string deliverables;
        string termsIPFS;
        uint256[] revenueSplits; // [athlete%, school%, collective%, platform%]
        address[] beneficiaries;
        bool complianceApproved;
        bool executed;
        uint256 createdAt;
        uint256 executedAt;
    }

    struct AthleteProfile {
        string name;
        string sport;
        string school;
        string eligibilityStatus; // "active", "inactive", "graduated"
        bytes32 kycHash;
        bool verified;
        uint256 totalEarnings;
        uint256 activeDeals;
    }

    struct ComplianceRecord {
        address checker;
        bool approved;
        string reason;
        uint256 timestamp;
        bytes32 documentHash;
    }

    // State variables
    address public nilProtocol; // Reference to existing .nil protocol
    address public complianceRegistry;
    address public revenueDistributor;
    
    AthleteProfile public athleteProfile;
    
    mapping(bytes32 => NILDeal) public deals;
    mapping(bytes32 => ComplianceRecord) public complianceRecords;
    mapping(address => bool) public authorizedPlatforms; // Opendorse, INFLCR, etc.
    
    uint256 public dealCounter;
    bytes32[] public dealHistory;

    // Modifiers
    modifier onlyAuthorizedPlatform() {
        require(authorizedPlatforms[msg.sender] || msg.sender == owner(), "Unauthorized platform");
        _;
    }

    modifier onlyComplianceApproved(bytes32 dealId) {
        require(complianceRecords[dealId].approved, "Deal not compliance approved");
        _;
    }

    /**
     * @notice Initialize NIL vault for an athlete
     * @param _athlete Athlete's address
     * @param _nilProtocol Address of the existing .nil protocol
     * @param _complianceRegistry Address of compliance registry
     */
    constructor(
        address _athlete,
        address _nilProtocol,
        address _complianceRegistry
    ) {
        _transferOwnership(_athlete);
        nilProtocol = _nilProtocol;
        complianceRegistry = _complianceRegistry;
        dealCounter = 0;
    }

    /**
     * @notice Set up athlete profile
     * @param _name Athlete's name
     * @param _sport Sport played
     * @param _school School attended
     * @param _kycHash Hash of KYC documents
     */
    function setupAthleteProfile(
        string memory _name,
        string memory _sport,
        string memory _school,
        bytes32 _kycHash
    ) external onlyOwner {
        athleteProfile = AthleteProfile({
            name: _name,
            sport: _sport,
            school: _school,
            eligibilityStatus: "active",
            kycHash: _kycHash,
            verified: false,
            totalEarnings: 0,
            activeDeals: 0
        });
    }

    /**
     * @notice Create a new NIL deal
     * @param brand Brand/sponsor address
     * @param amount Deal amount in wei
     * @param deliverables Description of deliverables
     * @param termsIPFS IPFS hash of full contract terms
     * @param revenueSplits Array of revenue split percentages
     * @param beneficiaries Array of beneficiary addresses
     */
    function createNILDeal(
        address brand,
        uint256 amount,
        string memory deliverables,
        string memory termsIPFS,
        uint256[] memory revenueSplits,
        address[] memory beneficiaries
    ) external onlyAuthorizedPlatform returns (bytes32 dealId) {
        require(brand != address(0), "Invalid brand address");
        require(amount > 0, "Deal amount must be positive");
        require(beneficiaries.length == revenueSplits.length, "Mismatched arrays");
        require(_validateSplits(revenueSplits), "Invalid revenue splits");

        dealId = keccak256(abi.encodePacked(
            owner(),
            brand,
            amount,
            block.timestamp,
            dealCounter++
        ));

        deals[dealId] = NILDeal({
            dealId: dealId,
            athlete: owner(),
            brand: brand,
            amount: amount,
            deliverables: deliverables,
            termsIPFS: termsIPFS,
            revenueSplits: revenueSplits,
            beneficiaries: beneficiaries,
            complianceApproved: false,
            executed: false,
            createdAt: block.timestamp,
            executedAt: 0
        });

        dealHistory.push(dealId);
        athleteProfile.activeDeals++;

        emit NILDealCreated(dealId, owner(), brand, amount, deliverables);
        
        // Auto-submit for compliance review
        _submitForCompliance(dealId);
    }

    /**
     * @notice Execute a compliance-approved NIL deal
     * @param dealId ID of the deal to execute
     */
    function executeNILDeal(bytes32 dealId) 
        external 
        nonReentrant 
        onlyComplianceApproved(dealId) 
    {
        NILDeal storage deal = deals[dealId];
        require(!deal.executed, "Deal already executed");
        require(deal.athlete == owner(), "Unauthorized athlete");

        deal.executed = true;
        deal.executedAt = block.timestamp;

        // Execute revenue distribution
        _distributeFunds(deal.amount, deal.revenueSplits, deal.beneficiaries);

        // Update athlete profile
        athleteProfile.totalEarnings += deal.amount;
        athleteProfile.activeDeals--;

        // Emit ISO 20022 compliance event
        emit ISO20022Payment(
            dealId,
            deal.amount,
            deal.brand,
            deal.athlete,
            "pacs.008.001.08" // CustomerCreditTransfer
        );

        emit NILDealExecuted(dealId, deal.amount, deal.beneficiaries, deal.revenueSplits);
    }

    /**
     * @notice Approve deal for compliance (called by compliance registry)
     * @param dealId ID of the deal
     * @param approved Whether the deal is approved
     * @param reason Reason for approval/rejection
     */
    function approveCompliance(
        bytes32 dealId,
        bool approved,
        string memory reason,
        bytes32 documentHash
    ) external {
        require(msg.sender == complianceRegistry, "Only compliance registry");
        
        complianceRecords[dealId] = ComplianceRecord({
            checker: msg.sender,
            approved: approved,
            reason: reason,
            timestamp: block.timestamp,
            documentHash: documentHash
        });

        emit ComplianceApproval(dealId, msg.sender, approved, reason);
    }

    /**
     * @notice Add authorized platform (Opendorse, INFLCR, etc.)
     * @param platform Address of the platform
     */
    function addAuthorizedPlatform(address platform) external onlyOwner {
        authorizedPlatforms[platform] = true;
    }

    /**
     * @notice Remove authorized platform
     * @param platform Address of the platform
     */
    function removeAuthorizedPlatform(address platform) external onlyOwner {
        authorizedPlatforms[platform] = false;
    }

    /**
     * @notice Get deal details
     * @param dealId ID of the deal
     */
    function getDeal(bytes32 dealId) external view returns (NILDeal memory) {
        return deals[dealId];
    }

    /**
     * @notice Get all deal IDs for this athlete
     */
    function getAllDeals() external view returns (bytes32[] memory) {
        return dealHistory;
    }

    /**
     * @notice Get athlete's total earnings
     */
    function getTotalEarnings() external view returns (uint256) {
        return athleteProfile.totalEarnings;
    }

    /**
     * @notice Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Internal functions
    function _distributeFunds(
        uint256 amount,
        uint256[] memory splits,
        address[] memory beneficiaries
    ) internal {
        require(address(this).balance >= amount, "Insufficient balance");
        
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            uint256 share = (amount * splits[i]) / 10000; // Basis points
            if (share > 0) {
                payable(beneficiaries[i]).transfer(share);
            }
        }
    }

    function _validateSplits(uint256[] memory splits) internal pure returns (bool) {
        uint256 total = 0;
        for (uint256 i = 0; i < splits.length; i++) {
            total += splits[i];
        }
        return total <= 10000; // 100% in basis points
    }

    function _submitForCompliance(bytes32 dealId) internal {
        // Call compliance registry for automated checks
        (bool success,) = complianceRegistry.call(
            abi.encodeWithSignature("checkDealCompliance(bytes32)", dealId)
        );
        // If automated compliance fails, mark for manual review
        if (!success) {
            complianceRecords[dealId] = ComplianceRecord({
                checker: complianceRegistry,
                approved: false,
                reason: "Pending manual review",
                timestamp: block.timestamp,
                documentHash: bytes32(0)
            });
        }
    }

    // ERC-6551 Token Bound Account functions
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function isValidSignature(
        bytes32 hash,
        bytes calldata signature
    ) external view override returns (bytes4) {
        // Implement signature validation for the athlete owner
        return IERC1271.isValidSignature.selector;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC1271).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // Receive function to accept payments
    receive() external payable {}
}