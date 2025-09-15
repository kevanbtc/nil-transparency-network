// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./MultiCurrencyHandler.sol";

/**
 * @title TransparentFundingFlow
 * @notice Manages transparent booster contributions, fan collective investments, and funding source tracking
 * @dev Creates immutable audit trails for all funding sources and enables fractional investment in athletes
 */
contract TransparentFundingFlow is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    bytes32 public constant BOOSTER_ROLE = keccak256("BOOSTER_ROLE");
    bytes32 public constant FUND_MANAGER_ROLE = keccak256("FUND_MANAGER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // Events
    event FundingSourceRegistered(
        bytes32 indexed sourceId,
        address indexed funder,
        string indexed sourceType,
        uint256 amount,
        string jurisdiction
    );

    event BoosterContributionMade(
        bytes32 indexed contributionId,
        address indexed booster,
        address indexed athleteVault,
        uint256 amount,
        string currency,
        bool tokenized
    );

    event CollectivePoolCreated(
        bytes32 indexed poolId,
        string poolName,
        address indexed tokenAddress,
        uint256 totalValue,
        address[] athletes
    );

    event FractionalInvestmentMade(
        bytes32 indexed investmentId,
        address indexed investor,
        bytes32 indexed poolId,
        uint256 tokenAmount,
        uint256 investment
    );

    event FundingFlowTracked(
        bytes32 indexed transactionId,
        bytes32 indexed sourceId,
        address indexed destination,
        uint256 amount,
        string flowType
    );

    event AuditTrailUpdated(
        bytes32 indexed transactionId,
        bytes32 documentHash,
        string auditType,
        uint256 timestamp
    );

    event RevenueDistributed(
        bytes32 indexed distributionId,
        bytes32 indexed sourcePoolId,
        address[] beneficiaries,
        uint256[] amounts,
        uint256 totalDistributed
    );

    // Structs
    struct FundingSource {
        bytes32 sourceId;
        address funder;
        string sourceType; // "booster", "collective", "brand_sponsor", "fan_investment", "future_earnings"
        string funderName;
        uint256 totalContributed;
        string jurisdiction;
        bool isVerified;
        bool isActive;
        bytes32 complianceHash; // Hash of compliance documents
        uint256 registeredAt;
        string[] fundingCategories; // ["nil_deals", "training", "equipment", "education"]
    }

    struct BoosterContribution {
        bytes32 contributionId;
        address booster;
        address athleteVault;
        uint256 amount;
        string currency;
        bool tokenized; // Whether contribution is tokenized for fractional ownership
        address tokenAddress; // ERC20 token if tokenized
        string purpose; // Purpose of contribution
        uint256 timestamp;
        bytes32 auditTrail;
        bool taxDeductible; // Whether contribution qualifies for tax deduction
    }

    struct CollectivePool {
        bytes32 poolId;
        string poolName;
        address tokenAddress; // Fractionalized ERC20 token
        uint256 totalValue; // Total value of the pool
        uint256 tokenSupply; // Total token supply
        address[] athletes; // Athletes in the collective
        uint256[] athleteAllocations; // Allocation percentages (basis points)
        address fundManager; // Fund manager address
        bool isActive;
        uint256 createdAt;
        string investmentThesis; // Investment strategy description
        uint256 performanceFeePercentage; // Management fee in basis points
        uint256 minInvestment; // Minimum investment amount
    }

    struct FractionalInvestment {
        bytes32 investmentId;
        address investor;
        bytes32 poolId;
        uint256 tokenAmount; // Amount of fractional tokens owned
        uint256 investmentValue; // Original investment value
        uint256 investmentDate;
        string investorType; // "individual", "institution", "family_office"
        bool isAccredited; // Whether investor is accredited
    }

    struct FundingFlow {
        bytes32 transactionId;
        bytes32 sourceId; // Reference to funding source
        address destination; // Where funds went
        uint256 amount;
        string currency;
        string flowType; // "contribution", "distribution", "investment", "payout"
        uint256 timestamp;
        bytes32[] auditTrail; // Array of audit document hashes
        bool isReversible; // Whether transaction can be reversed
        string description;
    }

    struct AuditRecord {
        bytes32 transactionId;
        bytes32 documentHash; // IPFS hash of supporting documents
        string auditType; // "source_verification", "compliance_check", "tax_filing"
        address auditor;
        uint256 timestamp;
        bool verified;
        string notes;
    }

    // State variables
    MultiCurrencyHandler public currencyHandler;
    
    mapping(bytes32 => FundingSource) public fundingSources;
    mapping(bytes32 => BoosterContribution) public boosterContributions;
    mapping(bytes32 => CollectivePool) public collectivePools;
    mapping(bytes32 => FractionalInvestment) public fractionalInvestments;
    mapping(bytes32 => FundingFlow) public fundingFlows;
    mapping(bytes32 => AuditRecord[]) public auditRecords;
    
    // Tracking arrays
    bytes32[] public allFundingSources;
    mapping(address => bytes32[]) public funderSources; // funder => sourceIds
    mapping(address => bytes32[]) public athleteFunding; // athlete => sourceIds
    mapping(bytes32 => bytes32[]) public sourceTransactions; // sourceId => transactionIds
    
    Counters.Counter private _sourceIdCounter;
    Counters.Counter private _transactionIdCounter;

    constructor(address _currencyHandler) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FUND_MANAGER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        
        currencyHandler = MultiCurrencyHandler(_currencyHandler);
    }

    /**
     * @notice Register a new funding source
     */
    function registerFundingSource(
        address funder,
        string memory sourceType,
        string memory funderName,
        string memory jurisdiction,
        string[] memory fundingCategories,
        bytes32 complianceHash
    ) external onlyRole(COMPLIANCE_ROLE) returns (bytes32 sourceId) {
        _sourceIdCounter.increment();
        sourceId = keccak256(abi.encodePacked(
            funder,
            sourceType,
            block.timestamp,
            _sourceIdCounter.current()
        ));

        fundingSources[sourceId] = FundingSource({
            sourceId: sourceId,
            funder: funder,
            sourceType: sourceType,
            funderName: funderName,
            totalContributed: 0,
            jurisdiction: jurisdiction,
            isVerified: false, // Requires verification
            isActive: true,
            complianceHash: complianceHash,
            registeredAt: block.timestamp,
            fundingCategories: fundingCategories
        });

        allFundingSources.push(sourceId);
        funderSources[funder].push(sourceId);

        emit FundingSourceRegistered(sourceId, funder, sourceType, 0, jurisdiction);
    }

    /**
     * @notice Make a booster contribution to an athlete
     */
    function makeBoosterContribution(
        bytes32 sourceId,
        address athleteVault,
        uint256 amount,
        string memory currency,
        string memory purpose,
        bool tokenize
    ) external nonReentrant returns (bytes32 contributionId) {
        FundingSource storage source = fundingSources[sourceId];
        require(source.isActive && source.isVerified, "Funding source not active or verified");
        require(msg.sender == source.funder, "Unauthorized contributor");

        _transactionIdCounter.increment();
        contributionId = keccak256(abi.encodePacked(
            sourceId,
            athleteVault,
            amount,
            block.timestamp,
            _transactionIdCounter.current()
        ));

        address tokenAddress = address(0);
        
        // Tokenize contribution if requested
        if (tokenize) {
            tokenAddress = _createContributionToken(contributionId, amount, athleteVault, source.funder);
        }

        boosterContributions[contributionId] = BoosterContribution({
            contributionId: contributionId,
            booster: source.funder,
            athleteVault: athleteVault,
            amount: amount,
            currency: currency,
            tokenized: tokenize,
            tokenAddress: tokenAddress,
            purpose: purpose,
            timestamp: block.timestamp,
            auditTrail: _createAuditTrail(contributionId, "booster_contribution"),
            taxDeductible: _isContributionTaxDeductible(purpose, source.jurisdiction)
        });

        // Update funding source
        source.totalContributed += amount;
        
        // Track funding flow
        _trackFundingFlow(sourceId, athleteVault, amount, currency, "contribution", "Booster contribution");
        
        // Add to athlete funding tracking
        athleteFunding[athleteVault].push(sourceId);

        emit BoosterContributionMade(contributionId, source.funder, athleteVault, amount, currency, tokenize);
    }

    /**
     * @notice Create a collective investment pool
     */
    function createCollectivePool(
        string memory poolName,
        address[] memory athletes,
        uint256[] memory athleteAllocations,
        string memory investmentThesis,
        uint256 performanceFee,
        uint256 minInvestment
    ) external onlyRole(FUND_MANAGER_ROLE) returns (bytes32 poolId, address tokenAddress) {
        require(athletes.length == athleteAllocations.length, "Mismatched arrays");
        require(_validateAllocations(athleteAllocations), "Invalid allocations");

        poolId = keccak256(abi.encodePacked(
            poolName,
            athletes,
            block.timestamp
        ));

        // Create fractional ownership token
        tokenAddress = _createPoolToken(poolId, poolName);

        collectivePools[poolId] = CollectivePool({
            poolId: poolId,
            poolName: poolName,
            tokenAddress: tokenAddress,
            totalValue: 0,
            tokenSupply: 0,
            athletes: athletes,
            athleteAllocations: athleteAllocations,
            fundManager: msg.sender,
            isActive: true,
            createdAt: block.timestamp,
            investmentThesis: investmentThesis,
            performanceFeePercentage: performanceFee,
            minInvestment: minInvestment
        });

        emit CollectivePoolCreated(poolId, poolName, tokenAddress, 0, athletes);
    }

    /**
     * @notice Make fractional investment in collective pool
     */
    function makeFractionalInvestment(
        bytes32 poolId,
        uint256 investmentAmount,
        string memory currency,
        string memory investorType,
        bool isAccredited
    ) external nonReentrant returns (bytes32 investmentId) {
        CollectivePool storage pool = collectivePools[poolId];
        require(pool.isActive, "Pool not active");
        require(investmentAmount >= pool.minInvestment, "Investment below minimum");

        // Convert investment to base currency if needed
        uint256 baseAmount = investmentAmount;
        if (keccak256(bytes(currency)) != keccak256(bytes("USD"))) {
            baseAmount = currencyHandler.calculateConversion(currency, "USD", investmentAmount);
        }

        investmentId = keccak256(abi.encodePacked(
            poolId,
            msg.sender,
            investmentAmount,
            block.timestamp
        ));

        // Calculate token amount (simplified - would use actual pool valuation)
        uint256 tokenAmount = _calculateTokenAmount(poolId, baseAmount);

        fractionalInvestments[investmentId] = FractionalInvestment({
            investmentId: investmentId,
            investor: msg.sender,
            poolId: poolId,
            tokenAmount: tokenAmount,
            investmentValue: baseAmount,
            investmentDate: block.timestamp,
            investorType: investorType,
            isAccredited: isAccredited
        });

        // Update pool
        pool.totalValue += baseAmount;
        pool.tokenSupply += tokenAmount;

        // Mint tokens to investor
        _mintPoolTokens(pool.tokenAddress, msg.sender, tokenAmount);

        // Track funding flow
        bytes32 poolSourceId = keccak256(abi.encodePacked("pool_", poolId));
        _trackFundingFlow(poolSourceId, address(this), baseAmount, currency, "investment", "Collective pool investment");

        emit FractionalInvestmentMade(investmentId, msg.sender, poolId, tokenAmount, baseAmount);
    }

    /**
     * @notice Distribute revenue from collective pool to token holders
     */
    function distributePoolRevenue(
        bytes32 poolId,
        uint256 totalRevenue,
        string memory currency
    ) external onlyRole(FUND_MANAGER_ROLE) returns (bytes32 distributionId) {
        CollectivePool storage pool = collectivePools[poolId];
        require(pool.isActive, "Pool not active");
        require(pool.fundManager == msg.sender, "Unauthorized fund manager");

        distributionId = keccak256(abi.encodePacked(poolId, totalRevenue, block.timestamp));

        // Calculate management fee
        uint256 managementFee = (totalRevenue * pool.performanceFeePercentage) / 10000;
        uint256 distributionAmount = totalRevenue - managementFee;

        // This would distribute to all token holders pro-rata
        // For simplicity, we're just tracking the distribution event
        
        address[] memory beneficiaries = new address[](1);
        beneficiaries[0] = pool.tokenAddress; // Represents all token holders
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = distributionAmount;

        // Track the revenue distribution
        bytes32 poolSourceId = keccak256(abi.encodePacked("pool_", poolId));
        _trackFundingFlow(poolSourceId, pool.tokenAddress, distributionAmount, currency, "distribution", "Revenue distribution to token holders");

        emit RevenueDistributed(distributionId, poolId, beneficiaries, amounts, distributionAmount);
    }

    /**
     * @notice Get complete funding history for an athlete
     */
    function getAthleteFundingHistory(address athleteVault) 
        external 
        view 
        returns (bytes32[] memory sourceIds, uint256[] memory amounts, string[] memory types) 
    {
        bytes32[] memory sources = athleteFunding[athleteVault];
        amounts = new uint256[](sources.length);
        types = new string[](sources.length);
        
        for (uint256 i = 0; i < sources.length; i++) {
            FundingSource memory source = fundingSources[sources[i]];
            amounts[i] = source.totalContributed;
            types[i] = source.sourceType;
        }
        
        return (sources, amounts, types);
    }

    /**
     * @notice Get audit trail for a funding transaction
     */
    function getAuditTrail(bytes32 transactionId) 
        external 
        view 
        returns (AuditRecord[] memory) 
    {
        return auditRecords[transactionId];
    }

    /**
     * @notice Verify funding source compliance
     */
    function verifyFundingSource(bytes32 sourceId) external onlyRole(COMPLIANCE_ROLE) {
        FundingSource storage source = fundingSources[sourceId];
        require(source.sourceId == sourceId, "Source does not exist");
        
        source.isVerified = true;
    }

    // Internal functions
    function _createContributionToken(
        bytes32 contributionId,
        uint256 amount,
        address athleteVault,
        address contributor
    ) internal returns (address tokenAddress) {
        // This would deploy an ERC20 token representing the contribution
        // For now, return a placeholder address
        return address(uint160(uint256(contributionId)));
    }

    function _createPoolToken(bytes32 poolId, string memory poolName) internal returns (address) {
        // This would deploy an ERC20 token for the collective pool
        // For now, return a placeholder address
        return address(uint160(uint256(poolId)));
    }

    function _mintPoolTokens(address tokenAddress, address recipient, uint256 amount) internal {
        // Would call the actual token contract to mint tokens
        // Placeholder implementation
    }

    function _trackFundingFlow(
        bytes32 sourceId,
        address destination,
        uint256 amount,
        string memory currency,
        string memory flowType,
        string memory description
    ) internal {
        _transactionIdCounter.increment();
        bytes32 transactionId = keccak256(abi.encodePacked(
            sourceId,
            destination,
            amount,
            block.timestamp,
            _transactionIdCounter.current()
        ));

        fundingFlows[transactionId] = FundingFlow({
            transactionId: transactionId,
            sourceId: sourceId,
            destination: destination,
            amount: amount,
            currency: currency,
            flowType: flowType,
            timestamp: block.timestamp,
            auditTrail: new bytes32[](0), // Initialize empty
            isReversible: false,
            description: description
        });

        sourceTransactions[sourceId].push(transactionId);

        emit FundingFlowTracked(transactionId, sourceId, destination, amount, flowType);
    }

    function _createAuditTrail(bytes32 transactionId, string memory auditType) internal returns (bytes32) {
        bytes32 documentHash = keccak256(abi.encodePacked(transactionId, auditType, block.timestamp));
        
        auditRecords[transactionId].push(AuditRecord({
            transactionId: transactionId,
            documentHash: documentHash,
            auditType: auditType,
            auditor: msg.sender,
            timestamp: block.timestamp,
            verified: false,
            notes: ""
        }));

        emit AuditTrailUpdated(transactionId, documentHash, auditType, block.timestamp);
        return documentHash;
    }

    function _isContributionTaxDeductible(string memory purpose, string memory jurisdiction) internal pure returns (bool) {
        // Determine if contribution qualifies for tax deduction based on purpose and jurisdiction
        // This would integrate with tax regulations
        return keccak256(bytes(purpose)) == keccak256(bytes("education")) || 
               keccak256(bytes(purpose)) == keccak256(bytes("charity"));
    }

    function _validateAllocations(uint256[] memory allocations) internal pure returns (bool) {
        uint256 total = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }
        return total == 10000; // 100% in basis points
    }

    function _calculateTokenAmount(bytes32 poolId, uint256 investmentAmount) internal view returns (uint256) {
        CollectivePool memory pool = collectivePools[poolId];
        
        if (pool.totalValue == 0) {
            return investmentAmount; // 1:1 for first investment
        }
        
        // Calculate based on current pool valuation
        return (investmentAmount * pool.tokenSupply) / pool.totalValue;
    }
}