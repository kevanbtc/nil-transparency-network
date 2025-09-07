// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ContractNFT
 * @notice NFT representation of NIL (Name, Image, Likeness) contracts
 * @dev Each NIL deal becomes a tokenized, auditable contract on-chain
 */
contract ContractNFT is ERC721, ERC721URIStorage, ReentrancyGuard, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    Counters.Counter private _tokenIdCounter;

    // Events
    event ContractMinted(
        uint256 indexed tokenId,
        address indexed athleteVault,
        address indexed brand,
        uint256 amount,
        string platformSource
    );

    event ContractExecuted(
        uint256 indexed tokenId,
        uint256 executionTime,
        bytes32 transactionHash
    );

    event ComplianceUpdated(
        uint256 indexed tokenId,
        bool approved,
        string reason,
        address approver
    );

    // Structs
    struct NILContract {
        // Core contract data
        address athleteVault;
        address brand;
        uint256 amount;
        string deliverables;
        
        // Metadata
        string termsIPFS;
        string jurisdiction;
        string platformSource; // "opendorse", "inflcr", "basepath", "direct"
        
        // Financial terms
        uint256[] revenueSplits; // Basis points (10000 = 100%)
        address[] beneficiaries;
        
        // Status tracking
        bool executed;
        bool complianceApproved;
        uint256 createdAt;
        uint256 executedAt;
        
        // Compliance data
        bytes32 complianceHash;
        string complianceNotes;
    }

    struct ContractMetadata {
        string name;
        string description;
        string image;
        string externalUrl;
        string animationUrl;
        mapping(string => string) attributes;
    }

    // State variables
    mapping(uint256 => NILContract) public contracts;
    mapping(uint256 => ContractMetadata) private _metadata;
    mapping(address => uint256[]) public athleteContracts;
    mapping(address => uint256[]) public brandContracts;
    mapping(string => uint256[]) public platformContracts;

    constructor() ERC721("NIL Contract NFT", "NILC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    /**
     * @notice Mint a new NIL contract NFT
     * @param athleteVault Address of athlete's ERC-6551 vault
     * @param brand Address of the sponsoring brand
     * @param amount Contract value in wei
     * @param deliverables Description of what athlete will provide
     * @param termsIPFS IPFS hash of complete contract terms
     * @param jurisdiction Legal jurisdiction for the contract
     * @param platformSource Platform that originated the deal
     * @param revenueSplits Array of revenue percentages (basis points)
     * @param beneficiaries Array of addresses receiving splits
     */
    function mintContract(
        address athleteVault,
        address brand,
        uint256 amount,
        string memory deliverables,
        string memory termsIPFS,
        string memory jurisdiction,
        string memory platformSource,
        uint256[] memory revenueSplits,
        address[] memory beneficiaries
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(athleteVault != address(0), "Invalid athlete vault");
        require(brand != address(0), "Invalid brand address");
        require(amount > 0, "Amount must be positive");
        require(beneficiaries.length == revenueSplits.length, "Mismatched arrays");
        require(_validateSplits(revenueSplits), "Invalid revenue splits");

        tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Create the contract record
        contracts[tokenId] = NILContract({
            athleteVault: athleteVault,
            brand: brand,
            amount: amount,
            deliverables: deliverables,
            termsIPFS: termsIPFS,
            jurisdiction: jurisdiction,
            platformSource: platformSource,
            revenueSplits: revenueSplits,
            beneficiaries: beneficiaries,
            executed: false,
            complianceApproved: false,
            createdAt: block.timestamp,
            executedAt: 0,
            complianceHash: bytes32(0),
            complianceNotes: ""
        });

        // Mint NFT to athlete's vault
        _safeMint(athleteVault, tokenId);

        // Update tracking arrays
        athleteContracts[athleteVault].push(tokenId);
        brandContracts[brand].push(tokenId);
        platformContracts[platformSource].push(tokenId);

        // Set initial metadata
        _setContractMetadata(tokenId, amount, deliverables, platformSource);

        emit ContractMinted(tokenId, athleteVault, brand, amount, platformSource);
    }

    /**
     * @notice Mark contract as executed
     * @param tokenId Token ID of the contract
     * @param transactionHash Hash of the execution transaction
     */
    function executeContract(
        uint256 tokenId,
        bytes32 transactionHash
    ) external {
        require(_exists(tokenId), "Contract does not exist");
        NILContract storage nilContract = contracts[tokenId];
        
        // Only the athlete vault or compliance can execute
        require(
            msg.sender == nilContract.athleteVault || 
            hasRole(COMPLIANCE_ROLE, msg.sender),
            "Unauthorized to execute"
        );
        
        require(!nilContract.executed, "Contract already executed");
        require(nilContract.complianceApproved, "Contract not compliance approved");

        nilContract.executed = true;
        nilContract.executedAt = block.timestamp;

        emit ContractExecuted(tokenId, block.timestamp, transactionHash);
    }

    /**
     * @notice Update compliance status
     * @param tokenId Token ID of the contract
     * @param approved Whether the contract is approved
     * @param reason Reason for approval/rejection
     * @param complianceHash Hash of compliance documentation
     */
    function updateCompliance(
        uint256 tokenId,
        bool approved,
        string memory reason,
        bytes32 complianceHash
    ) external onlyRole(COMPLIANCE_ROLE) {
        require(_exists(tokenId), "Contract does not exist");
        
        NILContract storage nilContract = contracts[tokenId];
        nilContract.complianceApproved = approved;
        nilContract.complianceNotes = reason;
        nilContract.complianceHash = complianceHash;

        emit ComplianceUpdated(tokenId, approved, reason, msg.sender);
    }

    /**
     * @notice Get contract details
     * @param tokenId Token ID of the contract
     */
    function getContract(uint256 tokenId) external view returns (NILContract memory) {
        require(_exists(tokenId), "Contract does not exist");
        return contracts[tokenId];
    }

    /**
     * @notice Get contracts for a specific athlete
     * @param athleteVault Address of the athlete's vault
     */
    function getAthleteContracts(address athleteVault) external view returns (uint256[] memory) {
        return athleteContracts[athleteVault];
    }

    /**
     * @notice Get contracts for a specific brand
     * @param brand Address of the brand
     */
    function getBrandContracts(address brand) external view returns (uint256[] memory) {
        return brandContracts[brand];
    }

    /**
     * @notice Get contracts from a specific platform
     * @param platformSource Name of the platform
     */
    function getPlatformContracts(string memory platformSource) external view returns (uint256[] memory) {
        return platformContracts[platformSource];
    }

    /**
     * @notice Get total contracts count
     */
    function getTotalContracts() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @notice Generate compliance report for a contract
     * @param tokenId Token ID of the contract
     */
    function generateComplianceReport(uint256 tokenId) external view returns (
        bool approved,
        string memory notes,
        bytes32 hash,
        uint256 timestamp
    ) {
        require(_exists(tokenId), "Contract does not exist");
        NILContract memory nilContract = contracts[tokenId];
        
        return (
            nilContract.complianceApproved,
            nilContract.complianceNotes,
            nilContract.complianceHash,
            nilContract.createdAt
        );
    }

    /**
     * @notice Batch mint contracts (for platform integration)
     * @param contractData Array of contract data
     */
    function batchMintContracts(
        BatchMintData[] memory contractData
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        tokenIds = new uint256[](contractData.length);
        
        for (uint256 i = 0; i < contractData.length; i++) {
            BatchMintData memory data = contractData[i];
            tokenIds[i] = mintContract(
                data.athleteVault,
                data.brand,
                data.amount,
                data.deliverables,
                data.termsIPFS,
                data.jurisdiction,
                data.platformSource,
                data.revenueSplits,
                data.beneficiaries
            );
        }
    }

    struct BatchMintData {
        address athleteVault;
        address brand;
        uint256 amount;
        string deliverables;
        string termsIPFS;
        string jurisdiction;
        string platformSource;
        uint256[] revenueSplits;
        address[] beneficiaries;
    }

    // Internal functions
    function _setContractMetadata(
        uint256 tokenId,
        uint256 amount,
        string memory deliverables,
        string memory platformSource
    ) internal {
        ContractMetadata storage metadata = _metadata[tokenId];
        metadata.name = string(abi.encodePacked("NIL Contract #", _toString(tokenId)));
        metadata.description = string(abi.encodePacked(
            "NIL Contract for $",
            _toString(amount / 1e18),
            " - ",
            deliverables
        ));
        metadata.externalUrl = string(abi.encodePacked(
            "https://nil-transparency.network/contract/",
            _toString(tokenId)
        ));
        metadata.attributes["Platform"] = platformSource;
        metadata.attributes["Amount"] = _toString(amount);
        metadata.attributes["Status"] = "Active";
    }

    function _validateSplits(uint256[] memory splits) internal pure returns (bool) {
        uint256 total = 0;
        for (uint256 i = 0; i < splits.length; i++) {
            total += splits[i];
        }
        return total <= 10000; // 100% in basis points
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Override functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        require(_exists(tokenId), "Contract does not exist");
        
        // Generate JSON metadata
        return _generateTokenURI(tokenId);
    }

    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        NILContract memory nilContract = contracts[tokenId];
        ContractMetadata storage metadata = _metadata[tokenId];
        
        return string(abi.encodePacked(
            'data:application/json;base64,',
            _base64Encode(bytes(string(abi.encodePacked(
                '{"name":"', metadata.name, '",',
                '"description":"', metadata.description, '",',
                '"image":"https://nil-transparency.network/nft-image/', _toString(tokenId), '",',
                '"external_url":"', metadata.externalUrl, '",',
                '"attributes":[',
                '{"trait_type":"Platform","value":"', nilContract.platformSource, '"},',
                '{"trait_type":"Amount","value":', _toString(nilContract.amount), '},',
                '{"trait_type":"Status","value":"', nilContract.executed ? 'Executed' : 'Active', '"},',
                '{"trait_type":"Compliance","value":"', nilContract.complianceApproved ? 'Approved' : 'Pending', '"}',
                ']}'
            ))))
        ));
    }

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        // Basic base64 encoding implementation
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        if (data.length == 0) return "";
        
        string memory result = new string(4 * ((data.length + 2) / 3));
        bytes memory resultBytes = bytes(result);
        
        uint256 i = 0;
        uint256 j = 0;
        
        for (; i + 3 <= data.length; i += 3) {
            (resultBytes[j], resultBytes[j + 1], resultBytes[j + 2], resultBytes[j + 3]) = _encode3(
                uint8(data[i]),
                uint8(data[i + 1]),
                uint8(data[i + 2])
            );
            j += 4;
        }
        
        return result;
    }

    function _encode3(uint8 a0, uint8 a1, uint8 a2) internal pure returns (bytes1, bytes1, bytes1, bytes1) {
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        bytes memory tableBytes = bytes(table);
        
        uint32 bitmap = (uint32(a0) << 16) | (uint32(a1) << 8) | a2;
        
        return (
            tableBytes[(bitmap >> 18) & 63],
            tableBytes[(bitmap >> 12) & 63],
            tableBytes[(bitmap >> 6) & 63],
            tableBytes[bitmap & 63]
        );
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}